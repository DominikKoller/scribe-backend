// backend/src/graphql/schema.ts
const typeDefs = `#graphql
    scalar DateTime

    type User {
        id: ID!
        email: String
        isAnonymous: Boolean!
    }

    type Document {
        id: ID!
        title: String!
        owner: User!
        users: [User!]!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type AuthPayload {
        accessToken: String!
        refreshToken: String!
    }

    type Query {
        me: User!
        documents: [Document!]!
    }

    type Mutation {
        register(email: String!, password: String!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        anonymousLogin: AuthPayload!
        refresh(refreshToken: String!): AuthPayload!
        createDocument(title: String!): Document!
        deleteDocument(id: ID!): Boolean!
        runLLMOnDocument(id: ID!): Boolean!
    }
`;

export default typeDefs;