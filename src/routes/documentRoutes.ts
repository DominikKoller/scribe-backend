// backend/src/routes/documentRoutes.ts
import { Router } from 'express';
import {
    createDocument,
    deleteDocument,
    getDocumentTitles,
} from '../controllers/documentController';
import { authenticateJWT } from '../middleware/auth';
const router = Router();

router.get('/', authenticateJWT, getDocumentTitles);
router.post('/', authenticateJWT, createDocument);
router.delete('/:id', authenticateJWT, deleteDocument);

export default router;