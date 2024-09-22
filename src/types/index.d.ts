// backend/src/types/index.d.ts
import { Socket } from 'socket.io';

export interface AuthSocket extends Socket {
  user?: string;
}
