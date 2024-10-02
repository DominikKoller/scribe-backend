// backend/src/graphql/resolvers.ts
import DocumentModel from '../models/Document'
import User, { IUser } from '../models/User';
import jwt from 'jsonwebtoken';
import { runLLMOnDocument as runLLM } from '../controllers/llmController';
import { UserCommentCallModel } from '../models/Logs';
import { createDefaultDocument } from '../controllers/documentController';
import { GraphQLError } from 'graphql';
import { AuthContext } from '../apolloServer';

// THIS FILE HANDLES ALL AUTHORIZATION AND RESOURCE ACCESS CONTROL
// When business logic is small enough, it can be handled here too
// Larger business logic should be handled in controllers

// I am pretty disappointed by the lack of type safety here..
// Even though I specify AuthContext here, this does not get typechecked by the Apollo library

const USER_DOC_LIMIT = process.env.USER_DOC_LIMIT ? parseInt(process.env.USER_DOC_LIMIT) : 10;
const ANON_USER_DOC_LIMIT = process.env.ANON_USER_DOC_LIMIT ? parseInt(process.env.ANON_USER_DOC_LIMIT) : 10;
const USER_COMMENT_CALL_DAY_LIMIT = process.env.USER_COMMENT_CALL_DAY_LIMIT ? parseInt(process.env.USER_COMMENT_CALL_DAY_LIMIT) : 100;
const ANON_USER_COMMENT_CALL_DAY_LIMIT = process.env.ANON_USER_COMMENT_CALL_DAY_LIMIT ? parseInt(process.env.ANON_USER_COMMENT_CALL_DAY_LIMIT) : 100;
const GLOBAL_COMMENT_CALL_DAY_LIMIT = process.env.GLOBAL_COMMENT_CALL_DAY_LIMIT ? parseInt(process.env.GLOBAL_COMMENT_CALL_DAY_LIMIT) : 500;
const GLOBAL_ANON_COMMENT_CALL_DAY_LIMIT = process.env.GLOBAL_ANON_COMMENT_CALL_DAY_LIMIT ? parseInt(process.env.GLOBAL_ANON_COMMENT_CALL_DAY_LIMIT) : 200;
const GLOBAL_USER_LIMIT = process.env.GLOBAL_USER_LIMIT ? parseInt(process.env.GLOBAL_USER_LIMIT) : 1000;
const GLOBAL_ANON_USER_LIMIT = process.env.GLOBAL_ANON_USER_LIMIT ? parseInt(process.env.GLOBAL_ANON_USER_LIMIT) : 1000;

const resolvers = {
    Query: {
        me: async (_: any, __: any, { user }: AuthContext) => {
            return user; // will also return null, without throwing an error. Can be used to check if the user is authenticated
        },

        documents: async (_: any, __: any, { user }: AuthContext) => {
            if (!user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }
            const documents = await DocumentModel.find({ owner: user._id });
            return documents.map((document: any) => ({
                id: document._id.toString(),
                title: document.title,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
            }));
        },
    },
    Mutation: {
        register: async (_: any, { email, password }: { email: string, password: string }) => {
            if (await User.exists({ email })) {
                throw new GraphQLError('Email already in use', {
                    extensions: {
                        code: 'EMAIL_ALREADY_IN_USE',
                    },
                });
            }

            const numUsers = await User.countDocuments();
            if (numUsers >= GLOBAL_USER_LIMIT) {
                throw new GraphQLError('User limit exceeded.', {
                    extensions: {
                        code: 'GLOBAL_USER_LIMIT_EXCEEDED',
                    },
                });
            }

            // TODO validate password strength
            // TODO validate email, at least as a valid email address but actually with a sent link
            const user = new User({ 
                email, 
                password, 
                commentCallsDayLimit: USER_COMMENT_CALL_DAY_LIMIT,
                documentsLimit: USER_DOC_LIMIT
            });
            await user.save();

            const token = jwt.sign(
                { userId: user._id.toString() },
                process.env.JWT_SECRET as jwt.Secret,
                { expiresIn: '1h' }
            );
            return { token };
        },
        login: async (_: any, { email, password }: { email: string, password: string }) => {
            const user: IUser | null = await User.findOne({ email });
            if (!user || !(await user.comparePassword(password))) {
                throw new GraphQLError('Invalid email or password', {
                    extensions: {
                        code: 'INVALID_CREDENTIALS',
                    },
                });
            }

            const token = jwt.sign(
                { userId: user._id.toString() },
                process.env.JWT_SECRET as jwt.Secret,
                { expiresIn: '1h' }
            );

            return { token };
        },
        anonymousLogin: async () => {
            const anonymousUser = new User({ 
                isAnonymous: true,
                commentCallsDayLimit: ANON_USER_COMMENT_CALL_DAY_LIMIT,
                documentsLimit: ANON_USER_DOC_LIMIT,
            });
            await anonymousUser.save();

            const userCount = await User.countDocuments();
            if (userCount >= GLOBAL_USER_LIMIT) {
                throw new GraphQLError('User limit exceeded.', {
                    extensions: {
                        code: 'GLOBAL_USER_LIMIT_EXCEEDED',
                    },
                });
            }

            const anonUserCount = await User.countDocuments({ isAnonymous: true });
            if (anonUserCount >= GLOBAL_ANON_USER_LIMIT) {
                throw new GraphQLError('Anonymous user limit exceeded.', {
                    extensions: {
                        code: 'GLOBAL_ANON_USER_LIMIT_EXCEEDED',
                    },
                });
            }

            const token = jwt.sign(
                { userId: anonymousUser._id.toString(), isAnonymous: true },
                process.env.JWT_SECRET as jwt.Secret,
                { expiresIn: '1h' }
            );

            return { token };
        },
        createDocument: async (_: any, { title }: { title: string }, { user }: AuthContext) => {
            if (!user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }
            const numDocuments = await DocumentModel.countDocuments({ owner: user._id });
            if (numDocuments >= user.documentsLimit) {
                throw new GraphQLError('Document limit exceeded.', {
                    extensions: {
                        code: 'DOCUMENT_LIMIT_EXCEEDED',
                    },
                });
            }

            const newDocument = await createDefaultDocument(user, title);

            const userReturnObj = {
                id: user._id.toString(),
                email: user.email,
                isAnonymous: user.isAnonymous,
            }

            return {
                id: newDocument._id.toString(),
                title: newDocument.title,
                owner: userReturnObj,
                users: [userReturnObj],
            };
        },
        deleteDocument: async (_: any, { id }: { id: string }, { user }: AuthContext) => {
            if (!user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }

            const deleteResult = await DocumentModel.deleteOne({
                _id: id,
                owner: user._id,
            });

            return deleteResult.deletedCount === 1;
        },
        runLLMOnDocument: async (_: any, { id }: { id: string }, { user }: AuthContext) => {
            if (!user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }

            // TODO low prio
            // instead of filtering logs, we could have resetting counters
            // do this if there is time & these calls are getting slow
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (user.isAnonymous) {
                // ANONYMOUS USERS HAVE A GLOBAL LIMIT ON COMMENT CALLS
                const anonCallsLast24Hours = await UserCommentCallModel.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: yesterday },
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'user',
                        }
                    },
                    {
                        // unwind because lookup returns an array
                        $unwind: '$user',
                    },
                    {
                        $match: {
                            'user.isAnonymous': true,
                        }
                    },
                    {
                        $count: 'anonymousUserCommentCalls',
                    }
                ]);

                const numberOfAnonymousCalls = anonCallsLast24Hours.length > 0 ? anonCallsLast24Hours[0].anonymousUserCommentCalls : 0;
                if (numberOfAnonymousCalls >= GLOBAL_ANON_COMMENT_CALL_DAY_LIMIT) {
                    throw new GraphQLError('No comment calls left for anonymous users', {
                        extensions: {
                            code: 'GLOBAL_ANON_COMMENT_CALL_DAY_LIMIT_EXCEEDED',
                        },
                    });
                }
            }

            // GLOBAL LIMIT ON COMMENT CALLS
            const callsLast24Hours = await UserCommentCallModel.aggregate([
                {
                    $match: {
                        createdAt: { $gte: yesterday },
                    }
                },
                {
                    $count: 'userCommentCalls',
                }
            ]);

            const numberOfCalls = callsLast24Hours.length > 0 ? callsLast24Hours[0].userCommentCalls : 0;
            if (numberOfCalls >= GLOBAL_COMMENT_CALL_DAY_LIMIT) {
                throw new GraphQLError('No comment calls left', {
                    extensions: {
                        code: 'GLOBAL_COMMENT_CALL_DAY_LIMIT_EXCEEDED',
                    },
                });
            }

            // USER LIMIT ON COMMENT CALLS
            const userCallsLast24Hours = await UserCommentCallModel.aggregate([
                {
                    $match: {
                        createdAt: { $gte: yesterday },
                        userId: user._id,
                    }
                },
                {
                    $count: 'userCommentCalls',
                }
            ]);

            const numberOfUserCalls = userCallsLast24Hours.length > 0 ? userCallsLast24Hours[0].userCommentCalls : 0;
            if (numberOfUserCalls >= user.commentCallsDayLimit) {
                throw new GraphQLError('No comment calls left', {
                    extensions: {
                        code: 'USER_COMMENT_CALL_DAY_LIMIT_EXCEEDED',
                    },
                });
            }

            const log = new UserCommentCallModel({
                documentId: id,
                userId: user._id,
            });
            await log.save();

            return await runLLM(id, user.id);
        }
    }
};

export default resolvers;