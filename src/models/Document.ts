// backend/src/models/Document.ts

import { Schema, model, Document as MDocument } from 'mongoose';
import { IUser } from './User';

export interface IDocument extends MDocument {
    title: string;
    content: any;
    owner: Schema.Types.ObjectId;
    version: number;
    steps: any[];
}

const DocumentSchema = new Schema<IDocument>({
    title: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true},
    version: { type: Number, default: 0 },
    steps: { type: Schema.Types.Mixed, default: [] },
});

export default model<IDocument>('Document', DocumentSchema);