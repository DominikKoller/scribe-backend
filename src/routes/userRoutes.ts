import { Router } from 'express';
import { registerUser, loginUser, anonymousLogin } from '../controllers/userController';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/anonymousLogin', anonymousLogin);

export default router;
