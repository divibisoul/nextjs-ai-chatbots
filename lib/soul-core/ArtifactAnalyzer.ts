/**
 * Standalone N04 artifact analyzer.
 *
 * The implementation mirrors the deterministic metadata/hash contract already
 * present in N04CompositionRuntime. It intentionally analyzes only the payload
 * supplied by the caller and never claims external storage or semantic parsing.
 */
import { createHash } from 'node:crypto';

export async function analyzeArtifact(input: unknown): Promise<Record<string, unknown>> {
  if (!input || typeof input !== 'object') {
    throw new TypeError('N04_ARTIFACT_ANALYZE_INPUT_REQUIRED');
  }

  const artifact = input as Record<string, unknown>;
  const kind = typeof artifact.kind === 'string' ? artifact.kind.trim() : '';
  const filename = typeof artifact.filename === 'string' ? artifact.filename.trim() : '';
  const mimeType = typeof artifact.mimeType === 'string' ? artifact.mimeType.trim().toLowerCase() : '';
  const content = typeof artifact.content === 'string' ? artifact.content : '';
  const base64 = typeof artifact.base64 === 'string' ? artifact.base64.trim() : '';

  if (!kind && !filename && !mimeType && !content && !base64) {
    throw new Error('N04_ARTIFACT_EMPTY');
  }

  let bytes = 0;
  let encoding = 'none';
  let sha256 = '';

  if (content) {
    const raw = Buffer.from(content, 'utf8');
    bytes = raw.byteLength;
    encoding = 'utf8';
    sha256 = createHash('sha256').update(raw).digest('hex');
  } else if (base64) {
    const normalized = base64.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
      throw new Error('N04_ARTIFACT_INVALID_BASE64');
    }
    const raw = Buffer.from(normalized, 'base64');
    bytes = raw.byteLength;
    encoding = 'base64';
    sha256 = createHash('sha256').update(raw).digest('hex');
  }

  const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase() : '';
  const textLines = content ? content.split(/\r?\n/).length : 0;
  const words = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  return {
    analyzed: true,
    kind: kind || null,
    filename: filename || null,
    extension: extension || null,
    mimeType: mimeType || null,
    encoding,
    bytes,
    characters: content.length,
    lines: textLines,
    words,
    sha256: sha256 || null,
    hasBinaryPayload: Boolean(base64 && !content),
  };
}
