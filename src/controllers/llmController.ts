// controllers/llmController.ts

import { Request, Response } from 'express';
import DocumentModel from '../models/Document';
import { mySchema } from '../utils/schema'; // Ensure this matches your frontend schema
import { extractParagraphsWithPositions } from '../utils/documentUtils';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';
import hocuspocusServer from '../hocuspocusServer';
import * as Y from 'yjs';

interface AuthRequest extends Request {
  user?: string;
}

// TODO this should be moved to a shared types file
// it is also on the frontend!
export interface CommentType {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  pending?: boolean;
}

export const runLLMOnDocument = async (req: AuthRequest, res: Response) => {

  try {
    const documentId = req.params.id;

    // Access Yjs document
    const context = { isFromServer: true};
    const connection = await hocuspocusServer.openDirectConnection(documentId, context);

    connection.context = connection.context || {};
    connection.context.isFromServer = true;

    await connection.transact((document) => {
      const tiptapYFragment = document.getXmlFragment('default');
      const commentsArray: Y.Array<CommentType> = document.getArray('comments')

      // example usage: add a comment to the first paragraph
      addComment(tiptapYFragment, commentsArray, 0, "hon hon bonjour", "skynet");

      console.log(tiptapYFragment.toString());
    });

    await connection.disconnect();

    res.status(200).json({ message: 'Server-side changes made to document' });
  } catch (error) {
    console.error('Error in runLLMOnDocument:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

function addComment(
  tiptapYFragment: Y.XmlFragment,
  commentsArray: Y.Array<CommentType>,
  paragraphIndex: number,
  commentText: string,
  author: string
) {
  // Generate a unique comment ID
  const commentId = uuidv4();

  // Create the comment object
  const comment: CommentType = {
    id: commentId,
    text: commentText,
    author: author,
    timestamp: Date.now(),
  };

  // Add the comment to the comments array
  commentsArray.push([comment]);

  // Apply the comment mark to the paragraph
  addCommentMarkToParagraph(tiptapYFragment, paragraphIndex, commentId);
}

// TODO this is probably inefficient
// knowing the document structure, we could for sure do this more efficiently
function getAllParagraphNodes(node: Y.XmlElement | Y.XmlFragment): Y.XmlElement[] {
  let paragraphs: Y.XmlElement[] = [];

  for (const child of node.toArray()) {
    if (child instanceof Y.XmlElement) {
      if (child.nodeName === 'paragraph') {
        paragraphs.push(child);
      }
      // Recursively search for paragraphs in child nodes
      paragraphs = paragraphs.concat(getAllParagraphNodes(child));
    }
  }
  return paragraphs;
}

function getAllParagraphTexts(tiptapYFragment: Y.XmlFragment): string[] {
  const paragraphs = getAllParagraphNodes(tiptapYFragment);
  return paragraphs.map(paragraph => getTextContent(paragraph));
}

// Helper function remains the same
function getTextContent(node: Y.XmlElement | Y.XmlFragment): string {
  let textContent = '';

  for (const child of node.toArray()) {
    if (child instanceof Y.XmlText) {
      textContent += child.toString();
    } else if (child instanceof Y.XmlElement || child instanceof Y.XmlFragment) {
      textContent += getTextContent(child);
    }
  }

  return textContent;
}

function addCommentMarkToParagraph(tiptapYFragment: Y.XmlFragment, paragraphIndex: number, commentId: string) {
  // Get all paragraph nodes in the document, regardless of their depth
  const paragraphs = getAllParagraphNodes(tiptapYFragment);

  // Get the paragraph at the specified index
  const paragraph = paragraphs[paragraphIndex];

  // Check if the paragraph exists
  if (!paragraph) {
    throw new Error(`Paragraph at index ${paragraphIndex} not found.`);
  }

  // Apply the comment mark to all text nodes within the paragraph
  formatTextNodesInElement(paragraph, { comment: { commentId: commentId } });
}

// Helper function to recursively format text nodes within an element
function formatTextNodesInElement(element: Y.XmlElement | Y.XmlFragment, attributes: Record<string, any>) {
  for (const node of element.toArray()) {
    if (node instanceof Y.XmlText) {
      node.format(0, node.length, attributes);
    } else if (node instanceof Y.XmlElement || node instanceof Y.XmlFragment) {
      formatTextNodesInElement(node, attributes);
    }
  }
}



/*
// OLD CODE
try {
  const documentId = req.params.id;

  // Fetch the document
  const document = await DocumentModel.findOne({
    _id: documentId,
    owner: req.user,
  });

  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }

  // Parse the document content
  const docJSON = document.content.doc;
  console.log('document:', document);
  const doc = mySchema.nodeFromJSON(docJSON);

  // Extract paragraphs and positions
  const paragraphs = extractParagraphsWithPositions(doc);

  // Prepare the prompt
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant that reads a document and adds comments on things you like and things you think should be improved.',
    },
    {
      role: 'user',
      content: `Here is the document split into paragraphs. Each paragraph has an index number.\n\n${paragraphs
        .map((p) => `${p.index}: ${p.text}`)
        .join('\n')}\n\nPlease comment on all things you like, and on all things you think should be improved.\n\nUse the 'add_comments' tool to add your comments to specific paragraphs, referring to them by their index number.`,
    },
  ];

  // Define the tool
  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'add_comments',
        description:
          'Adds comments to the specified paragraphs in the document.',
        parameters: {
          type: 'object',
          properties: {
            comments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  paragraph_index: {
                    type: 'integer',
                    description:
                      'The index number of the paragraph to add the comment to.',
                  },
                  comment_text: {
                    type: 'string',
                    description: 'The text of the comment.',
                  },
                },
                required: ['paragraph_index', 'comment_text'],
              },
            },
          },
          required: ['comments'],
        },
      },
    },
  ];

  // OpenAI API setup
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Call the OpenAI API
  const response = await openai.chat.completions.create({
    model: 'gpt-4-0613',
    messages,
    tools,
    tool_choice: 'auto',
  });

  const message = response.choices[0].message;

  // Handle tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      const toolType = toolCall.type;
      if (toolType === 'function') {
        const functionName = toolCall.function.name;
        const functionArguments = JSON.parse(toolCall.function.arguments);

        if (functionName === 'add_comments') {
          const commentsToAdd = functionArguments.comments;
          for (const comment of commentsToAdd) {
            const paragraphIndex = comment.paragraph_index;
            const commentText = comment.comment_text;

            const paragraph = paragraphs.find(
              (p) => p.index === paragraphIndex
            );
            if (paragraph) {
              const { from, to } = paragraph;
              const commentId = uuidv4();

              const newComment = {
                id: commentId,
                from,
                to,
                text: commentText,
              };

              document.content.comments.push(newComment);
            }
          }
        } else {
          console.warn('Unknown function name:', functionName);
        }
      }
    }

    // Save the updated document
    await document.save();

    // Return the updated comments
    res.json({ success: true, comments: document.content.comments });
  } else {
    res.status(400).json({ error: 'No tool calls in response' });
  }
} catch (error) {
  console.error('Error in runLLMOnDocument:', error);
  res.status(500).json({ message: 'Internal Server Error' });
}
};

*/