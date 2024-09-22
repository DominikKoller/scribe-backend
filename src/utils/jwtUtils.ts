// utils/jwtUtils.ts
import jwt from 'jsonwebtoken';

export interface DecodedToken {
  userId: string;
}

export const verifyToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as jwt.Secret) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
};