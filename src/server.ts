// backend/src/server.ts

import { Server as HocuspocusServer } from '@hocuspocus/server';
import mongoose from 'mongoose';
import DocumentModel from './models/Document';
import * as Y from 'yjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './models/User';
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import documentRoutes from './routes/documentRoutes';
import llmRoutes from './routes/llmRoutes';
import { createServer } from 'http';

// TODO put this in a types file
interface DecodedToken {
    userId: string;
}

dotenv.config();

const EXPRESS_PORT = process.env.EXPRESS_PORT ? parseInt(process.env.EXPRESS_PORT) : 3000;
const HOCUSPOCUS_PORT = process.env.HOCUSPOCUS_PORT ? parseInt(process.env.HOCUSPOCUS_PORT) : 3001;

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

const hocuspocusServer = HocuspocusServer.configure({
    port: HOCUSPOCUS_PORT,

    async onAuthenticate(data) {
        const { token } = data;

        if (!token) {
            throw new Error('Unauthorized'); // no token provided
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as jwt.Secret) as DecodedToken;
            const userId = decoded.userId;

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Unauthorized'); // user not found
            }
            
            return {
                userId: userId,
            };
        } catch (error) {
            throw new Error('Unauthorized'); // invalid token
        }
    },

    async onLoadDocument(data) {
        const { documentName, context } = data;
        const documentId = documentName;

        const userId = context?.userId;
        if (!userId) {
            throw new Error('Unauthorized'); // no user id in context
        }

        let doc = await DocumentModel.findById(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        if (!doc.owner.equals(userId) && !doc.users.some((u) => u.equals(userId))) {
            throw new Error('Unauthorized');
        }

        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, doc.content);
        return ydoc;
    },

    async onStoreDocument(data) {
        console.log("ON STORE DOCUMENT");
        const { documentName, document, context } = data;
        const documentId = documentName;
        const userId = context?.userId;

        if (!userId) {
            throw new Error('Unauthorized'); // no user id in context
        }

        const update = {
            content: Buffer.from(Y.encodeStateAsUpdate(document)), // THIS SHOULD PROBABLY INCLUDE Buffer.from as we want to store a buffer
        };

        const query = {
            _id: documentId,
            $or: [
                { owner: userId },
                { users: userId },
            ],
        };

        const options = {
            new: true, // return the updated document
            upsert: false, // do not create a new document if it doesn't exist
        };

        // perform atomic update
        const updatedDoc = await DocumentModel.findOneAndUpdate(query, update, options);

        if (!updatedDoc) {
            throw new Error('Unauthorized');
        }
    }
});

hocuspocusServer.listen();