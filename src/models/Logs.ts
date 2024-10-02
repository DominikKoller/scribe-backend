import { Schema, model, Document } from 'mongoose';

// maybe we should make this IInternalAPICall ?
// but we only really need this for the user comment call..
// TODO think about this
export interface IUserCommentCall extends Document {
    documentId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
}

const UserCommentCallSchema = new Schema<IUserCommentCall>({
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const UserCommentCallModel = model<IUserCommentCall>('UserCommentCall', UserCommentCallSchema);

export interface IExternalAPICall extends Document {
    userId: Schema.Types.ObjectId;
    apiName: string;
    content: string | undefined;
    response: string | undefined;
}

const ExternalAPICallSchema = new Schema<IExternalAPICall>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    apiName: { type: String, required: true },
    content: { type: String },
    response: { type: String },
}, { timestamps: true });

export const ExternalAPICallModel = model<IExternalAPICall>('ExternalAPICall', ExternalAPICallSchema);