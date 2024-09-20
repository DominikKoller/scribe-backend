// backend/src/routes/llmRoutes.ts
import { Router } from 'express';
import { runLLMOnDocument } from '../controllers/llmController';
import { authenticateJWT } from '../middleware/auth';
const router = Router();

router.post('/:id/addComments', authenticateJWT, runLLMOnDocument);

export default router;