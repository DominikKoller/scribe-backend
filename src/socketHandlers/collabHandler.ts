// backend/src/socketHandlers/collabHandler.ts

import mongoose from 'mongoose';
import { AuthSocket } from '../types';
import DocumentModel from '../models/Document';
import StepModel from '../models/Step';
import { Step } from 'prosemirror-transform';
import { EditorState } from 'prosemirror-state';
import { mySchema } from '../utils/schema';
import { Server as SocketIOServer } from 'socket.io';

export function collabHandler(io: SocketIOServer, socket: AuthSocket) {
    // Handle joining a document room
    socket.on('join-document', async ({ documentId }) => {
        try {
            if (!socket.user) {
                socket.emit('error', 'Not authenticated');
                return;
            }

            // check if the document exists and the user has access
            const document = await DocumentModel.findById(documentId);
            if (!document) {
                socket.emit('error', 'Document not found');
                return;
            }
            // TODO check if the user has access to the document !!!
            socket.join(documentId);

            // send initial document state
            socket.emit('init-document', {
                content: document.content,
                version: document.version,
            });
        } catch (error) {
            socket.emit('error', 'Authentication failed');
        }
    });

    socket.on('submit-steps', async ({ documentId, version, steps, clientID }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            if (!socket.user) {
                console.log('Not authenticated');
                socket.emit('error', 'Not authenticated');
                await session.abortTransaction();
                await session.endSession();
                return;
            }

            const document = await DocumentModel.findById(documentId).session(session);

            if (!document) {
                console.log('Document not found');
                socket.emit('error', 'Document not found');
                await session.abortTransaction();
                await session.endSession();
                return;
            }

            if (version !== document.version) {
                console.log('Version mismatch. Client:', version, 'Server:', document.version);
                socket.emit('version-mismatch', {
                    serverVersion: document.version,
                });
                await session.abortTransaction();
                await session.endSession();
                return;
            }

            // apply steps to document
            let editorState = EditorState.create({
                doc: document.content ? mySchema.nodeFromJSON(document.content) : undefined,
                schema: mySchema
            });

            let newSteps = steps.map((stepJSON: any) => Step.fromJSON(mySchema, stepJSON));

            let tr = editorState.tr;
            newSteps.forEach((step: Step) => {
                tr.step(step);
            });

            if (!tr.doc) {
                console.log('Invalid steps');
                socket.emit('error', 'Invalid steps');
                await session.abortTransaction();
                await session.endSession();
                return;
            }

            // Save steps to the db
            let stepModels = newSteps.map((step: Step, index: number) => {
                return new StepModel({
                    documentId,
                    version: document.version + index + 1,
                    step: step.toJSON(),
                    clientID,
                });
            });

            await StepModel.insertMany(stepModels, { session });

            // Update document content
            document.content = tr.doc.toJSON();
            document.version += newSteps.length;
            await document.save({ session });

            await session.commitTransaction();
            await session.endSession();

            // Broadcast new document state, including to the sender
            io.to(documentId).emit('receive-steps', {
                steps: newSteps.map((step: Step) => step.toJSON()),
                version: document.version,
                clientIDs: newSteps.map(() => clientID),
            });

        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            console.error('Error submitting steps. This may be due to another transaction happening'); // this may be fine, so remove error message
            socket.emit('error', 'Internal server error');
        }
    });

    socket.on('get-steps', async ({ documentId, fromVersion }) => {
        try {
            const steps = await StepModel.find({
                documentId,
                version: { $gt: fromVersion }, // Fetch steps with versions greater than client's
            }).sort({ version: 1 });

            if (steps.length === 0) {
                return;
            }

            socket.emit('receive-steps', {
                steps: steps.map((step) => step.step),
                version: steps[steps.length - 1].version, // I have the feeling this is wrong! But it should not have an impact?
                clientIDs: steps.map((step) => step.clientID),
            });
        } catch (error) {
            console.error('Error getting steps:', error);
            socket.emit('error', 'Internal server error');
        }
    });
}