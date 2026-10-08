/**
 * Notebook Routes
 *
 * All routes require a valid JWT (AuthMiddleware).
 *
 * GET    /api/notebooks                                         — list all user notebooks
 * POST   /api/notebooks                                         — create a notebook
 * GET    /api/notebooks/:id                                     — get notebook + sources
 * DELETE /api/notebooks/:id                                     — delete notebook
 * POST   /api/notebooks/:notebookId/sources                     — upload a source file (multer)
 * DELETE /api/notebooks/:notebookId/sources/:sourceId           — delete a source
 *
 * ── AI Chat (Week 6) ──────────────────────────────────────────────────────────
 * POST   /api/notebooks/:notebookId/chat                        — RAG chat; persists session + messages
 *
 * ── Conversation History (Week 7) ─────────────────────────────────────────────
 * GET    /api/notebooks/:notebookId/chat/history                — list all chat sessions
 * GET    /api/notebooks/:notebookId/chat/history/:sessionId     — get session messages
 * DELETE /api/notebooks/:notebookId/chat/history/:sessionId     — delete a session
 */

import { Router } from 'express';
import multer from 'multer';
import { AuthMiddleware } from '@/middlewares/auth-middleware';
import { aiLimiter } from '@/middlewares/rate-limiter';
import { NotebookController } from '@/controllers/notebook.controller';
import { NotebookChatController } from '@/controllers/notebook-chat.controller';
import { NotebookToolsController } from '@/controllers/notebook-tools.controller';

const router = Router();
const auth = new AuthMiddleware();
const controller = new NotebookController();
const chatController = new NotebookChatController();
const toolsController = new NotebookToolsController();

// Multer — memory storage, max 20MB, accepts any mimetype (validated in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ── Notebook CRUD ──────────────────────────────────────────────────────────────

router.get(
  '/',
  auth.execute,
  controller.listNotebooks
);

router.post(
  '/',
  auth.execute,
  controller.createNotebook
);

router.get(
  '/:id',
  auth.execute,
  controller.getNotebook
);

router.delete(
  '/:id',
  auth.execute,
  controller.deleteNotebook
);

router.patch(
  '/:id',
  auth.execute,
  controller.updateNotebook
);

// ── Source File Upload & Delete ────────────────────────────────────────────────

router.post(
  '/:notebookId/sources',
  auth.execute,
  upload.single('file'),
  controller.uploadSource
);

router.delete(
  '/:notebookId/sources/:sourceId',
  auth.execute,
  controller.deleteSourceHandler
);

router.post(
  '/:notebookId/sources/:sourceId/retry',
  auth.execute,
  controller.retrySourceHandler
);

router.patch(
  '/:notebookId/sources/:sourceId',
  auth.execute,
  controller.updateSourceHandler
);

// ── RAG Chat (Week 6) ─────────────────────────────────────────────────────────
// NOTE: History sub-routes must be registered BEFORE the bare chat route to
// avoid Express matching /:notebookId/chat/history as a chat message body.

// ── Conversation History (Week 7) ─────────────────────────────────────────────

router.get(
  '/:notebookId/chat/history',
  auth.execute,
  chatController.listHistory
);

router.get(
  '/:notebookId/chat/history/:sessionId',
  auth.execute,
  chatController.getSession
);

router.delete(
  '/:notebookId/chat/history/:sessionId',
  auth.execute,
  chatController.deleteSession
);

// POST chat must come AFTER the history GET routes
router.post(
  '/:notebookId/chat',
  auth.execute,
  aiLimiter,
  chatController.chat
);

// ── Week 8: Flashcard Decks & Cards ───────────────────────────────────────────
router.get(
  '/:notebookId/flashcards',
  auth.execute,
  toolsController.listDecks
);

router.post(
  '/:notebookId/flashcards',
  auth.execute,
  toolsController.createDeck
);

router.post(
  '/:notebookId/flashcards/generate',
  auth.execute,
  aiLimiter,
  toolsController.generateFlashcards
);

router.get(
  '/flashcards/:deckId',
  auth.execute,
  toolsController.getDeck
);

router.patch(
  '/flashcards/:deckId',
  auth.execute,
  toolsController.updateDeck
);

router.delete(
  '/flashcards/:deckId',
  auth.execute,
  toolsController.deleteDeck
);

router.post(
  '/flashcards/:deckId/cards',
  auth.execute,
  toolsController.addCard
);

router.patch(
  '/flashcards/cards/:cardId',
  auth.execute,
  toolsController.updateCard
);

router.delete(
  '/flashcards/cards/:cardId',
  auth.execute,
  toolsController.deleteCard
);

// ── Week 8: Quizzes ───────────────────────────────────────────────────────────
router.get(
  '/:notebookId/quizzes',
  auth.execute,
  toolsController.listQuizzes
);

router.post(
  '/:notebookId/quizzes',
  auth.execute,
  toolsController.createQuiz
);

router.post(
  '/:notebookId/quizzes/generate',
  auth.execute,
  aiLimiter,
  toolsController.generateQuiz
);

router.get(
  '/quizzes/:quizId',
  auth.execute,
  toolsController.getQuiz
);

router.patch(
  '/quizzes/:quizId',
  auth.execute,
  toolsController.updateQuiz
);

router.delete(
  '/quizzes/:quizId',
  auth.execute,
  toolsController.deleteQuiz
);

router.post(
  '/quizzes/:quizId/questions',
  auth.execute,
  toolsController.addQuestion
);

router.patch(
  '/quizzes/questions/:questionId',
  auth.execute,
  toolsController.updateQuestion
);

router.delete(
  '/quizzes/questions/:questionId',
  auth.execute,
  toolsController.deleteQuestion
);

router.post(
  '/quizzes/:quizId/attempt',
  auth.execute,
  toolsController.submitAttempt
);

export default router;
