// backend/utils/documentUtils.ts

import { Node as PMNode } from 'prosemirror-model';

export function extractParagraphsWithPositions(doc: PMNode) {
  let paragraphs: {
    index: number;
    text: string;
    from: number;
    to: number;
  }[] = [];
  let index = 0;

  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph') {
      const from = pos + 1; // Start position of the paragraph's content
      const to = from + node.content.size;
      const text = node.textContent;

      paragraphs.push({
        index,
        text,
        from,
        to,
      });

      index++;
    }
  });

  return paragraphs;
}
