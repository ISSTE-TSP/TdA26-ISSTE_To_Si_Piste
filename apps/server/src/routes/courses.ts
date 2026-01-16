import express from "express";
import { randomUUID } from "crypto";
import { pool } from "../db/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

export const coursesRoutes = express.Router();

const feedSubscribers = new Map<string, Set<express.Response>>();

function now() { return new Date().toISOString(); }

// Convert ISO8601 to MySQL DATETIME format (YYYY-MM-DD HH:mm:ss.sss)
function toMySQLDateTime(isoString: string): string {
  return isoString.replace('T', ' ').replace('Z', '');
}

async function getCourseRow(uuid: string) {
  const [rows]: any = await pool.execute('SELECT * FROM courses WHERE uuid = ?', [uuid]);
  return rows && rows.length ? rows[0] : null;
}

function parseJsonField(v: any) {
  if (v == null) return [];
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return []; }
  }
  return v;
}

function toCourseObject(row: any) {
  return {
    uuid: row.uuid,
    name: row.name,
    description: row.description || "",
    materials: (parseJsonField(row.materials) || []).slice().sort((a: any, b: any) => {
      const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }),
    quizzes: (parseJsonField(row.quizzes) || []).slice().sort((a: any, b: any) => {
      const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }),
    feed: parseJsonField(row.feed),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

// Setup uploads directory for materials and favicons
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const materialsDir = path.join(uploadsRoot, 'materials');
const faviconsDir = path.join(uploadsRoot, 'favicons');
fs.mkdirSync(materialsDir, { recursive: true });
fs.mkdirSync(faviconsDir, { recursive: true });

// multer storage for material files
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, materialsDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const name = `${randomUUID()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      '.pdf', '.docx', '.txt',
      '.png', '.jpg', '.jpeg', '.gif',
      '.mp4', '.mp3'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('UNSUPPORTED_FILE_TYPE'));
  }
});

async function tryFetchFavicon(targetUrl: string) {
  try {
    const u = new URL(targetUrl);
    const candidate = `${u.origin}/favicon.ico`;
    const res = await fetch(candidate, { redirect: 'follow' });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buffer = await res.arrayBuffer();
    const ext = ct.split('/')[1].split(';')[0] || 'ico';
    const filename = `${randomUUID()}.${ext.replace(/[^a-z0-9]/gi, '')}`;
    const outPath = path.join(faviconsDir, filename);
    fs.writeFileSync(outPath, Buffer.from(buffer));
    return `/uploads/favicons/${filename}`;
  } catch (e) {
    return null;
  }
}

function removeStoredFile(fileUrl: string | undefined) {
  if (!fileUrl) return;
  try {
    // expected format: /uploads/materials/<filename>
    const parts = fileUrl.split('/uploads/');
    if (parts.length < 2) return;
    const rel = parts[1];
    const full = path.join(uploadsRoot, rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    // ignore deletion errors
  }
}

// List courses
coursesRoutes.get("/", async (_req, res) => {
  try {
    const [rows]: any = await pool.execute('SELECT uuid, name, description, materials, quizzes, feed, created_at, updated_at FROM courses ORDER BY created_at DESC');
    const list = (rows || []).map((r: any) => toCourseObject(r));
    res.status(200).json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

// Create course
coursesRoutes.post("/", async (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const id = randomUUID();
  try {
    await pool.execute(
      `INSERT INTO courses (uuid, name, description, materials, quizzes, feed) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description || '', JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
    );
    // initialize SSE subscribers set
    feedSubscribers.set(id, new Set());
    const row = await getCourseRow(id);
    res.status(201).json(toCourseObject(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get course detail
coursesRoutes.get("/:courseId", async (req, res) => {
  const { courseId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    res.status(200).json(toCourseObject(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Update course (name/description)
coursesRoutes.put("/:courseId", async (req, res) => {
  const { courseId } = req.params;
  const { name, description } = req.body || {};
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const newName = name !== undefined ? name : row.name;
    const newDesc = description !== undefined ? description : row.description;
    await pool.execute('UPDATE courses SET name = ?, description = ? WHERE uuid = ?', [newName, newDesc, courseId]);
    const updated = await getCourseRow(courseId);
    res.status(200).json(toCourseObject(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course
coursesRoutes.delete("/:courseId", async (req, res) => {
  const { courseId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    await pool.execute('DELETE FROM courses WHERE uuid = ?', [courseId]);
    const subs = feedSubscribers.get(courseId);
    if (subs) {
      subs.forEach(r => r.end());
      feedSubscribers.delete(courseId);
    }
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Materials endpoints (CRUD stored within JSON materials array)
coursesRoutes.get("/:courseId/materials", async (req, res) => {
  const { courseId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const mats = parseJsonField(row.materials) || [];
    mats.sort((a: any, b: any) => {
      const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    res.status(200).json(mats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get materials' });
  }
});

// Accept multipart/form-data for file uploads (field name: file) or JSON for URLs
coursesRoutes.post("/:courseId/materials", async (req, res) => {
  const { courseId } = req.params;
  // run multer manually so we can capture errors and still handle JSON requests
  upload.single('file')(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.message === 'UNSUPPORTED_FILE_TYPE') return res.status(400).json({ error: 'Unsupported file type' });
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 30MB)' });
      console.error(err);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    const body = req.body || {};
    if (!body.type || !body.name) return res.status(400).json({ error: "type and name required" });
    try {
      const row = await getCourseRow(courseId);
      if (!row) return res.status(404).json({ message: "Course not found" });
      const materials = parseJsonField(row.materials) || [];
      const id = randomUUID();
      let material: any;

      if (body.type === "url") {
        let faviconUrl = null;
        if (body.url) {
          try { faviconUrl = await tryFetchFavicon(body.url); } catch { faviconUrl = null; }
        }
        material = { uuid: id, type: "url", name: body.name, description: body.description || "", url: body.url || "", faviconUrl };
      } else if (body.type === "file") {
        if (req.file) {
          const file = req.file;
          material = {
            uuid: id,
            type: "file",
            name: body.name,
            description: body.description || "",
            fileUrl: `/uploads/materials/${file.filename}`,
            mimeType: file.mimetype || null,
            sizeBytes: file.size || 0,
          };
        } else if (body.fileUrl) {
          material = {
            uuid: id,
            type: "file",
            name: body.name,
            description: body.description || "",
            fileUrl: body.fileUrl,
            mimeType: body.mimeType || null,
            sizeBytes: body.sizeBytes || 0,
          };
        } else {
          return res.status(400).json({ error: 'file is required for type=file' });
        }
      } else {
        return res.status(400).json({ error: 'invalid type' });
      }

      material.createdAt = new Date().toISOString();
      materials.push(material);
      await pool.execute('UPDATE courses SET materials = ? WHERE uuid = ?', [JSON.stringify(materials), courseId]);
      
      // Create auto-generated feed event
      await addAutoFeedEvent(courseId, `New study material: "${material.name}"`);
      
      res.status(201).json(material);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create material' });
    }
  });
});

coursesRoutes.put("/:courseId/materials/:materialId", async (req, res) => {
  const { courseId, materialId } = req.params;
  // run multer to accept optional file replacement
  upload.single('file')(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.message === 'UNSUPPORTED_FILE_TYPE') return res.status(400).json({ error: 'Unsupported file type' });
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 30MB)' });
      console.error(err);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    const body = req.body || {};
    try {
      const row = await getCourseRow(courseId);
      if (!row) return res.status(404).json({ message: "Course not found" });
      const materials = parseJsonField(row.materials) || [];
      const m = materials.find((x: any) => x.uuid === materialId);
      if (!m) return res.status(404).json({ message: "Material not found" });
      if (body.name !== undefined) m.name = body.name;
      if (body.description !== undefined) m.description = body.description;
      if (body.url !== undefined) m.url = body.url;

      // handle file replacement
      if (req.file) {
        // remove old stored file if present
        try { if (m && m.fileUrl) removeStoredFile(m.fileUrl); } catch {}
        const file = req.file;
        m.fileUrl = `/uploads/materials/${file.filename}`;
        m.mimeType = file.mimetype || null;
        m.sizeBytes = file.size || 0;
      }

      await pool.execute('UPDATE courses SET materials = ? WHERE uuid = ?', [JSON.stringify(materials), courseId]);
      res.status(200).json(m);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update material' });
    }
  });
});

coursesRoutes.delete("/:courseId/materials/:materialId", async (req, res) => {
  const { courseId, materialId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const materials = parseJsonField(row.materials);
    const idx = materials.findIndex((x: any) => x.uuid === materialId);
    if (idx === -1) return res.status(404).json({ message: "Material not found" });
    const [removed] = materials.splice(idx, 1);
    // if it was a stored file, attempt to remove it from disk
    if (removed && removed.type === 'file') {
      try { removeStoredFile(removed.fileUrl); } catch (e) { /* ignore */ }
    }
    await pool.execute('UPDATE courses SET materials = ? WHERE uuid = ?', [JSON.stringify(materials), courseId]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// Quizzes
coursesRoutes.get("/:courseId/quizzes", async (req, res) => {
  const { courseId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    res.status(200).json(parseJsonField(row.quizzes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get quizzes' });
  }
});

coursesRoutes.post("/:courseId/quizzes", async (req, res) => {
  const { courseId } = req.params;
  const body = req.body || {};
  if (!body.title || !Array.isArray(body.questions)) return res.status(400).json({ error: "title and questions required" });
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const quizzes = parseJsonField(row.quizzes);
    const id = randomUUID();
    const quiz = { uuid: id, title: body.title, attemptsCount: 0, createdAt: now(), questions: body.questions.map((q: any) => ({ uuid: randomUUID(), ...q })) };
    quizzes.push(quiz);
    await pool.execute('UPDATE courses SET quizzes = ? WHERE uuid = ?', [JSON.stringify(quizzes), courseId]);
    res.status(201).json(quiz);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

coursesRoutes.get("/:courseId/quizzes/:quizId", async (req, res) => {
  const { courseId, quizId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const quizzes = parseJsonField(row.quizzes);
    const q = quizzes.find((x: any) => x.uuid === quizId);
    if (!q) return res.status(404).json({ message: "Quiz not found" });
    res.status(200).json(q);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

coursesRoutes.put("/:courseId/quizzes/:quizId", async (req, res) => {
  const { courseId, quizId } = req.params;
  const body = req.body || {};
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const quizzes = parseJsonField(row.quizzes);
    const idx = quizzes.findIndex((x: any) => x.uuid === quizId);
    if (idx === -1) return res.status(404).json({ message: "Quiz not found" });
    if (body.title !== undefined) quizzes[idx].title = body.title;
    if (Array.isArray(body.questions)) quizzes[idx].questions = body.questions.map((q: any) => ({ uuid: randomUUID(), ...q }));
    await pool.execute('UPDATE courses SET quizzes = ? WHERE uuid = ?', [JSON.stringify(quizzes), courseId]);
    res.status(200).json(quizzes[idx]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

coursesRoutes.delete("/:courseId/quizzes/:quizId", async (req, res) => {
  const { courseId, quizId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const quizzes = parseJsonField(row.quizzes);
    const idx = quizzes.findIndex((x: any) => x.uuid === quizId);
    if (idx === -1) return res.status(404).json({ message: "Quiz not found" });
    quizzes.splice(idx, 1);
    await pool.execute('UPDATE courses SET quizzes = ? WHERE uuid = ?', [JSON.stringify(quizzes), courseId]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Submit quiz (scoring done in-memory without persisting attempts)
coursesRoutes.post("/:courseId/quizzes/:quizId/submit", async (req, res) => {
  const { courseId, quizId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });
    const quizzes = parseJsonField(row.quizzes);
    const q = quizzes.find((x: any) => x.uuid === quizId);
    if (!q) return res.status(404).json({ message: "Quiz not found" });
    const body = req.body || {};
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const correctPerQuestion: boolean[] = [];
    let score = 0;
    for (const question of q.questions) {
      const ans = answers.find((a: any) => a.uuid === question.uuid) || {};
      let ok = false;
      if (question.type === "singleChoice") {
        ok = (ans.selectedIndex === question.correctIndex);
      } else if (question.type === "multipleChoice") {
        const s = Array.isArray(ans.selectedIndices) ? ans.selectedIndices.slice().sort() : [];
        const cidx = Array.isArray(question.correctIndices) ? question.correctIndices.slice().sort() : [];
        ok = s.length === cidx.length && s.every((v: number, i: number) => v === cidx[i]);
      }
      if (ok) score += 1;
      correctPerQuestion.push(!!ok);
    }
    const response = {
      quizUuid: q.uuid,
      score,
      maxScore: q.questions.length,
      correctPerQuestion,
      submittedAt: now()
    };

    // persist attempt as anonymous but return a token to the user so they can view their own submission later
    const attemptUuid = randomUUID();
    const attemptToken = randomUUID();
    try {
      await pool.execute(
        `INSERT INTO quiz_attempts (uuid, course_uuid, quiz_uuid, attempt_token, score, max_score, correct_per_question, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [attemptUuid, courseId, q.uuid, attemptToken, score, q.questions.length, JSON.stringify(correctPerQuestion), new Date().toISOString()]
      );
    } catch (e) {
      console.error('Failed to persist quiz attempt', e);
    }

    // increment attemptsCount on quiz and persist back to course
    try {
      const idx = quizzes.findIndex((x: any) => x.uuid === quizId);
      if (idx !== -1) {
        quizzes[idx].attemptsCount = (quizzes[idx].attemptsCount || 0) + 1;
        await pool.execute('UPDATE courses SET quizzes = ? WHERE uuid = ?', [JSON.stringify(quizzes), courseId]);
      }
    } catch (e) {
      console.error('Failed to update quiz attemptsCount', e);
    }

    res.status(200).json({ ...response, attemptToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// List attempts for a quiz (teacher view) - anonymous results (no tokens)
coursesRoutes.get("/:courseId/quizzes/:quizId/attempts", async (req, res) => {
  const { courseId, quizId } = req.params;
  try {
    const [rows]: any = await pool.execute(`SELECT uuid, score, max_score, correct_per_question, submitted_at FROM quiz_attempts WHERE course_uuid = ? AND quiz_uuid = ? ORDER BY submitted_at DESC`, [courseId, quizId]);
    const list = (rows || []).map((r: any) => ({ uuid: r.uuid, score: r.score, maxScore: r.max_score, correctPerQuestion: parseJsonField(r.correct_per_question), submittedAt: r.submitted_at }));
    res.status(200).json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list quiz attempts' });
  }
});

// Fetch a single attempt by token (user can retrieve their own result)
coursesRoutes.get("/:courseId/quizzes/:quizId/attempts/token/:token", async (req, res) => {
  const { courseId, quizId, token } = req.params;
  try {
    const [rows]: any = await pool.execute(`SELECT uuid, score, max_score, correct_per_question, submitted_at FROM quiz_attempts WHERE course_uuid = ? AND quiz_uuid = ? AND attempt_token = ?`, [courseId, quizId, token]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Attempt not found' });
    const r = rows[0];
    res.status(200).json({ uuid: r.uuid, score: r.score, maxScore: r.max_score, correctPerQuestion: parseJsonField(r.correct_per_question), submittedAt: r.submitted_at });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
});

// ============ FEED ENDPOINTS ============

// GET /courses/:courseId/feed - Get all feed posts for a course
coursesRoutes.get("/:courseId/feed", async (req, res) => {
  const { courseId } = req.params;
  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });

    const [posts]: any = await pool.execute(
      `SELECT id, course_uuid, type, message, author_type, edited, edited_at, created_at, updated_at 
       FROM course_feed_posts 
       WHERE course_uuid = ? 
       ORDER BY created_at DESC`,
      [courseId]
    );

    const feedPosts = (posts || []).map((p: any) => ({
      id: p.id,
      courseUuid: p.course_uuid,
      type: p.type,
      message: p.message,
      authorType: p.author_type,
      edited: !!p.edited,
      editedAt: p.edited_at ? new Date(p.edited_at).toISOString() : null,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
    }));

    res.status(200).json(feedPosts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get feed posts" });
  }
});

// POST /courses/:courseId/feed - Create new manual feed post (lecturer only)
coursesRoutes.post("/:courseId/feed", async (req, res) => {
  const { courseId } = req.params;
  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  const postId = randomUUID();
  const currentTime = now();

  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });

    await pool.execute(
      `INSERT INTO course_feed_posts 
       (id, course_uuid, type, message, author_type, edited, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [postId, courseId, "manual", message, "lecturer", false, toMySQLDateTime(currentTime), toMySQLDateTime(currentTime)]
    );

    const [rows]: any = await pool.execute(
      "SELECT * FROM course_feed_posts WHERE id = ?",
      [postId]
    );

    const p = rows[0];
    const post = {
      id: p.id,
      courseUuid: p.course_uuid,
      type: p.type,
      message: p.message,
      authorType: p.author_type,
      edited: !!p.edited,
      editedAt: p.edited_at ? new Date(p.edited_at).toISOString() : null,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
    };

    broadcastFeedEvent(courseId, "new_post", post);
    res.status(201).json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create feed post" });
  }
});

// PUT /courses/:courseId/feed/:postId - Edit a feed post
coursesRoutes.put("/:courseId/feed/:postId", async (req, res) => {
  const { courseId, postId } = req.params;
  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const [postRows]: any = await pool.execute(
      "SELECT * FROM course_feed_posts WHERE id = ? AND course_uuid = ?",
      [postId, courseId]
    );

    if (!postRows || postRows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    const currentTime = now();
    await pool.execute(
      `UPDATE course_feed_posts 
       SET message = ?, edited = ?, edited_at = ?, updated_at = ? 
       WHERE id = ? AND course_uuid = ?`,
      [message, true, currentTime, currentTime, postId, courseId]
    );

    const [updatedRows]: any = await pool.execute(
      "SELECT * FROM course_feed_posts WHERE id = ?",
      [postId]
    );

    const p = updatedRows[0];
    const post = {
      id: p.id,
      courseUuid: p.course_uuid,
      type: p.type,
      message: p.message,
      authorType: p.author_type,
      edited: !!p.edited,
      editedAt: p.edited_at ? new Date(p.edited_at).toISOString() : null,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
    };

    broadcastFeedEvent(courseId, "updated_post", post);
    res.status(200).json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update feed post" });
  }
});

// DELETE /courses/:courseId/feed/:postId - Delete a feed post
coursesRoutes.delete("/:courseId/feed/:postId", async (req, res) => {
  const { courseId, postId } = req.params;

  try {
    const [postRows]: any = await pool.execute(
      "SELECT id FROM course_feed_posts WHERE id = ? AND course_uuid = ?",
      [postId, courseId]
    );

    if (!postRows || postRows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    await pool.execute(
      "DELETE FROM course_feed_posts WHERE id = ? AND course_uuid = ?",
      [postId, courseId]
    );

    const subs = feedSubscribers.get(courseId);
    if (subs) {
      const payload = JSON.stringify({ id: postId });
      subs.forEach((r) => {
        try {
          r.write("event: deleted_post\n");
          r.write(`data: ${payload}\n\n`);
        } catch (e) {
          // ignore
        }
      });
    }

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete feed post" });
  }
});

// GET /courses/:courseId/feed/stream - SSE endpoint for real-time updates
coursesRoutes.get("/:courseId/feed/stream", async (req, res) => {
  const { courseId } = req.params;

  try {
    const row = await getCourseRow(courseId);
    if (!row) return res.status(404).json({ message: "Course not found" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.write(`: SSE stream connected\n\n`);

    const subs = feedSubscribers.get(courseId) || new Set();
    subs.add(res);
    feedSubscribers.set(courseId, subs);

    req.on("close", () => {
      subs.delete(res);
      console.log(`SSE client disconnected from course ${courseId}`);
    });

    res.on("error", () => {
      subs.delete(res);
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

// Helper function to broadcast feed events
function broadcastFeedEvent(courseId: string, event: string, data: any) {
  const subs = feedSubscribers.get(courseId);
  if (!subs) return;

  const payload = JSON.stringify(data);
  const deadSubs = new Set<express.Response>();

  subs.forEach((r) => {
    try {
      r.write(`event: ${event}\n`);
      r.write(`data: ${payload}\n\n`);
    } catch (e) {
      deadSubs.add(r);
    }
  });

  deadSubs.forEach((r) => subs.delete(r));
}

// Helper function to create auto-generated events
export async function addAutoFeedEvent(
  courseUuid: string,
  message: string
): Promise<void> {
  const postId = randomUUID();
  const currentTime = now();

  try {
    await pool.execute(
      `INSERT INTO course_feed_posts 
       (id, course_uuid, type, message, author_type, edited, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      // 'type' column enum in the DB is ('manual','system') - use 'system' for auto-generated events
      [postId, courseUuid, "system", message, "system", false, toMySQLDateTime(currentTime), toMySQLDateTime(currentTime)]
    );

    const [rows]: any = await pool.execute(
      "SELECT * FROM course_feed_posts WHERE id = ?",
      [postId]
    );

    if (rows && rows.length > 0) {
      const p = rows[0];
      const post = {
        id: p.id,
        courseUuid: p.course_uuid,
        type: p.type,
        message: p.message,
        authorType: p.author_type,
        edited: !!p.edited,
        editedAt: p.edited_at ? new Date(p.edited_at).toISOString() : null,
        createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
        updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
      };
      broadcastFeedEvent(courseUuid, "new_post", post);
    }
  } catch (e) {
    console.error("Failed to create auto feed event:", e);
  }
}
