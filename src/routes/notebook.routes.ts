/**
 * Notebook Routes
 *
 * All routes require a valid JWT (AuthMiddleware).
 *
 * GET    /api/notebooks                                    — list all user notebooks
 * POST   /api/notebooks                                    — create a notebook
 * GET    /api/notebooks/:id                                — get notebook + sources
 * DELETE /api/notebooks/:id                                — delete notebook
 * POST   /api/notebooks/:notebookId/sources                — upload a source file (multer)
 * DELETE /api/notebooks/:notebookId/sources/:sourceId      — delete a source
 * POST   /api/notebooks/:notebookId/chat                   — RAG chat (Week 6)
 * GET    /api/notebooks/:notebookId/chat/history           — chat history stub (Week 7)
 */

import { Router } from 'express';
import multer from 'multer';
import { AuthMiddleware } from '@/middlewares/auth-middleware';
import { NotebookController } from '@/controllers/notebook.controller';
import { NotebookChatController } from '@/controllers/notebook-chat.controller';

const router = Router();
const auth = new AuthMiddleware();
const controller = new NotebookController();
const chatController = new NotebookChatController();

// Multer — memory storage, max 20MB, accepts any mimetype (validated in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ── Notebook CRUD ─────────────────────────────────────────────────────────────

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

// ── Source File Upload & Delete ───────────────────────────────────────────────

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

// ── RAG Chat (Week 6) ─────────────────────────────────────────────────────────

router.post(
  '/:notebookId/chat',
  auth.execute,
  chatController.chat
);

router.get(
  '/:notebookId/chat/history',
  auth.execute,
  chatController.history
);

export default router;
