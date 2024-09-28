// backend/src/hocuspocusServer.ts

import { Server as HocuspocusServer } from '@hocuspocus/server';
import jwt from 'jsonwebtoken';
import DocumentModel from './models/Document';
import User from './models/User';
import * as Y from 'yjs';
import dotenv from 'dotenv';

// TODO put this in a types file
// TODO unify authentication between Hocuspocus and Apollo
interface DecodedToken {
    userId: string;
}

dotenv.config();

const HOCUSPOCUS_PORT = process.env.HOCUSPOCUS_PORT ? parseInt(process.env.HOCUSPOCUS_PORT) : 3001;

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

        console.log('onLoadDocument context:', context);

        const isFromServer = context && context.isFromServer; // note when the document is first loaded, it may also be loaded from the server, but it does not happen often
        const userId = context?.userId;
        if (!userId && !isFromServer) {
            throw new Error('Unauthorized'); // no user id in context
        }

        let doc = await DocumentModel.findById(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        if (!doc.owner.equals(userId) && !doc.users.some((u) => u.equals(userId)) && !isFromServer) {
            throw new Error('Unauthorized');
        }

        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, doc.content);
        return ydoc;
    },

    async onStoreDocument(data) {
        const { documentName, document, context } = data;

        const isFromServer = context && context.isFromServer;

        const documentId = documentName;
        const userId = context?.userId;

        if (!userId && !isFromServer) {
            throw new Error('Unauthorized'); // no user id in context
        }

        const update = {
            content: Buffer.from(Y.encodeStateAsUpdate(document)),
        };

        let query;
        if (isFromServer) {
            query = {
                _id: documentId,
            };
        } else {
            query = {
                _id: documentId,
                $or: [
                    { owner: userId },
                    { users: userId },
                ],
            };
        }

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

export default hocuspocusServer;