// backend/src/hocuspocusServer.ts

import { Server as HocuspocusServer } from '@hocuspocus/server';
import jwt from 'jsonwebtoken';
import DocumentModel from './models/Document';
import User from './models/User';
import * as Y from 'yjs';

const hocuspocusServer = HocuspocusServer.configure({
    async onAuthenticate(data) {
        console.log("onAuthenticate data:", data);
        /*
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
        */
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

        // console.log('Loaded document:', ydoc.getXmlFragment('default').toJSON());
        return ydoc;
    },

    async onChange(data) {
        /* TODO low prio IMPLEMENT THIS */
        /* IT SHOULD MAKE SURE THE DOCUMENT TITLE IS NOT LONGER THAN 100 CHARACTERS */
    },

    async onStoreDocument(data) {
        const { documentName, document, context } = data;

        const isFromServer = context && context.isFromServer;

        const documentId = documentName;
        const userId = context?.userId;

        // document titles are only stored in the db for querying
        // the source of truth for the title / way to write the title is ALWAYS THE YDOC
        const newDocumentName = document.getText('name').toString();

        if (!userId && !isFromServer) {
            throw new Error('Unauthorized'); // no user id in context
        }

        const update = {
            content: Buffer.from(Y.encodeStateAsUpdate(document)),
            title: newDocumentName,
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