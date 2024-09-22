// backend/src/controllers/documentController.ts
import { Request, Response } from 'express';
import DocumentModel from '../models/Document';

interface AuthRequest extends Request {
    user?: string;
}

export const createDocument = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content } = req.body;
        const document = new DocumentModel({
            title,
            content,
            owner: req.user,
        });
        await document.save();
        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error'});
    }
};

export const getDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const documents = await DocumentModel.find({ owner: req.user });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getDocumentById = async (req: AuthRequest, res: Response) => {
    try {
        const document = await DocumentModel.findOne({
            _id: req.params.id,
            owner: req.user,
        });
        if(!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/*
// Replaced by socket.io methods
export const updateDocument = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content } = req.body;
        const document = await DocumentModel.findOneAndUpdate(
            { _id: req.params.id, owner: req.user },
            { title, content },
            { new: true }
        );
        if(!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
*/

// TODO: what should socket.io do when a document is deleted?
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
        res.status(500).json({ message: 'Internal Server Error' });
    }
};