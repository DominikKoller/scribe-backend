// backend/src/models/Document.ts

import { Schema, model, Document as MDocument, Types } from 'mongoose';

export interface IDocument extends MDocument<Types.ObjectId, any, any> {
    title: string;
    content: Buffer;
    owner: Types.ObjectId;
    users: Types.ObjectId[];
}

const DocumentSchema = new Schema<IDocument>({
    title: { type: String, required: true },
    content: {
        type: Buffer,
        validate: {
            validator: function (v: Buffer) {
                // Custom check: ensure it's a buffer, but allow empty buffer
                return v != null && v instanceof Buffer;
            },
            message: 'Content must be a buffer',
        },
    },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default model<IDocument>('Document', DocumentSchema);