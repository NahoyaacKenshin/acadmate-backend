/**
 * Notebook Tools Controller
 *
 * Handles Flashcard Decks & Practice Quizzes for Notebooks.
 */

import { Request, Response } from 'express';
import { JwtPayload } from '@/lib/jwt';
import * as toolsService from '@/services/notebook-tools.service';

type AuthRequest = Request & { user?: JwtPayload };

export class NotebookToolsController {
  private handleError(res: Response, err: unknown, context: string): void {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error(`[NotebookToolsController.${context}]`, err);
    res.status(500).json({ status: 'error', message });
  }

  // ── Flashcard Decks ─────────────────────────────────────────────────────────

  listDecks = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    try {
      const decks = await toolsService.listFlashcardDecks(notebookId, userId);
      res.status(200).json({ status: 'success', data: decks });
    } catch (err) {
      this.handleError(res, err, 'listDecks');
    }
  };

  getDeck = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const deckId = req.params.deckId as string;
    try {
      const deck = await toolsService.getFlashcardDeck(deckId, userId);
      res.status(200).json({ status: 'success', data: deck });
    } catch (err) {
      this.handleError(res, err, 'getDeck');
    }
  };

  generateFlashcards = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    const { count, title } = req.body;
    try {
      const deck = await toolsService.generateFlashcards(notebookId, userId, {
        count: count ? Number(count) : undefined,
        title,
      });
      res.status(201).json({ status: 'success', data: deck });
    } catch (err) {
      this.handleError(res, err, 'generateFlashcards');
    }
  };

  createDeck = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    const { title, description, cards } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ status: 'error', message: 'Deck title is required.' });
      return;
    }

    try {
      const deck = await toolsService.createFlashcardDeck(notebookId, userId, {
        title,
        description,
        cards,
      });
      res.status(201).json({ status: 'success', data: deck });
    } catch (err) {
      this.handleError(res, err, 'createDeck');
    }
  };

  updateDeck = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const deckId = req.params.deckId as string;
    const { title, description } = req.body;
    try {
      const deck = await toolsService.updateFlashcardDeck(deckId, userId, { title, description });
      res.status(200).json({ status: 'success', data: deck });
    } catch (err) {
      this.handleError(res, err, 'updateDeck');
    }
  };

  deleteDeck = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const deckId = req.params.deckId as string;
    try {
      const result = await toolsService.deleteFlashcardDeck(deckId, userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      this.handleError(res, err, 'deleteDeck');
    }
  };

  // ── Card Operations ─────────────────────────────────────────────────────────

  addCard = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const deckId = req.params.deckId as string;
    const { front, back } = req.body;

    if (!front || !back) {
      res.status(400).json({ status: 'error', message: 'Front and back are required.' });
      return;
    }

    try {
      const card = await toolsService.addCardToDeck(deckId, userId, { front, back });
      res.status(201).json({ status: 'success', data: card });
    } catch (err) {
      this.handleError(res, err, 'addCard');
    }
  };

  updateCard = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const cardId = req.params.cardId as string;
    const { front, back, isMastered } = req.body;

    try {
      const card = await toolsService.updateCard(cardId, userId, { front, back, isMastered });
      res.status(200).json({ status: 'success', data: card });
    } catch (err) {
      this.handleError(res, err, 'updateCard');
    }
  };

  deleteCard = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const cardId = req.params.cardId as string;
    try {
      const result = await toolsService.deleteCard(cardId, userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      this.handleError(res, err, 'deleteCard');
    }
  };

  // ── Quizzes ─────────────────────────────────────────────────────────────────

  listQuizzes = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    try {
      const quizzes = await toolsService.listQuizzes(notebookId, userId);
      res.status(200).json({ status: 'success', data: quizzes });
    } catch (err) {
      this.handleError(res, err, 'listQuizzes');
    }
  };

  getQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const quizId = req.params.quizId as string;
    try {
      const quiz = await toolsService.getQuiz(quizId, userId);
      res.status(200).json({ status: 'success', data: quiz });
    } catch (err) {
      this.handleError(res, err, 'getQuiz');
    }
  };

  generateQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    const { count, title } = req.body;
    try {
      const quiz = await toolsService.generateQuiz(notebookId, userId, {
        count: count ? Number(count) : undefined,
        title,
      });
      res.status(201).json({ status: 'success', data: quiz });
    } catch (err) {
      this.handleError(res, err, 'generateQuiz');
    }
  };

  createQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const notebookId = req.params.notebookId as string;
    const { title, description, questions } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ status: 'error', message: 'Quiz title is required.' });
      return;
    }

    try {
      const quiz = await toolsService.createQuiz(notebookId, userId, {
        title,
        description,
        questions,
      });
      res.status(201).json({ status: 'success', data: quiz });
    } catch (err) {
      this.handleError(res, err, 'createQuiz');
    }
  };

  updateQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const quizId = req.params.quizId as string;
    const { title, description } = req.body;
    try {
      const quiz = await toolsService.updateQuiz(quizId, userId, { title, description });
      res.status(200).json({ status: 'success', data: quiz });
    } catch (err) {
      this.handleError(res, err, 'updateQuiz');
    }
  };

  deleteQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const quizId = req.params.quizId as string;
    try {
      const result = await toolsService.deleteQuiz(quizId, userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      this.handleError(res, err, 'deleteQuiz');
    }
  };

  addQuestion = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const quizId = req.params.quizId as string;
    const { question, options, correctAnswer, explanation } = req.body;

    if (!question || !options || correctAnswer === undefined) {
      res.status(400).json({ status: 'error', message: 'Question, options, and correctAnswer are required.' });
      return;
    }

    try {
      const q = await toolsService.addQuestionToQuiz(quizId, userId, {
        question,
        options,
        correctAnswer: Number(correctAnswer),
        explanation,
      });
      res.status(201).json({ status: 'success', data: q });
    } catch (err) {
      this.handleError(res, err, 'addQuestion');
    }
  };

  updateQuestion = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const questionId = req.params.questionId as string;
    const { question, options, correctAnswer, explanation } = req.body;

    try {
      const q = await toolsService.updateQuestion(questionId, userId, {
        question,
        options,
        correctAnswer: correctAnswer !== undefined ? Number(correctAnswer) : undefined,
        explanation,
      });
      res.status(200).json({ status: 'success', data: q });
    } catch (err) {
      this.handleError(res, err, 'updateQuestion');
    }
  };

  deleteQuestion = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const questionId = req.params.questionId as string;
    try {
      const result = await toolsService.deleteQuestion(questionId, userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      this.handleError(res, err, 'deleteQuestion');
    }
  };

  submitAttempt = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.sub as string;
    const quizId = req.params.quizId as string;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      res.status(400).json({ status: 'error', message: 'Answers must be an array of chosen option indices.' });
      return;
    }

    try {
      const result = await toolsService.submitQuizAttempt(quizId, userId, answers);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      this.handleError(res, err, 'submitAttempt');
    }
  };
}
