/**
 * Notebook Chat Controller
 *
 * Handles AI chat requests and conversation history for a specific notebook.
 *
 * Endpoints:
 *   POST   /api/notebooks/:notebookId/chat
 *     — Receives a question, runs RAG search + Gemini generation (temperature 0.2),
 *       persists both the user message and AI reply to a ChatSession,
 *       and returns the reply + structured citations + sessionId.
 *
 *       Body: { message: string, sessionId?: string }
 *       - If sessionId is omitted or invalid, a new ChatSession is created.
 *
 *   GET    /api/notebooks/:notebookId/chat/history
 *     — Lists all persisted chat sessions for the notebook (with message counts).
 *
 *   GET    /api/notebooks/:notebookId/chat/history/:sessionId
 *     — Retrieves the full ordered message trajectory for a specific session.
 *
 *   DELETE /api/notebooks/:notebookId/chat/history/:sessionId
 *     — Deletes a chat session and all its messages.
 */

import { Request, Response } from 'express';
import { JwtPayload } from '@/lib/jwt';
import { executeNotebookChat } from '@/services/rag.service';
import { NotebookChatHistoryService } from '@/services/notebook-chat-history.service';
import { ChatRole } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

type AuthRequest = Request & { user?: JwtPayload };

const historyService = new NotebookChatHistoryService();

export class NotebookChatController {

  /**
   * POST /api/notebooks/:notebookId/chat
   *
   * Body: { message: string, sessionId?: string }
   *
   * Runs the full RAG pipeline and persists the exchange to a ChatSession.
   *
   * Response: {
   *   status: 'success',
   *   data: { sessionId, reply, citations, notebookId, retrievedChunks }
   * }
   */
  chat = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    const { message, sessionId: incomingSessionId } = req.body as {
      message?: string;
      sessionId?: string;
    };

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

    const trimmedMessage = message.trim();

    try {
      // ── 1. Resolve or create session ────────────────────────────────────
      let sessionId = incomingSessionId ?? null;

      if (sessionId) {
        // Validate that the provided sessionId belongs to this user + notebook
        const existing = await prisma.chatSession.findFirst({
          where: { id: sessionId, userId, notebookId },
          select: { id: true },
        });
        if (!existing) {
          // Invalid sessionId — silently create a new session instead
          sessionId = null;
        }
      }

      if (!sessionId) {
        const newSession = await historyService.createSession(notebookId, userId, trimmedMessage);
        sessionId = newSession.id;
      }

      // ── 2. Persist user message ──────────────────────────────────────────
      await historyService.appendMessage(sessionId, ChatRole.USER, trimmedMessage);

      // ── 3. Execute RAG pipeline ──────────────────────────────────────────
      const result = await executeNotebookChat(notebookId, userId, trimmedMessage);

      // ── 4. Persist AI reply with citations ───────────────────────────────
      await historyService.appendMessage(
        sessionId,
        ChatRole.ASSISTANT,
        result.reply,
        result.citations
      );

      res.status(200).json({
        status: 'success',
        data: {
          sessionId,
          reply: result.reply,
          citations: result.citations,
          notebookId: result.notebookId,
          retrievedChunks: result.retrievedChunks,
        },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';

      if (errMsg.includes('not found') || errMsg.includes('access denied')) {
        res.status(404).json({ status: 'error', message: errMsg });
        return;
      }

      console.error('[NotebookChatController.chat]', err);
      res.status(500).json({ status: 'error', message: errMsg });
    }
  };

  /**
   * GET /api/notebooks/:notebookId/chat/history
   *
   * Lists all persisted chat sessions for the notebook, ordered by most recent.
   *
   * Response: { status: 'success', data: { notebookId, sessions: SessionSummary[] } }
   */
  listHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const { notebookId } = req.params;

    try {
      const sessions = await historyService.listSessions(notebookId as string, userId);
      res.status(200).json({
        status: 'success',
        data: { notebookId, sessions },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('[NotebookChatController.listHistory]', err);
      res.status(500).json({ status: 'error', message: errMsg });
    }
  };

  /**
   * GET /api/notebooks/:notebookId/chat/history/:sessionId
   *
   * Returns the full ordered message trajectory for a specific session.
   *
   * Response: { status: 'success', data: { session, messages: SessionMessage[] } }
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const { sessionId } = req.params;

    try {
      const data = await historyService.getSessionMessages(sessionId as string, userId);
      res.status(200).json({ status: 'success', data });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (errMsg.includes('not found') || errMsg.includes('access denied')) {
        res.status(404).json({ status: 'error', message: errMsg });
        return;
      }
      console.error('[NotebookChatController.getSession]', err);
      res.status(500).json({ status: 'error', message: errMsg });
    }
  };

  /**
   * DELETE /api/notebooks/:notebookId/chat/history/:sessionId
   *
   * Deletes a chat session (and all its messages via cascade).
   *
   * Response: { status: 'success', message: 'Session deleted.' }
   */
  deleteSession = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const { sessionId } = req.params;

    try {
      await historyService.deleteSession(sessionId as string, userId);
      res.status(200).json({ status: 'success', message: 'Session deleted.' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (errMsg.includes('not found') || errMsg.includes('access denied')) {
        res.status(404).json({ status: 'error', message: errMsg });
        return;
      }
      console.error('[NotebookChatController.deleteSession]', err);
      res.status(500).json({ status: 'error', message: errMsg });
    }
  };

  /**
   * @deprecated Use listHistory instead.
   * Kept for backward compatibility — now delegates to listHistory.
   */
  history = this.listHistory;
}
