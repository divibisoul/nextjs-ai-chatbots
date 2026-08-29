import type { Node, Schema } from 'prosemirror-model';

export declare const DiffType: {
  readonly Unchanged: 0;
  readonly Deleted: -1;
  readonly Inserted: 1;
};

export declare function diffEditor(
  schema: Schema,
  oldDoc: unknown,
  newDoc: unknown,
): Node;

export declare function patchDocumentNode(
  schema: Schema,
  oldNode: Node,
  newNode: Node,
): Node;

export declare function patchTextNodes(
  schema: Schema,
  oldNode: Node[],
  newNode: Node[],
): Node[];
