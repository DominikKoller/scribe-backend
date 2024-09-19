// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: string;
}

export const authenticateJWT = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        jwt.verify(
            token,
            process.env.JWT_SECRET as jwt.Secret,
            (err, decoded) => {
                if (err) {
                    return res.sendStatus(403);
                } else {
                    req.user = (decoded as { userId: string }).userId;
                    next();
                }
            }
        );
    } else {
        res.sendStatus(401);
    }
};