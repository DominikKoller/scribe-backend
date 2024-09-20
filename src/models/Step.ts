import { Schema, model, Document } from 'mongoose';

export interface IStep extends Document {
    documentId: Schema.Types.ObjectId;
    version: number;
    step: any;
    clientID: string;
}

const StepSchema = new Schema<IStep>({
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    version: { type: Number, required: true },
    step: { type: Schema.Types.Mixed, required: true },
    clientID: { type: String, required: true },
});

export default model<IStep>('Step', StepSchema);