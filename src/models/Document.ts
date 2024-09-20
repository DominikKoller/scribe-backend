// backend/src/models/Document.ts

import { Schema, model, Document as MDocument } from 'mongoose';

export interface IDocument extends MDocument {
    title: string;
    content: any;
    owner: Schema.Types.ObjectId;
    version: number;
}

const DocumentSchema = new Schema<IDocument>({
    title: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true},
    version: { type: Number, required: true, default: 0 }
});

export default model<IDocument>('Document', DocumentSchema);