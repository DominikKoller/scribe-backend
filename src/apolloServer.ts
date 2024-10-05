// backend/src/apolloServer.ts

import { ApolloServer, BaseContext } from '@apollo/server';
import jwt from 'jsonwebtoken';
import UserModel, { IUser } from './models/User';
import { startStandaloneServer } from '@apollo/server/standalone';
import typeDefs from './graphql/schema';
import resolvers from './graphql/resolvers';
import dotenv from 'dotenv';

// OLD CODE
/*

dotenv.config();
const APOLLO_PORT = process.env.APOLLO_PORT ? parseInt(process.env.APOLLO_PORT) : 4000;



const server = new ApolloServer<AuthContext>({
    typeDefs,
    resolvers,
});

const startServer = async () => {
    const { url } = await startStandaloneServer(server, {
        context: async ({ req }) => {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
            const user = await getUserFromToken(token || '');
            return { user };
        },
        listen: { port: APOLLO_PORT },
    });

    return url;
};

async function getUserFromToken(token: string): Promise<IUser | null> {
    try {
        if (!token) {
            return null;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '' as jwt.Secret);
        const user = await UserModel.findById((decoded as any).userId);
        return user; 
    } catch (error) {
        return null;
    }
}

export default startServer;

*/