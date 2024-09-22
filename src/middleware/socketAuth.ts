import { verifyToken } from "../utils/jwtUtils";
import { AuthSocket } from "../types"
import { ExtendedError } from "socket.io/dist/namespace";

export const socketAuthMiddleware = (socket: AuthSocket, next: (err?: ExtendedError) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        next(new Error("Authentication error"));
        return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        next(new Error("Authentication error"));
        return;
    }
    socket.user = decoded.userId;
    next();
}