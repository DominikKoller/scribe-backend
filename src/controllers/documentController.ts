// backend/src/controllers/documentController.ts

import { Request, Response } from 'express';
import DocumentModel, { IDocument } from '../models/Document';
import * as Y from 'yjs';
import { IUser } from '../models/User';


export async function createDefaultDocument(user: IUser, title: string): Promise<IDocument> {
    // TODO low prio
    // We construct a default document here
    // Instead, we should have some default stored in the database and fall back on an empty document
    /*
    <paragraph><italic>Start writing your application here! Once you have a first draft, or whenever you want feedback on your writing, press the MAGIC icon above!</italic></paragraph>
    */
    const ydoc = new Y.Doc();

    const yXmlFragment = ydoc.getXmlFragment('default');

    const paragraph = new Y.XmlElement('paragraph');
    const textNode = new Y.XmlText();
    const stringToInsert = 'Start writing your college application cover letter here! Once you have a first draft, or whenever you want feedback on your writing, press the MAGIC button above!'

    textNode.insert(
        0,
        stringToInsert + ' ' // space at the end so the end is not italicized and colored
    );

    textNode.format(0, stringToInsert.length, { italic: {} }); // for some reason textNode.length is 0
    textNode.format(0, stringToInsert.length, {
        'textStyle': {
            color: '#958DF1'
        }
    });

    paragraph.push([textNode]);
    const secondEmptyParagraph = new Y.XmlElement('paragraph');

    yXmlFragment.push([paragraph, secondEmptyParagraph]);

    // add title to ydoc
    const nameElement = ydoc.getText('name');
    nameElement.insert(0, title);

    const content = Y.encodeStateAsUpdate(ydoc);
    // the title is doubled in the data:
    // once in the ydoc for syncing, and once in the document model for querying
    // hocuspocus is responsible for syncing the title between the two

    const document = new DocumentModel({
        title,
        content: Buffer.from(content),
        owner: user.id,
        users: [user.id],
    });

    return await document.save();
}