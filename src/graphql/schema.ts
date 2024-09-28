const typeDefs = `#graphql
    scalar DateTime

    type Query {
        hello: String!
    }

    type User {
        id: ID!
        email: String!
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
        token: String!
        user: User!
    }

    # wait why would I do this?
    type DocumentTitle {
        id: ID!
        title: String!
    }

    type Query {
        me: User
        documentTitles: [DocumentTitle!]!
    }

    type Mutation {
        register(email: String!, password: String!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        anonymousLogin: AuthPayload!
        createDocument(title: String!): Document!
        deleteDocument(id: ID!): Boolean!
    }
`;

export default typeDefs;