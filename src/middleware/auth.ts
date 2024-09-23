// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: string;
}

interface DecodedToken {
    userId: string;
}

export const authenticateJWT = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET as jwt.Secret, (err, decoded) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = (decoded as DecodedToken).userId;
        next();
    });
};