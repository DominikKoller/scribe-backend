// backend/src/routes/documentRoutes.ts
import { Router } from 'express';
import {
    createDocument,
    getDocuments,
    getDocumentById,
    // updateDocument,
    deleteDocument
} from '../controllers/documentController';
import { authenticateJWT } from '../middleware/auth';
const router = Router();

router.post('/', authenticateJWT, createDocument);
router.get('/', authenticateJWT, getDocuments);
router.get('/:id', authenticateJWT, getDocumentById);
// router.put('/:id', authenticateJWT, updateDocument);
router.delete('/:id', authenticateJWT, deleteDocument);

export default router;