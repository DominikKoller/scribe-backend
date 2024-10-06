// backend/src/server.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import hocuspocusServer from './hocuspocusServer';
import startApolloServer from './apolloServer';

dotenv.config();

const EXPRESS_PORT = process.env.EXPRESS_PORT ? parseInt(process.env.EXPRESS_PORT) : 3000;

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