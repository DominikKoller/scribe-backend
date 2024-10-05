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

    type Query {
        me: User
        documents: [Document!]!
    }

    type Mutation {
        register(email: String!, password: String!): User!
        login(email: String!, password: String!): User!
        anonymousLogin: User!
        createDocument(title: String!): Document!
        deleteDocument(id: ID!): Boolean!
        runLLMOnDocument(id: ID!): Boolean!
    }
`;

export default typeDefs;