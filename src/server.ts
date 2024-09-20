// backend/src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes";
import documentRoutes from "./routes/documentRoutes";
import llmRoutes from './routes/llmRoutes';

// TODO we should seperate out the Socket.io server into a seperate file
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Node as PMNode } from "prosemirror-model";
import { Step, Transform } from "prosemirror-transform";
import { mySchema } from "./utils/schema";
import DocumentModel from "./models/Document";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/llm', llmRoutes);

// HTTP server and Socket.io server. TODO to be refactored into a seperate file
const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
    },
});

io.on('connection', (socket) => {
    console.log('Client connected to socket.io', socket.id);

    socket.on('joinDocument', async ({ documentId, version }) => {
        try {
            const doc = await DocumentModel.findById(documentId);
            if (!doc) {
                socket.emit('error', { message: 'Document not found' });
                return;
            }

            socket.join(documentId);

            // if client's version is behind, send missing steps
            if (version < doc.version) {
                const steps = doc.steps.slice(version);
                socket.emit('receiveSteps', { version: doc.version, steps });
            } else {
                socket.emit('init', { version: doc.version });
            }
        } catch (error) {
            console.error('Error joining document:', error);
            socket.emit('error', { message: 'Error joining document' });
        }
    });

    socket.on('sendSteps', async ({ documentId, version, steps }) => {
        try {
            const doc = await DocumentModel.findById(documentId);
            if (!doc) {
                socket.emit('error', { message: 'Document not found' });
                return;
            }

            if (version !== doc.version) {
                const missingSteps = doc.steps.slice(version);
                socket.emit('receiveSteps', { version: doc.version, steps: missingSteps });
                return;
            }

            // Apply the steps to the document
            const docNode = PMNode.fromJSON(mySchema, doc.content);
            let tr = new Transform(docNode);

            const newSteps = steps.map((stepData: any) => Step.fromJSON(mySchema, stepData));

            newSteps.forEach((step: Step) => {
                tr.step(step);
            });

            // update the document's content and version
            doc.content = tr.doc.toJSON();
            doc.version += newSteps.length;
            doc.steps.push(...steps);
            await doc.save();

            // broadcast the steps to all clients
            socket.to(documentId).emit('receiveSteps', { version: doc.version, steps });
        
        } catch (error) {
            console.error('Error sending steps:', error);
            socket.emit('error', { message: 'Error sending steps' });
        } 
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected from socket.io', socket.id);
    });
});

mongoose
    .connect(process.env.MONGODB_URI || "")
    .then(() => {
        console.log("Connected to MongoDB");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB URI:", process.env.MONGODB_URI);
        console.error("Error connecting to MongoDB:", error.message);
    });