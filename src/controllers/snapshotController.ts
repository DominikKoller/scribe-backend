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

    // Function to extract paragraphs and comments with paragraph indices
    function extractParagraphsAndComments(node: Y.XmlElement | Y.XmlFragment): { paragraphs: string[], comments: { paragraph_index: number, comment_text: string }[] } {
        let paragraphs: string[] = [];
        let comments: { paragraph_index: number, comment_text: string }[] = [];
        let currentParagraphIndex = -1;

        function traverse(node: Y.XmlElement | Y.XmlFragment) {
            for (const child of node.toArray()) {
                if (child instanceof Y.XmlText) {
                    const delta = child.toDelta();
                    let paragraphContent = '';
                    for (const op of delta) {
                        const insertText = op.insert;

                        if (op.attributes && op.attributes.comment) {
                            const commentId = op.attributes.comment.commentId;
                            const commentText = commentsMap.get(commentId) || '';
                            comments.push({
                                paragraph_index: currentParagraphIndex,
                                comment_text: commentText
                            });
                        }

                        paragraphContent += insertText;
                    }

                    paragraphs.push(paragraphContent);
                    
                } else if (child instanceof Y.XmlElement || child instanceof Y.XmlFragment) {
                    if (child.nodeName === 'paragraph') {
                        currentParagraphIndex++;
                    }
                    traverse(child);
                }
            }
        }

        traverse(node);

        return { paragraphs, comments };
    }

    const { paragraphs, comments } = extractParagraphsAndComments(yXmlFragment);

    const snapshot = new DocumentSnapshotModel({
        documentId: document._id,
        title: document.title,
        paragraphs: paragraphs, // paragraphs array
        comments: comments, // comments with paragraph indices
    });
    await snapshot.save();
}
