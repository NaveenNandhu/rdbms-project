import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AiProviderService, TutorContext } from '../services/ai-provider.service';

export class TutorController {
  public static async ask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { question, context } = req.body;

      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      const tutorContext: TutorContext = {
        mode: context?.mode === 'ADVANCED' ? 'ADVANCED' : 'BEGINNER',
        contextType: context?.contextType || 'ENTIRE_DATABASE',
        selectedTableName: context?.selectedTableName,
        selectedRelationshipId: context?.selectedRelationshipId,
        schemaOverview: context?.schemaOverview,
        analysisSummary: context?.analysisSummary
      };

      const result = await AiProviderService.askTutor(question, tutorContext);

      res.json({
        success: true,
        answer: result.answer,
        suggestedFollowups: result.suggestedFollowups
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
