import "dotenv/config";
import { pool } from "./index.js";

export async function initDatabase() {
	try {
		console.log("Initializing database schema...");

		await pool.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id INT AUTO_INCREMENT PRIMARY KEY,
				email VARCHAR(255) NOT NULL,
				name VARCHAR(255) NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`);

		await pool.execute(`
			CREATE TABLE IF NOT EXISTS courses (
				uuid VARCHAR(36) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT,
				materials JSON,
				quizzes JSON,
				feed JSON,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`);

		// Quizzes table - stores quizzes with their questions
		await pool.execute(`
			CREATE TABLE IF NOT EXISTS quizzes (
				id VARCHAR(36) PRIMARY KEY,
				course_uuid VARCHAR(36) NOT NULL,
				title VARCHAR(255) NOT NULL,
				description TEXT,
				questions JSON NOT NULL,
				attempts_count INT DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
			)
		`);

		// Quiz results table - stores results of quiz submissions
		await pool.execute(`
			CREATE TABLE IF NOT EXISTS quiz_results (
				id VARCHAR(36) PRIMARY KEY,
				quiz_id VARCHAR(36) NOT NULL,
				answers JSON NOT NULL,
				score FLOAT NOT NULL,
				is_passed BOOLEAN DEFAULT FALSE,
				submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
				INDEX idx_quiz_id (quiz_id)
			)
		`);

		// Feed posts table - stores course feed posts and auto-generated events
		await pool.execute(`
			CREATE TABLE IF NOT EXISTS course_feed_posts (
				id VARCHAR(36) PRIMARY KEY,
				course_uuid VARCHAR(36) NOT NULL,
				type ENUM('manual', 'system') DEFAULT 'manual',
				message TEXT NOT NULL,
				author_type ENUM('lecturer', 'system') DEFAULT 'lecturer',
				edited BOOLEAN DEFAULT FALSE,
				edited_at TIMESTAMP NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE,
				INDEX idx_course_uuid (course_uuid),
				INDEX idx_created_at (created_at)
			)
		`);

		// Insert a default course used by the web to check DB connectivity if it doesn't exist
		const defaultUuid = '00000000-0000-0000-0000-000000000001';
		const [rows]: any = await pool.execute('SELECT uuid FROM courses WHERE uuid = ?', [defaultUuid]);
		if (!rows || rows.length === 0) {
			// Provide a default link material so the web UI has something to display immediately.
			const defaultMaterials = JSON.stringify([
				{
					uuid: '00000000-0000-0000-0000-000000000001-mat-1',
					type: 'url',
					name: 'Welcome — default course',
					description: 'Test link for the default course inserted at DB init',
					url: 'https://fireroth.is-a.dev/',
					faviconUrl: null,
					createdAt: new Date().toISOString(),
				}
			])
			await pool.execute(
				`INSERT INTO courses (uuid, name, description, materials, quizzes, feed) VALUES (?, ?, ?, ?, ?, ?)`,
				[
					defaultUuid,
					'default-course',
					'Default course inserted by server to verify DB connectivity',
					defaultMaterials,
					JSON.stringify([]),
					JSON.stringify([]),
				]
			);
			console.log('Inserted default course with uuid', defaultUuid);
		} else {
			console.log('Default course already present');
		}

		// Insert a default test quiz if it doesn't exist
		const defaultQuizId = '00000000-0000-0000-0000-000000000002';
		const [quizRows]: any = await pool.execute('SELECT id FROM quizzes WHERE id = ?', [defaultQuizId]);
		if (!quizRows || quizRows.length === 0) {
			const defaultQuestions = JSON.stringify([
				{
					id: '00000000-0000-0000-0000-000000000101',
					type: 'single',
					text: 'What is the capital of France?',
					options: ['Paris', 'London', 'Berlin', 'Madrid'],
					correctAnswers: ['Paris']
				},
				{
					id: '00000000-0000-0000-0000-000000000102',
					type: 'multiple',
					text: 'Which of these are programming languages? (Select all that apply)',
					options: ['Python', 'HTML', 'JavaScript', 'CSS', 'Java'],
					correctAnswers: ['Python', 'JavaScript', 'Java']
				},
				{
					id: '00000000-0000-0000-0000-000000000103',
					type: 'single',
					text: 'What does API stand for?',
					options: ['Application Programming Interface', 'Applied Program Integration', 'Application Process Interface', 'Automated Programming Interface'],
					correctAnswers: ['Application Programming Interface']
				}
			]);
			await pool.execute(
				`INSERT INTO quizzes (id, course_uuid, title, description, questions, attempts_count) VALUES (?, ?, ?, ?, ?, ?)`,
				[
					defaultQuizId,
					defaultUuid,
					'Welcome Quiz',
					'This is a test quiz to explore the platform features.',
					defaultQuestions,
					0
				]
			);
			console.log('Inserted default test quiz with id', defaultQuizId);
		} else {
			console.log('Default test quiz already present');
		}

		console.log("Database schema initialized successfully!");
	} catch (error) {
		console.error("Error initializing database:", error);
	}
}
