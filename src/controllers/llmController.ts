// controllers/llmController.ts

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';
import hocuspocusServer from '../hocuspocusServer';
import * as Y from 'yjs';
import { ExternalAPICallModel } from '../models/Logs';

// TODO this should be moved to a shared types file
// it is also on the frontend!
export interface CommentType {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  pending?: boolean;
}

export const runLLMOnDocument = async (documentId: string, userId: string) => {

  try {
    // Access Yjs document
    const context = { isFromServer: true };
    const connection = await hocuspocusServer.openDirectConnection(documentId, context);

    connection.context = connection.context || {};
    connection.context.isFromServer = true;

    await connection.transact(async (document) => {
      try {
        const tiptapYFragment = document.getXmlFragment('default');
        const commentsArray: Y.Array<CommentType> = document.getArray('comments')

        // example usage: add a comment to the first paragraph
        // addComment(tiptapYFragment, commentsArray, 0, "text", "author");

        const paragraphsWithIndices = getAllParagraphTexts(tiptapYFragment).map((text, index) => ({ index, text }));

        // Prepare the prompt
        const messages: ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content:
              `You are a mentor who helps students write their university application letters for UK elite universities. You are giving feedback on a student's draft. The letter the student is writing should be structured in the following way:
              
A) Introduction: The first sentence should be _very_ engaging and memorable. It should most of all give a sense of the student's personality. The introduction should give the reader a sense of what this essay is going to talk about. Think: "Here is what I am going to tell you in this essay" 
B) The main part should be structured into paragraphs. Each paragraph should talk about one specific aspect of the student's life, personality, achievements or interests. Every paragraph should follow the structure: "Here is what I did, here is what I learned from it, here is how that makes me a great candidate for the course I am applying to". The paragraphs should tie together well, and each paragraph must make the essential connection between the student and the course they are applying to.
C) The conclusion should summarise what this essay has been about. There should be no more important concepts introduced in the conclusion. It should serve as the one thing the reader should take away from the statement. Think: "Here is what I told you in this essay"
          
You should give feedback in three stages:

1) If the student is just starting out on their draft, you should give them general advice on how to structure their letter and what to include. You may give them advice on the structure outlined above.
2) If the student has a draft, you should give them feedback on the individual paragraphs, how to improve them, how to adhere to the structure better. You can suggest to add paragraphs, or to remove them, or anything that will help the student write a better essay.
3) If the student is close to a final draft, you should give let them know whether this essay is likely to give them an advantage in their application or whether they need to focus on more improvements. Tell the student what they did well, and offer incremental improvements where necessary.


In any stage of your feedback, it is very important that you encourage the student. Make sure to praise the things they did well, and offer feedback as a potential for improvement. Your feedback should however be concise and to the point. You will be given a list of paragraphs, and you can add a comment to each paragraph of the student's current draft. You should also add one overall comment on the document.`,
          },
          {
            role: 'user',
            content: `Here is the student's current draft split into paragraphs. Each paragraph has an index number.\n\n${paragraphsWithIndices
              .map((p) => `${p.index}: ${p.text}`)
              .join('\n')}\n\nHelp the student improve this application letter.\n\nUse 'add_comment_on_whole_document' to add one overall comment on the document. Use the 'add_comments' tool to add your comments to specific paragraphs, referring to them by their index number.`,
          },
        ];

        // Define the tool
        const tools: ChatCompletionTool[] = [
          {
            type: 'function',
            function: {
              name: 'add_comment_on_whole_document',
              strict: true,
              description: 'Adds a comment on the whole document. This is meant for feedback on the document as a whole.',
              parameters: {
                type: 'object',
                properties: {
                  comment_text: {
                    type: 'string',
                    description: 'The text of the comment.',
                  },
                },
                required: ['comment_text'],
                additionalProperties: false,
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'add_comments',
              strict: true,
              description: 'Adds comments to the specified paragraphs in the document.',
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
                      additionalProperties: false,
                    },
                  },
                },
                required: ['comments'],
                additionalProperties: false,
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
          model: 'gpt-4o',
          messages,
          tools,
          tool_choice: 'auto',
        });

        console.log('OpenAI response:', response);
        console.log("MESSAGE: ", JSON.stringify(response.choices[0].message, null, 2));

        const log = new ExternalAPICallModel({
          userId,
          apiName: 'OPENAI_COMPLETION',
          content: JSON.stringify({ model: 'gpt-4o', messages, tools, tool_choice: 'auto' }),
          response: JSON.stringify(response),
        });
        await log.save();

        const message = response.choices[0].message;

        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            const toolType = toolCall.type;
            if (toolType === 'function') {
              const functionName = toolCall.function.name;
              const functionArguments = JSON.parse(toolCall.function.arguments);

              if (functionName === 'add_comments') {
                addComments(tiptapYFragment, commentsArray, functionArguments.comments);
              }
              else if (functionName === 'add_comment_on_whole_document') {
                addCommentOnWholeDocument(tiptapYFragment, functionArguments.comment_text);
              }
              else {
                console.warn('Unknown function name:', functionName);
              }
            }
          }
        }
        else {
          console.warn('No tool calls in response');
        }
      } catch (error) {
        console.error('Error in runLLMOnDocument:', error);
      }
    });

    await connection.disconnect();

    return true;
  } catch (error) {
    console.error('Error in runLLMOnDocument:', error);
    return false;
  }
}

function addComments(
  tiptapYFragment: Y.XmlFragment,
  commentsArray: Y.Array<CommentType>,
  comments: { paragraph_index: number, comment_text: string }[]
) {
  for (const comment of comments) {
    addComment(tiptapYFragment, commentsArray, comment.paragraph_index, comment.comment_text, 'Scribe');
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

// just adds an italic text to the end of the document, which serves as a an overall 'comment'
// Has nothing to do with the comment marks or the comments array
function addCommentOnWholeDocument(tiptapYFragment: Y.XmlFragment, commentText: string) {
  // add new paragraph to tiptapYFragment
  // with a <span style="color: #958DF1"></span> tag too
  const paragraph = new Y.XmlElement('paragraph');
  const textNode = new Y.XmlText();
  textNode.insert(0, commentText);

  textNode.format(0, commentText.length, { italic: {} });
  textNode.format(0, commentText.length, {
    'textStyle': {
      color: '#958DF1'
    }
  });
  

  paragraph.push([textNode]);
  tiptapYFragment.push([paragraph]);
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