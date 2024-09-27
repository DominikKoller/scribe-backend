// backend/src/models/User.ts

import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
    email?: string;
    password?: string;
    isAnonymous: boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// note I do not have a ID field here, because mongoose will automatically add it
const UserSchema = new Schema<IUser>({
    email: { type: String, unique: true, sparse: true },
    password: { type: String},
    isAnonymous: { type: Boolean, default: false },
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