// src/lib/schema.ts

// copied from the frontend!
// must be kept in sync with the frontend schema

import { Schema } from 'prosemirror-model';
import { nodes as basicNodes, marks as basicMarks } from 'prosemirror-schema-basic';
import { orderedList, bulletList, listItem } from 'prosemirror-schema-list';
import { type MarkSpec } from 'prosemirror-model';

const underline: MarkSpec = {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM() {
      return ['u', 0];
    },
  };

  const comment: MarkSpec = {
    attrs: { id: {} },
    inclusive: false,
    parseDOM: [
      {
        tag: 'span[data-comment-id]',
        getAttrs(dom: HTMLElement) {
          return { id: dom.getAttribute('data-comment-id') };
        },
      },
    ],
    toDOM(mark) {
      return ['span', { 'data-comment-id': mark.attrs.id, class: 'comment' }, 0];
    },
  };

const nodes = {
  ...basicNodes,
  // Add list nodes
  ordered_list: orderedList,
  bullet_list: bulletList,
  list_item: listItem,
  // Optionally, add blockquote
  blockquote: basicNodes.blockquote,
  // Add support for code blocks
  code_block: basicNodes.code_block,
};

const marks = {
    ...basicMarks,
    underline,
    comment,
  };
  
  export const mySchema = new Schema({
    nodes,
    marks,
  });