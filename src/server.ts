// backend/src/server.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import expressWebsockets from 'express-ws';
import { ApolloServer, BaseContext } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import MongoStore from 'connect-mongo';

import hocuspocusServer from './hocuspocusServer';

// import startApolloServer from './apolloServer';
import typeDefs from './graphql/schema';
import resolvers from './graphql/resolvers';
import User, { IUser } from './models/User';

dotenv.config();

const EXPRESS_PORT = process.env.EXPRESS_PORT ? parseInt(process.env.EXPRESS_PORT) : 3000;

const SESSION_SECRET = process.env.SESSION_SECRET || 'secret';
const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_DB = process.env.MONGO_DB || 'scribe';
const MONGO_USERNAME = process.env.MONGO_USERNAME || '';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || '';

const mongoUrl = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

mongoose
    .connect(mongoUrl || "", {
        autoIndex: true,
    })
    .then(() => {
        console.log("Connected to MongoDB via: ", mongoUrl);
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error.message);
    });

/*
hocuspocusServer.listen()
    .then(() => {
        console.log(`Hocuspocus server running at port ${process.env.HOCUSPOCUS_PORT}`);
    })
    .catch((error) => {
        console.error("Error starting hocuspocus server:", error);
    });

*/

/*
startApolloServer()
    .then((url) => {
        console.log(`Apollo server running at ${url}`);
    })
    .catch((error) => {
        console.error("Error starting server:", error);
    });
*/

const { app } = expressWebsockets(express());

app.set('trust proxy', 1);

app.use(cors({
    origin: (origin, callback) => { return callback(null, origin); }, // TODO this is insecure. Basically '*' but allows credentials
    credentials: true
}));

app.use(express.json());

export interface AuthSession extends session.Session {
    userId?: string | undefined;
}

export interface AuthRequest extends Request {
    session: AuthSession;
    user?: any;
}

export interface AuthContext extends BaseContext {
    user: IUser | null;
    session: AuthSession;
}

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl,
        collectionName: 'sessions',
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 5, // 5 days
        secure: true, // must use HTTPS in order to allow samesite none cookies
        sameSite: 'none', // cross site cookies. TODO tighten this setting
        httpOnly: true,
    },
    rolling: true, // reset maxAge on every request
}));

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.session.userId) {
        const user = await User.findById(req.session.userId);
        if (user) {
            req.user = user;
        }
        else {
            req.session.userId = undefined;
            req.user = undefined;
        }
    } else {
        req.session.userId = undefined;
        req.user = undefined;
    }
    next();
}

app.use(authMiddleware);

const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
});

(async () => {
    // Note you must call `start()` on the `ApolloServer`
    // instance before passing the instance to `expressMiddleware`.
    await apolloServer.start();

    app.use('/graphql', expressMiddleware(apolloServer, {
        context: async ({ req }: { req: AuthRequest }): Promise<AuthContext> => {
            return {
                user: req.user,
                session: req.session,
            }
        }
    }));

    app.ws('/hocuspocus', (ws, req: AuthRequest) => {

        console.log("on hocuspocus connection. Session: ", req.session);
        const context = {
            user: req.user,
        }

        console.log("calling hocuspocusServer.handleConnection");
        hocuspocusServer.handleConnection(ws, req, context);
        console.log("called hocuspocusServer.handleConnection");
    })

    app.listen(EXPRESS_PORT, () => {
        console.log(`Express server running at port ${EXPRESS_PORT}`);
    });
})();