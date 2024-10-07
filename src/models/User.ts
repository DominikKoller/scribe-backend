// backend/src/models/User.ts

import { Schema, model, Document, ObjectId, Types } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document<Types.ObjectId, any, any> {
    email?: string;
    name: string; // will be set randomly for anonymous users
    password?: string;
    refreshTokens: string[];
    isAnonymous: boolean;
    commentCallsDayLimit: number;
    documentsLimit: number;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    password: { type: String},
    refreshTokens: { type: [String], default: [] },
    isAnonymous: { type: Boolean, default: false },
    commentCallsDayLimit: { type: Number },
    documentsLimit: { type: Number },
});

UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
        next();
    } catch (error) {
        next(error as any);
    }
});

UserSchema.methods.comparePassword = function (
    candidatePassword: string
): Promise<boolean> {
    if (!this.password) return Promise.resolve(false);
    return bcrypt.compare(candidatePassword, this.password);
};

export default model<IUser>('User', UserSchema);