// backend/src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes";
import documentRoutes from "./routes/documentRoutes";
import llmRoutes from './routes/llmRoutes';
import { createServer } from "http";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import { collabHandler } from "./socketHandlers/collabHandler";
import { socketAuthMiddleware } from "./middleware/socketAuth";
import { AuthSocket } from "./types";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*',
    },
});

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
    console.log('A user connected to socket: ', socket.id);

    collabHandler(io, socket);

    socket.on('disconnect', () => {
        console.log('A user disconnected from socket: ', socket.id);
    });
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/llm', llmRoutes);

mongoose
    .connect(process.env.MONGODB_URI || "")
    .then(() => {
        console.log("Connected to MongoDB");
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB URI:", process.env.MONGODB_URI);
        console.error("Error connecting to MongoDB:", error.message);
    });