import express from "express";
import { randomUUID } from "crypto";
import { pool } from "../db/index.js";
import { addAutoFeedEvent } from "./courses.js";

export const quizzesRoutes = express.Router();

function parseJsonField(v: any) {
  if (v == null) return [];
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return []; }
  }
  return v;
}

async function getQuizRow(quizId: string) {
  const [rows]: any = await pool.execute('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  return rows && rows.length ? rows[0] : null;
}

function toQuizObject(row: any) {
  return {
    id: row.id,
    courseUuid: row.course_uuid,
    title: row.title,
    description: row.description || "",
    questions: parseJsonField(row.questions) || [],
    attemptsCount: row.attempts_count || 0,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

// Get all quizzes for a course
quizzesRoutes.get("/course/:courseUuid", async (req, res) => {
  const { courseUuid } = req.params;
  try {
    const [rows]: any = await pool.execute(
      'SELECT * FROM quizzes WHERE course_uuid = ? ORDER BY created_at DESC',
      [courseUuid]
    );
    const quizzes = (rows || []).map((r: any) => toQuizObject(r));
    res.status(200).json(quizzes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get quizzes' });
  }
});

// Create new quiz for a course
quizzesRoutes.post("/course/:courseUuid", async (req, res) => {
  const { courseUuid } = req.params;
  const { title, description, questions } = req.body || {};

  if (!title) return res.status(400).json({ error: "title is required" });
  if (!Array.isArray(questions)) return res.status(400).json({ error: "questions must be an array" });

  const quizId = randomUUID();
  try {
    // Validate questions structure
    const validatedQuestions = questions.map((q: any) => {
      if (!q.id) q.id = randomUUID();
      if (!q.type || !['single', 'multiple'].includes(q.type)) {
        throw new Error("Each question must have type 'single' or 'multiple'");
      }
      if (!q.text) throw new Error("Each question must have text");
      if (!Array.isArray(q.options)) throw new Error("Each question must have options array");
      if (!Array.isArray(q.correctAnswers)) throw new Error("Each question must have correctAnswers array");
      return q;
    });

    await pool.execute(
      'INSERT INTO quizzes (id, course_uuid, title, description, questions) VALUES (?, ?, ?, ?, ?)',
      [quizId, courseUuid, title, description || '', JSON.stringify(validatedQuestions)]
    );

    const row = await getQuizRow(quizId);
    if (!row) {
      throw new Error('Failed to retrieve created quiz');
    }

    // Create auto-generated feed event
    await addAutoFeedEvent(courseUuid, `New quiz: "${title}"`);

    res.status(201).json(toQuizObject(row));
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ error: e.message || 'Failed to create quiz' });
  }
});

// Get quiz details (for lecturers - includes questions and answers)
quizzesRoutes.get("/:quizId/detail", async (req, res) => {
  const { quizId } = req.params;
  try {
    const row = await getQuizRow(quizId);
    if (!row) return res.status(404).json({ message: "Quiz not found" });
    res.status(200).json(toQuizObject(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

// Get quiz for taking (for users - questions without answers)
quizzesRoutes.get("/:quizId/take", async (req, res) => {
  const { quizId } = req.params;
  try {
    const row = await getQuizRow(quizId);
    if (!row) return res.status(404).json({ message: "Quiz not found" });

    const quiz = toQuizObject(row);
    // Remove correctAnswers for user taking the quiz
    quiz.questions = quiz.questions.map((q: any) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options: q.options
    }));

    res.status(200).json(quiz);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

// Update quiz
quizzesRoutes.put("/:quizId", async (req, res) => {
  const { quizId } = req.params;
  const { title, description, questions } = req.body || {};

  try {
    const row = await getQuizRow(quizId);
    if (!row) return res.status(404).json({ message: "Quiz not found" });

    const newTitle = title !== undefined ? title : row.title;
    const newDesc = description !== undefined ? description : row.description;
    let newQuestions = row.questions;

    if (questions !== undefined) {
      if (!Array.isArray(questions)) return res.status(400).json({ error: "questions must be an array" });
      newQuestions = questions.map((q: any) => {
        if (!q.id) q.id = randomUUID();
        return q;
      });
    }

    await pool.execute(
      'UPDATE quizzes SET title = ?, description = ?, questions = ? WHERE id = ?',
      [newTitle, newDesc, JSON.stringify(newQuestions), quizId]
    );

    const updated = await getQuizRow(quizId);
    if (!updated) {
      throw new Error('Failed to retrieve updated quiz');
    }
    res.status(200).json(toQuizObject(updated));
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz
quizzesRoutes.delete("/:quizId", async (req, res) => {
  const { quizId } = req.params;
  try {
    const row = await getQuizRow(quizId);
    if (!row) return res.status(404).json({ message: "Quiz not found" });

    await pool.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Update specific question in quiz
quizzesRoutes.put("/:quizId/questions/:questionId", async (req, res) => {
  const { quizId, questionId } = req.params;
  const { type, text, options, correctAnswers } = req.body || {};

  try {
    const row = await getQuizRow(quizId);
    if (!row) return res.status(404).json({ message: "Quiz not found" });

    const questions = parseJsonField(row.questions) || [];
    const qIndex = questions.findIndex((q: any) => q.id === questionId);
    if (qIndex === -1) return res.status(404).json({ message: "Question not found" });

    // Update question fields
    if (type !== undefined) questions[qIndex].type = type;
    if (text !== undefined) questions[qIndex].text = text;
    if (options !== undefined) questions[qIndex].options = options;
    if (correctAnswers !== undefined) questions[qIndex].correctAnswers = correctAnswers;

    await pool.execute(
      'UPDATE quizzes SET questions = ? WHERE id = ?',
      [JSON.stringify(questions), quizId]
    );

    res.status(200).json(questions[qIndex]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete specific question from quiz
quizzesRoutes.delete("/:quizId/questions/:questionId", async (req, res) => {
  const { quizId, questionId } = req.params;

  try {
    const row = await getQuizRow(quizId);
    if (!row) return res.status(404).json({ message: "Quiz not found" });

    let questions = parseJsonField(row.questions) || [];
    if (!questions.find((q: any) => q.id === questionId)) {
      return res.status(404).json({ message: "Question not found" });
    }

    questions = questions.filter((q: any) => q.id !== questionId);

    await pool.execute(
      'UPDATE quizzes SET questions = ? WHERE id = ?',
      [JSON.stringify(questions), quizId]
    );

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Submit quiz answers and record result
quizzesRoutes.post("/:quizId/submit", async (req, res) => {
  const { quizId } = req.params;
  const { answers } = req.body || {};

  if (!Array.isArray(answers)) return res.status(400).json({ error: "answers must be an array" });

  const resultId = randomUUID();

  try {
    const quizRow = await getQuizRow(quizId);
    if (!quizRow) return res.status(404).json({ message: "Quiz not found" });

    const questions = parseJsonField(quizRow.questions) || [];

    // Calculate score
    let correctCount = 0;
    const answerDetails = answers.map((a: any) => {
      const question = questions.find((q: any) => q.id === a.questionId);
      if (!question) return a;

      const isCorrect = question.type === 'single'
        ? a.selectedOptions[0] === question.correctAnswers[0]
        : JSON.stringify(a.selectedOptions.sort()) === JSON.stringify(question.correctAnswers.sort());

      if (isCorrect) correctCount++;
      return { ...a, isCorrect };
    });

    const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
    const isPassed = score >= 50; // Passing score is 50%

    // Save result
    await pool.execute(
      'INSERT INTO quiz_results (id, quiz_id, answers, score, is_passed) VALUES (?, ?, ?, ?, ?)',
      [resultId, quizId, JSON.stringify(answerDetails), score, isPassed]
    );

    // Increment attempts count
    await pool.execute(
      'UPDATE quizzes SET attempts_count = attempts_count + 1 WHERE id = ?',
      [quizId]
    );

    // Return result with correct answers for review
    const resultWithAnswers = {
      id: resultId,
      quizId: quizId,
      score: score,
      isPassed: isPassed,
      submittedAt: new Date().toISOString(),
      questions: questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswers: q.correctAnswers,
        userAnswer: answerDetails.find((a: any) => a.questionId === q.id)?.selectedOptions || []
      }))
    };

    res.status(201).json(resultWithAnswers);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Get quiz results (for lecturers only)
quizzesRoutes.get("/:quizId/results", async (req, res) => {
  const { quizId } = req.params;

  try {
    const quizRow = await getQuizRow(quizId);
    if (!quizRow) return res.status(404).json({ message: "Quiz not found" });

    const [rows]: any = await pool.execute(
      'SELECT * FROM quiz_results WHERE quiz_id = ? ORDER BY submitted_at DESC',
      [quizId]
    );

    const results = (rows || []).map((r: any) => ({
      id: r.id,
      quizId: r.quiz_id,
      score: r.score,
      isPassed: r.is_passed,
      submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
      // Don't include user email in results for anonymity (can be added if needed)
    }));

    res.status(200).json({
      quizId: quizId,
      totalAttempts: results.length,
      averageScore: results.length > 0 ? (results.reduce((sum: number, r: any) => sum + r.score, 0) / results.length).toFixed(2) : 0,
      results: results
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get quiz results' });
  }
});
