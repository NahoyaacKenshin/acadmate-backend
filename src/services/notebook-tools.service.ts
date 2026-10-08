/**
 * Notebook Tools Service
 *
 * Provides AI generation and full CRUD for:
 *   1. Flashcard Decks & Flashcards (generate from notes, edit, mark mastered)
 *   2. Practice Quizzes & Questions (generate from notes, edit, take quiz, submit score)
 */

import { prisma } from '@/lib/prisma';
import { generateWithFallback } from '@/utils/gemini';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Gathers representative source text from READY sources in a notebook.
 */
async function getNotebookSourceContext(notebookId: string, userId: string): Promise<string> {
  const sources = await prisma.source.findMany({
    where: { notebookId, userId, status: 'READY' },
    select: { id: true, fileName: true, rawText: true },
    take: 10,
  });

  if (sources.length === 0) {
    throw new Error('No ready sources found in this notebook. Please upload study materials first.');
  }

  // Combine text up to ~30,000 characters
  let combined = '';
  for (const src of sources) {
    if (src.rawText && src.rawText.trim().length > 0) {
      combined += `\n\n--- Source: "${src.fileName}" ---\n` + src.rawText.slice(0, 8000);
    }
  }

  // If rawText wasn't populated or was short, fetch from chunks
  if (combined.trim().length < 100) {
    const chunks = await prisma.sourceChunk.findMany({
      where: { notebookId },
      select: { content: true },
      take: 25,
      orderBy: { chunkIndex: 'asc' },
    });
    combined = chunks.map((c) => c.content).join('\n\n');
  }

  if (combined.trim().length < 50) {
    throw new Error('Notebook sources do not contain enough readable text to generate study materials.');
  }

  return combined.slice(0, 32000);
}

// ── Flashcard Decks ───────────────────────────────────────────────────────────

export async function listFlashcardDecks(notebookId: string, userId: string) {
  const decks = await prisma.flashcardDeck.findMany({
    where: { notebookId, userId },
    include: {
      cards: {
        select: { id: true, isMastered: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return decks.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    totalCards: d.cards.length,
    masteredCards: d.cards.filter((c) => c.isMastered).length,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

export async function getFlashcardDeck(deckId: string, userId: string) {
  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
    include: {
      cards: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!deck) {
    throw new Error('Flashcard deck not found.');
  }

  return {
    ...deck,
    totalCards: deck.cards.length,
    masteredCards: deck.cards.filter((c) => c.isMastered).length,
  };
}

export async function generateFlashcards(
  notebookId: string,
  userId: string,
  options?: { count?: number; title?: string }
) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });
  if (!notebook) throw new Error('Notebook not found.');

  const context = await getNotebookSourceContext(notebookId, userId);
  const cardCount = Math.min(Math.max(options?.count || 12, 5), 30);

  const prompt = `You are an expert academic tutor. Based strictly on the study materials below, generate a high-yield flashcard deck for a student to study.

REQUIREMENTS:
1. Generate exactly ${cardCount} flashcards.
2. Focus on key definitions, core concepts, formulas, and critical facts found in the text.
3. Keep the "front" concise (term, concept, or clear question).
4. Keep the "back" clear, comprehensive, and easy to memorize (definition, answer, or breakdown).
5. Output MUST be valid, parseable JSON with NO markdown formatting, matching this exact schema:
{
  "title": "${options?.title || `${notebook.title} - Key Concepts`}",
  "description": "Essential terms and principles from your uploaded materials",
  "cards": [
    {
      "front": "Term / Question",
      "back": "Definition / Answer"
    }
  ]
}

--- STUDY MATERIALS ---
${context}
--- END MATERIALS ---`;

  const aiReply = await generateWithFallback([{ text: prompt }], 0.3);
  const jsonStr = cleanJsonString(aiReply);

  let parsed: { title?: string; description?: string; cards: Array<{ front: string; back: string }> };
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('[NotebookTools] Flashcard JSON parse error:', parseErr, jsonStr);
    throw new Error('Failed to parse AI-generated flashcards. Please try again.');
  }

  if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('AI could not generate flashcards from the provided materials.');
  }

  // Create deck and cards in database
  const createdDeck = await prisma.flashcardDeck.create({
    data: {
      title: options?.title || parsed.title || `${notebook.title} - Study Deck`,
      description: parsed.description || 'Generated from notebook study sources',
      notebookId,
      userId,
      cards: {
        create: parsed.cards.map((c) => ({
          front: c.front.trim(),
          back: c.back.trim(),
          isMastered: false,
        })),
      },
    },
    include: {
      cards: true,
    },
  });

  return {
    ...createdDeck,
    totalCards: createdDeck.cards.length,
    masteredCards: 0,
  };
}

export async function createFlashcardDeck(
  notebookId: string,
  userId: string,
  data: { title: string; description?: string; cards?: Array<{ front: string; back: string }> }
) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });
  if (!notebook) throw new Error('Notebook not found.');

  return await prisma.flashcardDeck.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim(),
      notebookId,
      userId,
      cards: {
        create: (data.cards || []).map((c) => ({
          front: c.front.trim(),
          back: c.back.trim(),
          isMastered: false,
        })),
      },
    },
    include: { cards: true },
  });
}

export async function updateFlashcardDeck(
  deckId: string,
  userId: string,
  data: { title?: string; description?: string }
) {
  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
  });
  if (!deck) throw new Error('Deck not found.');

  return await prisma.flashcardDeck.update({
    where: { id: deckId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
    },
  });
}

export async function deleteFlashcardDeck(deckId: string, userId: string) {
  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
  });
  if (!deck) throw new Error('Deck not found.');

  await prisma.flashcardDeck.delete({ where: { id: deckId } });
  return { success: true };
}

// ── Card Level CRUD ───────────────────────────────────────────────────────────

export async function addCardToDeck(
  deckId: string,
  userId: string,
  data: { front: string; back: string }
) {
  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
  });
  if (!deck) throw new Error('Deck not found.');

  return await prisma.flashcard.create({
    data: {
      deckId,
      front: data.front.trim(),
      back: data.back.trim(),
      isMastered: false,
    },
  });
}

export async function updateCard(
  cardId: string,
  userId: string,
  data: { front?: string; back?: string; isMastered?: boolean }
) {
  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, deck: { userId } },
  });
  if (!card) throw new Error('Card not found.');

  return await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      ...(data.front !== undefined && { front: data.front.trim() }),
      ...(data.back !== undefined && { back: data.back.trim() }),
      ...(data.isMastered !== undefined && { isMastered: data.isMastered }),
    },
  });
}

export async function deleteCard(cardId: string, userId: string) {
  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, deck: { userId } },
  });
  if (!card) throw new Error('Card not found.');

  await prisma.flashcard.delete({ where: { id: cardId } });
  return { success: true };
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export async function listQuizzes(notebookId: string, userId: string) {
  const quizzes = await prisma.quiz.findMany({
    where: { notebookId, userId },
    include: {
      questions: { select: { id: true } },
      attempts: {
        orderBy: { score: 'desc' },
        take: 1,
        select: { score: true, total: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    totalQuestions: q.questions.length,
    bestAttempt: q.attempts[0] ?? null,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));
}

export async function getQuiz(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: {
      questions: { orderBy: { createdAt: 'asc' } },
      attempts: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!quiz) throw new Error('Quiz not found.');

  return {
    ...quiz,
    totalQuestions: quiz.questions.length,
  };
}

export async function generateQuiz(
  notebookId: string,
  userId: string,
  options?: { count?: number; title?: string }
) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });
  if (!notebook) throw new Error('Notebook not found.');

  const context = await getNotebookSourceContext(notebookId, userId);
  const qCount = Math.min(Math.max(options?.count || 8, 3), 20);

  const prompt = `You are a university exam creator. Based strictly on the study materials below, generate a practice multiple-choice quiz.

REQUIREMENTS:
1. Generate exactly ${qCount} multiple-choice questions.
2. Each question must have exactly 4 choices (options).
3. Specify the 0-based index of the correct answer (0 for first option, 1 for second, 2 for third, 3 for fourth).
4. Provide a clear, educational explanation for why that answer is correct.
5. Output MUST be valid, parseable JSON with NO markdown formatting, matching this exact schema:
{
  "title": "${options?.title || `${notebook.title} - Practice Quiz`}",
  "description": "Practice test covering your uploaded materials",
  "questions": [
    {
      "question": "Clear question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct."
    }
  ]
}

--- STUDY MATERIALS ---
${context}
--- END MATERIALS ---`;

  const aiReply = await generateWithFallback([{ text: prompt }], 0.3);
  const jsonStr = cleanJsonString(aiReply);

  let parsed: {
    title?: string;
    description?: string;
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }>;
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('[NotebookTools] Quiz JSON parse error:', parseErr, jsonStr);
    throw new Error('Failed to parse AI-generated quiz. Please try again.');
  }

  if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('AI could not generate questions from the provided materials.');
  }

  const createdQuiz = await prisma.quiz.create({
    data: {
      title: options?.title || parsed.title || `${notebook.title} - Practice Quiz`,
      description: parsed.description || 'Generated from notebook study materials',
      notebookId,
      userId,
      questions: {
        create: parsed.questions.map((q) => ({
          question: q.question.trim(),
          options: q.options,
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation?.trim() || null,
        })),
      },
    },
    include: {
      questions: true,
      attempts: true,
    },
  });

  return {
    ...createdQuiz,
    totalQuestions: createdQuiz.questions.length,
  };
}

export async function createQuiz(
  notebookId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    questions?: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }>;
  }
) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });
  if (!notebook) throw new Error('Notebook not found.');

  return await prisma.quiz.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim(),
      notebookId,
      userId,
      questions: {
        create: (data.questions || []).map((q) => ({
          question: q.question.trim(),
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation?.trim() || null,
        })),
      },
    },
    include: { questions: true },
  });
}

export async function updateQuiz(
  quizId: string,
  userId: string,
  data: { title?: string; description?: string }
) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
  });
  if (!quiz) throw new Error('Quiz not found.');

  return await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
    },
  });
}

export async function deleteQuiz(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
  });
  if (!quiz) throw new Error('Quiz not found.');

  await prisma.quiz.delete({ where: { id: quizId } });
  return { success: true };
}

export async function addQuestionToQuiz(
  quizId: string,
  userId: string,
  data: { question: string; options: string[]; correctAnswer: number; explanation?: string }
) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
  });
  if (!quiz) throw new Error('Quiz not found.');

  return await prisma.quizQuestion.create({
    data: {
      quizId,
      question: data.question.trim(),
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation?.trim() || null,
    },
  });
}

export async function updateQuestion(
  questionId: string,
  userId: string,
  data: { question?: string; options?: string[]; correctAnswer?: number; explanation?: string }
) {
  const q = await prisma.quizQuestion.findFirst({
    where: { id: questionId, quiz: { userId } },
  });
  if (!q) throw new Error('Question not found.');

  return await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      ...(data.question !== undefined && { question: data.question.trim() }),
      ...(data.options !== undefined && { options: data.options }),
      ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
      ...(data.explanation !== undefined && { explanation: data.explanation?.trim() || null }),
    },
  });
}

export async function deleteQuestion(questionId: string, userId: string) {
  const q = await prisma.quizQuestion.findFirst({
    where: { id: questionId, quiz: { userId } },
  });
  if (!q) throw new Error('Question not found.');

  await prisma.quizQuestion.delete({ where: { id: questionId } });
  return { success: true };
}

export async function submitQuizAttempt(
  quizId: string,
  userId: string,
  answers: number[]
) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: { questions: { orderBy: { createdAt: 'asc' } } },
  });
  if (!quiz) throw new Error('Quiz not found.');

  let score = 0;
  const results = quiz.questions.map((q, idx) => {
    const selected = answers[idx];
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) score++;

    return {
      questionId: q.id,
      question: q.question,
      selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      score,
      total: quiz.questions.length,
      answers,
    },
  });

  return {
    attemptId: attempt.id,
    score,
    total: quiz.questions.length,
    percentage: Math.round((score / quiz.questions.length) * 100),
    results,
    createdAt: attempt.createdAt,
  };
}
