// backend/src/server.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import documentRoutes from './routes/documentRoutes';
import llmRoutes from './routes/llmRoutes';
import hocuspocusServer from './hocuspocusServer';

dotenv.config();

const EXPRESS_PORT = process.env.EXPRESS_PORT ? parseInt(process.env.EXPRESS_PORT) : 3000;

mongoose
    .connect(process.env.MONGODB_URI || "")
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.log("MongoDB URI:", process.env.MONGODB_URI);
        console.error("Error connecting to MongoDB:", error.message);
    });

// express routes
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/llm', llmRoutes);

app.listen(EXPRESS_PORT, () => {
    console.log(`Express server running on port ${EXPRESS_PORT}`);
});

hocuspocusServer.listen();