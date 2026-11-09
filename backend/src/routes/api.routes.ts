import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/auth.controller';
import { ProjectController } from '../controllers/project.controller';
import { AnalysisController } from '../controllers/analysis.controller';
import { TutorController } from '../controllers/tutor.controller';
import { LearningController } from '../controllers/learning.controller';
import { ReportController } from '../controllers/report.controller';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// --- Auth Routes ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/profile', authenticateToken, AuthController.getProfile);

// --- Project Routes ---
router.get('/projects/dashboard', authenticateToken, ProjectController.getDashboardOverview);
router.get('/projects', authenticateToken, ProjectController.listProjects);
router.post('/projects', authenticateToken, ProjectController.createProject);
router.get('/projects/:id', authenticateToken, ProjectController.getProject);
router.delete('/projects/:id', authenticateToken, ProjectController.deleteProject);

// --- Analysis Engine Routes ---
router.post('/analysis/preview-sql', authenticateToken, AnalysisController.previewSql);
router.post('/analysis/parse-diagram', authenticateToken, upload.single('diagram'), AnalysisController.parseDiagramImage);
router.post('/analysis/execute', authenticateToken, AnalysisController.executeAnalysis);
router.post('/analysis/add-fd', authenticateToken, AnalysisController.addCustomFd);

// --- AI Tutor Routes ---
router.post('/tutor/ask', authenticateToken, TutorController.ask);

// --- Learning Center Routes ---
router.get('/learning/curriculum', authenticateToken, LearningController.getCurriculum);
router.get('/learning/topic/:id', authenticateToken, LearningController.getTopic);
router.post('/learning/submit-quiz', authenticateToken, LearningController.submitQuiz);
router.post('/learning/unit', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), LearningController.upsertUnit);
router.post('/learning/topic', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), LearningController.upsertTopic);

// --- Report Routes ---
router.post('/reports/export-pdf', authenticateToken, ReportController.exportPdf);
router.post('/reports/download-sql', authenticateToken, ReportController.downloadCorrectedSql);

export default router;
