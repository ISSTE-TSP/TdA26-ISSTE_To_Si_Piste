import express from "express";
import { randomUUID } from "crypto";

export const coursesRoutes = express.Router();

// In-memory stores
const courses = new Map<string, any>();
const feedSubscribers = new Map<string, Set<express.Response>>();

function now() { return new Date().toISOString(); }

// Helpers
function ensureCourseExists(courseId: string) {
  return courses.has(courseId);
}

// List courses
coursesRoutes.get("/", (_req, res) => {
  const list = Array.from(courses.values()).map(c => ({
    uuid: c.uuid,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
  res.status(200).json(list);
});

// Create course
coursesRoutes.post("/", (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const id = randomUUID();
  const course = {
    uuid: id,
    name,
    description: description || "",
    materials: [],
    quizzes: [],
    feed: [],
    createdAt: now(),
    updatedAt: now()
  };
  courses.set(id, course);
  feedSubscribers.set(id, new Set());
  res.status(201).json({ uuid: course.uuid, name: course.name, description: course.description, createdAt: course.createdAt, updatedAt: course.updatedAt });
});

// Get course detail
coursesRoutes.get("/:courseId", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  res.status(200).json(c);
});

// Update course
coursesRoutes.put("/:courseId", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const { name, description } = req.body || {};
  if (name) c.name = name;
  if (description !== undefined) c.description = description;
  c.updatedAt = now();
  res.status(200).json({ uuid: c.uuid, name: c.name, description: c.description, createdAt: c.createdAt, updatedAt: c.updatedAt });
});

// Delete course
coursesRoutes.delete("/:courseId", (req, res) => {
  const { courseId } = req.params;
  if (!courses.has(courseId)) return res.status(404).json({ message: "Course not found" });
  courses.delete(courseId);
  const subs = feedSubscribers.get(courseId);
  if (subs) {
    subs.forEach(r => r.end());
    feedSubscribers.delete(courseId);
  }
  res.status(204).send();
});

// Materials
coursesRoutes.get("/:courseId/materials", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  res.status(200).json(c.materials);
});

// For simplicity support JSON material creation (url) and simple file metadata (no file upload)
coursesRoutes.post("/:courseId/materials", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const body = req.body || {};
  if (!body.type || !body.name) return res.status(400).json({ error: "type and name required" });
  const id = randomUUID();
  let material: any;
  if (body.type === "url") {
    material = { uuid: id, type: "url", name: body.name, description: body.description || "", url: body.url || "", faviconUrl: body.faviconUrl || null };
  } else {
    material = { uuid: id, type: "file", name: body.name, description: body.description || "", fileUrl: body.fileUrl || "", mimeType: body.mimeType || null, sizeBytes: body.sizeBytes || 0 };
  }
  c.materials.push(material);
  c.updatedAt = now();
  res.status(201).json(material);
});

coursesRoutes.put("/:courseId/materials/:materialId", (req, res) => {
  const { courseId, materialId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const m = c.materials.find((x: any) => x.uuid === materialId);
  if (!m) return res.status(404).json({ message: "Material not found" });
  const body = req.body || {};
  if (body.name !== undefined) m.name = body.name;
  if (body.description !== undefined) m.description = body.description;
  if (body.url !== undefined) m.url = body.url;
  if (body.fileUrl !== undefined) m.fileUrl = body.fileUrl;
  c.updatedAt = now();
  res.status(200).json(m);
});

coursesRoutes.delete("/:courseId/materials/:materialId", (req, res) => {
  const { courseId, materialId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const idx = c.materials.findIndex((x: any) => x.uuid === materialId);
  if (idx === -1) return res.status(404).json({ message: "Material not found" });
  c.materials.splice(idx, 1);
  c.updatedAt = now();
  res.status(204).send();
});

// Quizzes
coursesRoutes.get("/:courseId/quizzes", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  res.status(200).json(c.quizzes);
});

coursesRoutes.post("/:courseId/quizzes", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const body = req.body || {};
  if (!body.title || !Array.isArray(body.questions)) return res.status(400).json({ error: "title and questions required" });
  const id = randomUUID();
  const quiz = { uuid: id, title: body.title, attemptsCount: 0, questions: body.questions.map((q: any) => ({ uuid: randomUUID(), ...q })) };
  c.quizzes.push(quiz);
  c.updatedAt = now();
  res.status(201).json(quiz);
});

coursesRoutes.get("/:courseId/quizzes/:quizId", (req, res) => {
  const { courseId, quizId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const q = c.quizzes.find((x: any) => x.uuid === quizId);
  if (!q) return res.status(404).json({ message: "Quiz not found" });
  res.status(200).json(q);
});

coursesRoutes.put("/:courseId/quizzes/:quizId", (req, res) => {
  const { courseId, quizId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const idx = c.quizzes.findIndex((x: any) => x.uuid === quizId);
  if (idx === -1) return res.status(404).json({ message: "Quiz not found" });
  const body = req.body || {};
  if (body.title !== undefined) c.quizzes[idx].title = body.title;
  if (Array.isArray(body.questions)) c.quizzes[idx].questions = body.questions.map((q: any) => ({ uuid: randomUUID(), ...q }));
  c.updatedAt = now();
  res.status(200).json(c.quizzes[idx]);
});

coursesRoutes.delete("/:courseId/quizzes/:quizId", (req, res) => {
  const { courseId, quizId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const idx = c.quizzes.findIndex((x: any) => x.uuid === quizId);
  if (idx === -1) return res.status(404).json({ message: "Quiz not found" });
  c.quizzes.splice(idx, 1);
  c.updatedAt = now();
  res.status(204).send();
});

// Submit quiz
coursesRoutes.post("/:courseId/quizzes/:quizId/submit", (req, res) => {
  const { courseId, quizId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const q = c.quizzes.find((x: any) => x.uuid === quizId);
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
  q.attemptsCount = (q.attemptsCount || 0) + 1;
  const response = {
    quizUuid: q.uuid,
    score,
    maxScore: q.questions.length,
    correctPerQuestion,
    submittedAt: now()
  };
  res.status(200).json(response);
});

// Feed
coursesRoutes.get("/:courseId/feed", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  res.status(200).json(c.feed);
});

function broadcastFeed(courseId: string, event: string, data: any) {
  const subs = feedSubscribers.get(courseId);
  if (!subs) return;
  const payload = JSON.stringify(data);
  subs.forEach(r => {
    try {
      r.write(`event: ${event}\n`);
      r.write(`data: ${payload}\n\n`);
    } catch (e) {
      // ignore
    }
  });
}

coursesRoutes.post("/:courseId/feed", (req, res) => {
  const { courseId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const body = req.body || {};
  if (!body.message) return res.status(400).json({ error: "message required" });
  const id = randomUUID();
  const item = { uuid: id, type: "manual", message: body.message, edited: false, createdAt: now(), updatedAt: now() };
  c.feed.push(item);
  c.updatedAt = now();
  broadcastFeed(courseId, "new_post", item);
  res.status(201).json(item);
});

coursesRoutes.put("/:courseId/feed/:postId", (req, res) => {
  const { courseId, postId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const post = c.feed.find((x: any) => x.uuid === postId);
  if (!post) return res.status(404).json({ message: "Post not found" });
  const body = req.body || {};
  if (body.message !== undefined) post.message = body.message;
  if (body.edited !== undefined) post.edited = !!body.edited;
  post.updatedAt = now();
  c.updatedAt = now();
  broadcastFeed(courseId, "updated_post", post);
  res.status(200).json(post);
});

coursesRoutes.delete("/:courseId/feed/:postId", (req, res) => {
  const { courseId, postId } = req.params;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ message: "Course not found" });
  const idx = c.feed.findIndex((x: any) => x.uuid === postId);
  if (idx === -1) return res.status(404).json({ message: "Post not found" });
  c.feed.splice(idx, 1);
  c.updatedAt = now();
  broadcastFeed(courseId, "deleted_post", { uuid: postId });
  res.status(204).send();
});

// SSE stream
coursesRoutes.get("/:courseId/feed/stream", (req, res) => {
  const { courseId } = req.params;
  if (!courses.has(courseId)) return res.status(404).json({ message: "Course not found" });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`: connected\n\n`);
  const subs = feedSubscribers.get(courseId) || new Set();
  subs.add(res);
  feedSubscribers.set(courseId, subs);
  req.on("close", () => {
    subs.delete(res);
  });
});

// Initialize with a sample course so API is usable immediately
(() => {
  const id = randomUUID();
  const sample = {
    uuid: id,
    name: "test-course",
    description: "Sample course created by server using REST API",
    materials: [],
    quizzes: [],
    feed: [],
    createdAt: now(),
    updatedAt: now()
  };
  courses.set(id, sample);
  feedSubscribers.set(id, new Set());
})();
