// controllers/llmController.ts

import { Request, Response } from 'express';
import DocumentModel from '../models/Document';
import { mySchema } from '../utils/schema'; // Ensure this matches your frontend schema
import { extractParagraphsWithPositions } from '../utils/documentUtils';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';

interface AuthRequest extends Request {
  user?: string;
}

export const runLLMOnDocument = async (req: AuthRequest, res: Response) => {

  throw new Error('Not implemented');

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