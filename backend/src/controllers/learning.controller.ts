import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../services/prisma.service';

export class LearningController {
  /**
   * Get all learning units with topics and quiz questions.
   */
  public static async getCurriculum(req: Request, res: Response): Promise<void> {
    try {
      const units = await prisma.learningUnit.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          topics: {
            orderBy: { orderIndex: 'asc' },
            include: {
              quizQuestions: true
            }
          }
        }
      });

      res.json({ success: true, units });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get topic details by id.
   */
  public static async getTopic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const topic = await prisma.learningTopic.findUnique({
        where: { id },
        include: {
          quizQuestions: true,
          unit: true
        }
      });

      if (!topic) {
        res.status(404).json({ error: 'Topic not found' });
        return;
      }

      res.json({ success: true, topic });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Submit quiz attempt.
   */
  public static async submitQuiz(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { topicId, answers } = req.body; // answers: { questionId: selectedIndex }
      if (!topicId || !answers) {
        res.status(400).json({ error: 'topicId and answers are required.' });
        return;
      }

      const questions = await prisma.quizQuestion.findMany({ where: { topicId } });
      let correctCount = 0;
      const results: any[] = [];

      for (const q of questions) {
        const rawSelected = answers[q.id];
        const selected = rawSelected !== undefined && rawSelected !== null ? Number(rawSelected) : -1;
        const isCorrect = selected === q.correctAnswer;
        if (isCorrect) correctCount++;
        results.push({
          questionId: q.id,
          questionText: q.questionText,
          selected,
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation
        });
      }

      const totalQuestions = Math.max(1, questions.length);
      const score = Math.round((correctCount / totalQuestions) * 100);
      let attemptId: string | null = null;

      if (userId && !userId.startsWith('usr_')) {
        try {
          const attempt = await prisma.quizAttempt.create({
            data: {
              userId,
              score,
              total: questions.length,
              answers: JSON.stringify(answers)
            }
          });
          attemptId = attempt.id;
        } catch (dbErr) {
          // Ignore attempt recording errors for mock/demo accounts
        }
      }

      res.json({
        success: true,
        score,
        correctCount,
        totalQuestions: questions.length,
        results,
        attemptId
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Professor / Admin: Create or edit learning unit.
   */
  public static async upsertUnit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, title, description, orderIndex = 0 } = req.body;

      if (!title) {
        res.status(400).json({ error: 'Unit title is required' });
        return;
      }

      if (id) {
        const unit = await prisma.learningUnit.update({
          where: { id },
          data: { title, description, orderIndex }
        });
        res.json({ success: true, unit });
      } else {
        const unit = await prisma.learningUnit.create({
          data: { title, description, orderIndex }
        });
        res.status(201).json({ success: true, unit });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Professor / Admin: Create or edit topic.
   */
  public static async upsertTopic(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, unitId, title, summary, contentMarkdown, beginnerExplanation, advancedExplanation, moduleLink, orderIndex = 0 } = req.body;

      if (!unitId || !title) {
        res.status(400).json({ error: 'unitId and title are required' });
        return;
      }

      if (id) {
        const topic = await prisma.learningTopic.update({
          where: { id },
          data: { title, summary, contentMarkdown, beginnerExplanation, advancedExplanation, moduleLink, orderIndex }
        });
        res.json({ success: true, topic });
      } else {
        const topic = await prisma.learningTopic.create({
          data: { unitId, title, summary: summary || '', contentMarkdown: contentMarkdown || '', beginnerExplanation, advancedExplanation, moduleLink, orderIndex }
        });
        res.status(201).json({ success: true, topic });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
