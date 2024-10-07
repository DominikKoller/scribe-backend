// This is a first draft for data collection infrastructure for finetuning data.

// backend/src/models/Document.ts

import { Schema, model, Document as MDocument, Types, ObjectId } from 'mongoose';


export interface IDocumentSnapshot extends MDocument<ObjectId, any, any> {
    documentId: Types.ObjectId;
    title: string;
    documentContent: string;
    comments: { 
        position: { start: number, end: number };
        text: string;
    }
}

const DocumentSnapshotSchema = new Schema<IDocumentSnapshot>({
    title: { type: String, required: true },
    documentContent: { type: String, required: true },
    comments: [{
        position: { start: { type: Number }, end: { type: Number } },
        text: { type: String }
    }]
}, { timestamps: true });

export default model<IDocumentSnapshot>('DocumentAndComments', DocumentSnapshotSchema);
