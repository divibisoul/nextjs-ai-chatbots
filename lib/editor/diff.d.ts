import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

export declare const DiffType: {
  readonly Unchanged: 0;
  readonly Deleted: -1;
  readonly Inserted: 1;
};
export declare function patchDocumentNode(schema: Schema, oldNode: ProseMirrorNode, newNode: ProseMirrorNode): ProseMirrorNode;
export declare function patchTextNodes(schema: Schema, oldNode: readonly ProseMirrorNode[], newNode: readonly ProseMirrorNode[]): ProseMirrorNode[];
export declare function diffEditor(schema: Schema, oldDoc: unknown, newDoc: unknown): ProseMirrorNode;
export declare function computeChildEqualityFactor(node1: unknown, node2: unknown): number;
export declare function assertNodeTypeEqual(node1: unknown, node2: unknown): void;
export declare function ensureArray<T>(value: T | T[]): T[];
export declare function isNodeEqual(node1: unknown, node2: unknown): boolean;
export declare function normalizeNodeContent(node: unknown): unknown[];
export declare function getNodeProperty(node: unknown, property: string): unknown;
export declare function getNodeAttribute(node: unknown, attribute: string): unknown;
export declare function getNodeAttributes(node: unknown): Record<string, unknown>;
export declare function getNodeMarks(node: unknown): unknown[];
export declare function getNodeChildren(node: unknown): unknown[];
export declare function getNodeText(node: unknown): string | undefined;
export declare function isTextNode(node: unknown): boolean;
export declare function matchNodeType(node1: unknown, node2: unknown): boolean;
export declare function createNewNode(oldNode: ProseMirrorNode, children: readonly ProseMirrorNode[]): ProseMirrorNode;
export declare function createDiffNode(schema: Schema, node: ProseMirrorNode, type: -1 | 1): ProseMirrorNode;
export declare function createDiffMark(schema: Schema, type: -1 | 1): unknown;
export declare function createTextNode(schema: Schema, content: string, marks?: readonly unknown[]): ProseMirrorNode;
