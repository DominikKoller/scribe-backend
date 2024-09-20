// backend/src/socketHandlers/collabHandler.ts

import { Server, Socket } from 'socket.io';
import DocumentModel from '../models/Document';
import StepModel from '../models/Step';
import { Step } from 'prosemirror-transform';
import { EditorState } from 'prosemirror-state';
import { schema } from 'prosemirror-schema-basic';
import jwt from 'jsonwebtoken';

// TODO: can we not use middleware for Auth instead?
interface AuthSocket extends Socket {
    user?: string;
}

export function collabHandler(io: Server, socket: AuthSocket) {
    // Handle joining a document room
    socket.on('join-document', async ({ documentId, token }) => {
        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || '');
            socket.user = decoded.id;

            // check if the document exists and the user has access
            const document = await DocumentModel.findById(documentId);
            if (!document) {
                socket.emit('error', 'Document not found');
                return;
            }
            // TODO check if the user has access to the document !!!
            // but is this really the right place to do this? Should this not happen in middleware?
            // hm maybe not because the middleware would not have access to the document from the db?
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
        try {
            if (!socket.user) {
                socket.emit('error', 'Not authenticated');
                return;
            }

            const document = await DocumentModel.findById(documentId);
            if (!document) {
                socket.emit('error', 'Document not found');
                return;
            }

            if (version !== document.version) {
                socket.emit('version-mismatch', {
                    serverVersion: document.version,
                });
                return;
            }

            // apply steps to document
            const doc = schema.nodeFromJSON(document.content);
            let editorState = EditorState.create({ doc });

            let newSteps = steps.map((stepJSON: any) => Step.fromJSON(schema, stepJSON));

            let tr = editorState.tr;
            newSteps.forEach((step: Step) => {
                tr.step(step);
            });

            if (!tr.doc) {
                socket.emit('error', 'Invalid steps');
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

            await StepModel.insertMany(stepModels);

            // Update document content
            document.content = tr.doc.toJSON();
            document.version += newSteps.length;
            await document.save();

            // Broadcast new document state
            socket.to(documentId).emit('receive-steps', {
                steps: newSteps.map((step: Step) => step.toJSON()),
                version: document.version,
                clientID,
            });

            // Acknowledge the client
            socket.emit('acknowledge', {
                version: document.version,
            });
        } catch (error) {
            console.error('Error submitting steps:', error);
            socket.emit('error', 'Internal server error');
        }

    });

    socket.on('get-steps', async ({ documentId, fromVersion }) => {
        try {
            const steps = await StepModel.find({
                documentId,
                version: { $gte: fromVersion },
            }).sort({ version: 1 });

            socket.emit('receive-steps', {
                steps: steps.map((step) => step.step),
                version: steps.length > 0 ? steps[steps.length - 1].version : fromVersion,
            });
        } catch (error) {
            console.error('Error getting steps:', error);
            socket.emit('error', 'Internal server error');
        }
    });
}