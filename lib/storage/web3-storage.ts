const API_BASE = 'https://api.web3.storage';
const GATEWAY_BASE = 'https://w3s.link/ipfs';

function token(): string {
  return (process.env.WEB3_STORAGE_TOKEN || '').trim();
}

export async function uploadFile(file: Blob, filename = 'upload.bin'): Promise<string> {
  const auth = token();
  if (!auth) throw new Error('WEB3_STORAGE_TOKEN_REQUIRED');
  const form = new FormData();
  form.append('file', file, filename);
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}` },
    body: form,
  });
  if (!response.ok) throw new Error(`WEB3_STORAGE_UPLOAD_${response.status}`);
  const body = await response.json() as { cid?: string };
  if (!body.cid) throw new Error('WEB3_STORAGE_CID_MISSING');
  return body.cid;
}

export async function getFile(cid: string): Promise<Response> {
  const normalized = cid.trim();
  if (!normalized) throw new Error('WEB3_STORAGE_CID_REQUIRED');
  return fetch(`${GATEWAY_BASE}/${encodeURIComponent(normalized)}`);
}
