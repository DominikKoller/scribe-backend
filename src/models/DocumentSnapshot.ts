// This is a first draft for data collection infrastructure for finetuning data.

// backend/src/models/DocumentSnapshot.ts

import { Schema, model, Document as MDocument, Types, ObjectId } from 'mongoose';


export interface IDocumentSnapshot extends MDocument<ObjectId, any, any> {
    documentId: Types.ObjectId;
    title: string;
    paragraphs: string[];
    comments: { 
        paragraph_index: number;
        comment_text: string;
    }[]
}

const DocumentSnapshotSchema = new Schema<IDocumentSnapshot>({
    title: { type: String, required: true },
    paragraphs: [{ type: String, required: true }],
    comments: [{
        paragraph_index: { type: Number },
        comment_text: { type: String }
    }]
}, { timestamps: true });

export default model<IDocumentSnapshot>('DocumentSnapshots', DocumentSnapshotSchema);
