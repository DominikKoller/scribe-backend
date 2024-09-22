// backend/src/utils/schema.ts

// This is synchronized with the frontend schema in frontend/src/lib/schema.ts
// ALL CHANGES MUST BE MADE IN BOTH FILES.

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
  attrs: { id: {}, text: {} },
  inclusive: false,
  parseDOM: [
    {
      tag: 'span[data-comment-id]',
      getAttrs(dom: HTMLElement) {
        return {
          id: dom.getAttribute('data-comment-id'),
          text: dom.getAttribute('data-comment-text'),
        };
      },
    },
  ],
  toDOM(mark) {
    return [
      'span',
      {
        'data-comment-id': mark.attrs.id,
        'data-comment-text': mark.attrs.text,
        class: 'comment',
      },
      0,
    ];
  },
};

const nodes = {
  ...basicNodes,
  ordered_list: orderedList,
  bullet_list: bulletList,
  list_item: listItem,
  blockquote: basicNodes.blockquote,
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