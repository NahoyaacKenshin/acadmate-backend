/**
 * Notebook Chat Controller
 *
 * Handles AI chat requests for a specific notebook using the RAG pipeline.
 *
 * Endpoints:
 *   POST /api/notebooks/:notebookId/chat
 *     — Receives a question, runs RAG search + Gemini generation,
 *       returns an AI reply with source citations.
 *
 *   GET  /api/notebooks/:notebookId/chat/history
 *     — Placeholder endpoint for future chat session persistence (Week 7).
 */

import { Request, Response } from 'express';
import { JwtPayload } from '@/lib/jwt';
import { executeNotebookChat } from '@/services/rag.service';

type AuthRequest = Request & { user?: JwtPayload };

export class NotebookChatController {

  /**
   * POST /api/notebooks/:notebookId/chat
   *
   * Body: { message: string }
   * Response: { status: 'success', data: { reply, citations, notebookId, retrievedChunks } }
   */
  chat = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    const { message } = req.body as { message?: string };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'A non-empty "message" field is required.',
      });
      return;
    }

    if (message.trim().length > 2000) {
      res.status(400).json({
        status: 'error',
        message: 'Message is too long (maximum 2000 characters).',
      });
      return;
    }

    try {
      const result = await executeNotebookChat(notebookId, userId, message.trim());
      res.status(200).json({ status: 'success', data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';

      // Notebook not found / access denied → 404
      if (message.includes('not found') || message.includes('access denied')) {
        res.status(404).json({ status: 'error', message });
        return;
      }

      console.error('[NotebookChatController.chat]', err);
      res.status(500).json({ status: 'error', message });
    }
  };

  /**
   * GET /api/notebooks/:notebookId/chat/history
   *
   * Stub endpoint for Week 7 chat session persistence.
   * Currently returns an empty history array.
   */
  history = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const { notebookId } = req.params;

    // TODO (Week 7): Persist chat messages to a ChatMessage model and fetch them here.
    console.log(`[NotebookChatController.history] User ${userId} fetching history for notebook ${notebookId}`);

    res.status(200).json({
      status: 'success',
      data: {
        notebookId,
        messages: [],
        note: 'Chat history persistence is coming in Week 7.',
      },
    });
  };
}
