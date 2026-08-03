/**
 * Notebook Controller
 *
 * All routes are protected by AuthMiddleware.
 *
 * Notebook endpoints:
 *   GET    /api/notebooks                          — list all notebooks for the current user
 *   POST   /api/notebooks                          — create a new notebook
 *   GET    /api/notebooks/:id                      — get a notebook with its sources
 *   DELETE /api/notebooks/:id                      — delete a notebook and all sources
 *
 * Source endpoints:
 *   POST   /api/notebooks/:notebookId/sources      — upload a file to a notebook
 *   DELETE /api/notebooks/:notebookId/sources/:id  — delete a source
 */

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { uploadSourceFile, deleteSource } from '@/services/notebook.service';
import { JwtPayload } from '@/lib/jwt';

type AuthRequest = Request & { user?: JwtPayload };

export class NotebookController {

  // ── Notebooks ──────────────────────────────────────────────────────────────

  /** GET /api/notebooks */
  listNotebooks = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    try {
      const notebooks = await prisma.notebook.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { sources: true } },
        },
      });
      res.status(200).json({ status: 'success', data: notebooks });
    } catch (err) {
      this.handleError(res, err, 'listNotebooks');
    }
  };

  /** POST /api/notebooks */
  createNotebook = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const { title, description } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ status: 'error', message: 'Title is required.' });
      return;
    }

    try {
      const notebook = await prisma.notebook.create({
        data: {
          title: title.trim(),
          description: description?.trim() ?? null,
          userId,
        },
      });
      res.status(201).json({ status: 'success', data: notebook });
    } catch (err) {
      this.handleError(res, err, 'createNotebook');
    }
  };

  /** GET /api/notebooks/:id */
  getNotebook = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const id = req.params.id as string;
    try {
      const notebook = await prisma.notebook.findFirst({
        where: { id, userId },
        include: {
          sources: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              fileName: true,
              fileType: true,
              status: true,
              errorMsg: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { chunks: true } },
            },
          },
        },
      });

      if (!notebook) {
        res.status(404).json({ status: 'error', message: 'Notebook not found.' });
        return;
      }

      res.status(200).json({ status: 'success', data: notebook });
    } catch (err) {
      this.handleError(res, err, 'getNotebook');
    }
  };

  /** DELETE /api/notebooks/:id */
  deleteNotebook = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const id = req.params.id as string;
    try {
      const existing = await prisma.notebook.findFirst({ where: { id, userId } });
      if (!existing) {
        res.status(404).json({ status: 'error', message: 'Notebook not found.' });
        return;
      }

      // Fetch all sources to remove their storage files
      const sources = await prisma.source.findMany({ where: { notebookId: id } });
      await Promise.all(sources.map((s) => deleteSource(s.id, userId)));

      // Delete notebook (cascades sources/chunks in DB)
      await prisma.notebook.delete({ where: { id } });
      res.status(200).json({ status: 'success', message: 'Notebook deleted.' });
    } catch (err) {
      this.handleError(res, err, 'deleteNotebook');
    }
  };

  // ── Sources ────────────────────────────────────────────────────────────────

  /**
   * POST /api/notebooks/:notebookId/sources
   * Multer attaches the file as `req.file`.
   */
  uploadSource = async (req: Request, res: Response): Promise<void> => {
    const userId       = (req as AuthRequest).user!.sub as string;
    const notebookId   = req.params.notebookId as string;

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
    if (!notebook) {
      res.status(404).json({ status: 'error', message: 'Notebook not found.' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ status: 'error', message: 'No file uploaded.' });
      return;
    }

    const ALLOWED_MIME = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      res.status(415).json({
        status: 'error',
        message: 'Unsupported file type. Allowed: PDF, DOCX, TXT, JPEG, PNG, WEBP, GIF.',
      });
      return;
    }

    try {
      const source = await uploadSourceFile(
        notebookId,
        userId,
        file.originalname,
        file.mimetype,
        file.buffer
      );

      res.status(201).json({
        status: 'success',
        message: 'File uploaded. Processing started in background.',
        data: source,
      });
    } catch (err) {
      this.handleError(res, err, 'uploadSource');
    }
  };

  /** DELETE /api/notebooks/:notebookId/sources/:sourceId */
  deleteSourceHandler = async (req: Request, res: Response): Promise<void> => {
    const userId   = (req as AuthRequest).user!.sub as string;
    const sourceId = req.params.sourceId as string;

    try {
      const result = await deleteSource(sourceId, userId);
      if (!result) {
        res.status(404).json({ status: 'error', message: 'Source not found.' });
        return;
      }
      res.status(200).json({ status: 'success', message: 'Source deleted.' });
    } catch (err) {
      this.handleError(res, err, 'deleteSource');
    }
  };

  // ── Error Helper ───────────────────────────────────────────────────────────

  private handleError(res: Response, err: unknown, context: string): void {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error(`[NotebookController.${context}]`, err);
    res.status(500).json({ status: 'error', message });
  }
}
