import DocumentModel from '../models/Document'
import User from '../models/User';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { runLLMOnDocument as runLLM } from '../controllers/llmController';

const resolvers = {
    Query: {
        me: async (_: any, __: any, { user }: { user: any }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            return user;
        },

        documents: async (_: any, __: any, { user }: { user: any }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            const documents = await DocumentModel.find({ owner: user.id });
            return documents.map((document: any) => ({
                id: document.id,
                title: document.title,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
            }));
        },
    },
    Mutation: {
        register: async (_: any, { email, password }: { email: string, password: string }) => {
            if (await User.exists({ email })) {
                throw new Error('User already exists');
            }

            const user = new User({ email, password });
            await user.save();

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET as jwt.Secret,
                { expiresIn: '1h' }
            );

            return { token };
        },
        login: async (_: any, { email, password }: { email: string, password: string }) => {
            const user = await User.findOne({ email });
            if (!user || !(await user.comparePassword(password))) {
                throw new Error('Invalid credentials');
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET as jwt.Secret,
                { expiresIn: '1h' }
            );

            return { token };
        },
        anonymousLogin: async () => {
            const anonymousUser = new User({ isAnonymous: true });
            await anonymousUser.save();

            const token = jwt.sign(
                { userId: anonymousUser._id, isAnonymous: true },
                process.env.JWT_SECRET as jwt.Secret,
                { expiresIn: '1h' }
            );

            return { token };
        },
        createDocument: async (_: any, { title }: { title: string }, { user }: { user: any }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }

            // TODO
            // We construct a default document here
            // Instead, we should have some default stored in the database and fall back on an empty document
            /*
            <paragraph><italic>Start writing your application here! Once you have a first draft, or whenever you want feedback on your writing, press the MAGIC icon above!</italic></paragraph>
            */
            const ydoc = new Y.Doc();

            const yXmlFragment = ydoc.getXmlFragment('default');

            const paragraph = new Y.XmlElement('paragraph');
            const textNode = new Y.XmlText();
            const stringToInsert = 'Start writing your college application cover letter here! Once you have a first draft, or whenever you want feedback on your writing, press the MAGIC button above!'
 
            textNode.insert(
                0,
                stringToInsert
            );

            textNode.format(0, stringToInsert.length, { italic: {} }); // for some reason textNode.length is 0

            paragraph.push([textNode]);
            yXmlFragment.push([paragraph]);
            const content = Y.encodeStateAsUpdate(ydoc);

            const document = new DocumentModel({
                title,
                content: Buffer.from(content),
                owner: user.id,
                users: [user.id],
            });

            await document.save();
            const userObj = {
                id: user.id,
                email: user.email,
                isAnonymous: user.isAnonymous,
            }
            return {
                id: document.id,
                title: document.title,
                owner: userObj,
                users: [userObj],
            }
        },
        deleteDocument: async (_: any, { id }: { id: string }, { user }: { user: any }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }

            const deleteResult = await DocumentModel.deleteOne({
                _id: id,
                owner: user.id,
            });

            return deleteResult.deletedCount === 1;
        },
        runLLMOnDocument: async (_: any, { id }: { id: string }, { user }: { user: any }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            return await runLLM(id);
        }
    }
};

export default resolvers;