import { GraphQLError } from 'graphql';
import DocumentModel from '../models/Document';
import DocumentSnapshotModel from '../models/DocumentSnapshot';
import Y from 'yjs';

export async function createDocumentSnapshot(documentId: string) {

    const document = await DocumentModel.findById(documentId);

    if (!document) {
        throw new GraphQLError('Document not found', {
            extensions: {
                code: 'DOCUMENT_NOT_FOUND',
            },
        });
    }

    const contentBuffer = document.content;
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, contentBuffer);

    const yXmlFragment = ydoc.getXmlFragment('default');
    const commentsArray = ydoc.getArray<any>('comments'); // Adjusted type

    // Build a map from commentId to comment text
    const commentsMap = new Map<string, string>();
    for (const comment of commentsArray.toArray()) {
        commentsMap.set(comment.id, comment.text);
    }

    // Function to extract text content and comment positions
    function extractTextAndComments(node: Y.XmlElement | Y.XmlFragment): { textContent: string, comments: { position: { start: number, end: number }, text: string }[] } {
        let textContent = '';
        let comments: { position: { start: number, end: number }, text: string }[] = [];
        let currentPosition = 0;

        function traverse(node: Y.XmlElement | Y.XmlFragment) {
            for (const child of node.toArray()) {
                if (child instanceof Y.XmlText) {
                    const delta = child.toDelta();
                    for (const op of delta) {
                        const insertText = op.insert;
                        const length = insertText.length;

                        if (op.attributes && op.attributes.comment) {
                            const commentId = op.attributes.comment.commentId;
                            const commentText = commentsMap.get(commentId) || '';
                            comments.push({
                                position: {
                                    start: currentPosition,
                                    end: currentPosition + length
                                },
                                text: commentText
                            });
                        }

                        textContent += insertText;
                        currentPosition += length;
                    }
                } else if (child instanceof Y.XmlElement || child instanceof Y.XmlFragment) {
                    traverse(child);
                }
            }
        }

        traverse(node);

        return { textContent, comments };
    }

    const { textContent, comments } = extractTextAndComments(yXmlFragment);

    console.log("NEW SNAPSHOT: ", textContent, comments);

    /*

    const snapshot = new DocumentSnapshotModel({
        documentId: document._id,
        title: document.title,
        documentContent: textContent,
        comments,
    });

    await snapshot.save();

    */
}