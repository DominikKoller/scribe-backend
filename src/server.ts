// backend/src/server.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import hocuspocusServer from './hocuspocusServer';
import startApolloServer from './apolloServer';

dotenv.config();

const EXPRESS_PORT = process.env.EXPRESS_PORT ? parseInt(process.env.EXPRESS_PORT) : 3000;

mongoose
    .connect(process.env.MONGODB_URI || "", {
        autoIndex: true,
    })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.log("MongoDB URI:", process.env.MONGODB_URI);
        console.error("Error connecting to MongoDB:", error.message);
    });

hocuspocusServer.listen()
    .then(() => {
        console.log(`Hocuspocus server running at port ${process.env.HOCUSPOCUS_PORT}`);
    })
    .catch((error) => {
        console.error("Error starting hocuspocus server:", error);
    });

startApolloServer()
    .then((url) => {
        console.log(`Apollo server running at ${url}`);
    })
    .catch((error) => {
        console.error("Error starting server:", error);
    });