// backend/src/controllers/documentController.ts
import { Request, Response } from 'express';
import DocumentModel from '../models/Document';
import * as Y from 'yjs';

interface AuthRequest extends Request {
    user?: string;
}

export const createDocument = async (req: AuthRequest, res: Response) => {
    try {
        const { title } = req.body;

        const ydoc = new Y.Doc();
        const content = Y.encodeStateAsUpdate(ydoc);

        const document = new DocumentModel({
            title,
            content: Buffer.from(content),
            owner: req.user,
            users: [req.user],
        });

        await document.save();
        res.status(201).json( { documentId: document._id });
    } catch (error) {
        console.error("Error creating document: ", error);
        res.status(500).json({ message: 'Internal Server Error'});
    }
};

export const getDocumentTitles = async (req: AuthRequest, res: Response) => {
    try {
        const documents = await DocumentModel.find({ owner: req.user });
        const titles = documents.map((doc) => ({
            id: doc._id,
            title: doc.title,
        }));
        res.json(titles);
    } catch (error) {
        console.error("Error getting document titles: ", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// TODO we should inform yjs/Hocuspocus that the document has been deleted & it cannot be accessed anymore
export const deleteDocument = async (req: AuthRequest, res: Response) => {
    try {
        const document = await DocumentModel.findOneAndDelete({
            _id: req.params.id,
            owner: req.user,
        });
        if(!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json({ message: 'Document deleted' });
    } catch (error) {
        console.error("Error deleting document: ", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};