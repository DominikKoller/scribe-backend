import { Schema, model, Document as MDocument } from 'mongoose';
import { IUser } from './User';

export interface IDocument extends MDocument {
    title: string;
    content: any;
    owner: Schema.Types.ObjectId;
}

const DocumentSchema = new Schema<IDocument>({
    title: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true},
});

export default model<IDocument>('Document', DocumentSchema);