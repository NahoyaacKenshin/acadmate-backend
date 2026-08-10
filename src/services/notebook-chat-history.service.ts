/**
 * Notebook Chat History Service
 *
 * Manages persistent AI chat sessions and message history per notebook.
 *
 * Responsibilities:
 *   - Create new ChatSession records (title derived from first user message)
 *   - Append USER and ASSISTANT messages to a session
 *   - List all sessions for a given notebook (with message count + timestamps)
 *   - Retrieve the full message trajectory for a single session
 *   - Delete a session (cascades to all messages)
 */

import { prisma } from '@/lib/prisma';
import { ChatRole } from '@/generated/prisma';
import type { ChatCitation } from '@/services/rag.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations: ChatCitation[] | null;
  createdAt: Date;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class NotebookChatHistoryService {

  /**
   * Creates a new ChatSession for the given notebook.
   * The session title is derived from the first user message (truncated to 80 chars).
   */
  async createSession(
    notebookId: string,
    userId: string,
    initialUserMessage: string
  ): Promise<{ id: string }> {
    const title =
      initialUserMessage.length > 80
        ? `${initialUserMessage.slice(0, 77)}...`
        : initialUserMessage;

    const session = await prisma.chatSession.create({
      data: {
        notebookId,
        userId,
        title,
      },
      select: { id: true },
    });

    return session;
  }

  /**
   * Appends a single message to an existing ChatSession.
   * For USER messages, citations should be null/undefined.
   * For ASSISTANT messages, citations holds the structured citation metadata array.
   */
  async appendMessage(
    sessionId: string,
    role: ChatRole,
    content: string,
    citations?: ChatCitation[]
  ): Promise<void> {
    await prisma.chatMessageHistory.create({
      data: {
        sessionId,
        role,
        content,
        citations: citations ? (citations as object[]) : undefined,
      },
    });
  }

  /**
   * Returns a summary list of all chat sessions for a given notebook,
   * ordered by most recently updated first.
   */
  async listSessions(
    notebookId: string,
    userId: string
  ): Promise<SessionSummary[]> {
    const sessions = await prisma.chatSession.findMany({
      where: { notebookId, userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s._count.messages,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Retrieves the full ordered message trajectory for a specific session.
   * Validates that the session belongs to the requesting user.
   *
   * Throws an error if the session is not found or access is denied.
   */
  async getSessionMessages(
    sessionId: string,
    userId: string
  ): Promise<{ session: { id: string; title: string | null; notebookId: string }; messages: SessionMessage[] }> {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        title: true,
        notebookId: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            citations: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Chat session not found or access denied.');
    }

    return {
      session: { id: session.id, title: session.title, notebookId: session.notebookId },
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ? (m.citations as unknown as ChatCitation[]) : null,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Deletes a chat session (and all its messages via cascade).
   * Validates ownership before deletion.
   *
   * Throws an error if the session is not found or access is denied.
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      throw new Error('Chat session not found or access denied.');
    }

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }
}
