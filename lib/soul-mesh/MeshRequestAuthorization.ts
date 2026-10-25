import type { SoulMeshMessage } from './SoulMeshProtocol';
import { verifySoulMeshRequest } from './SoulMeshHmac';

export type MeshAuthorization = 'hmac' | 'bearer' | 'unauthorized' | 'misconfigured';

/**
 * HMAC is the production message-authentication contract. A Bearer token may
 * add identity/session context, but must never downgrade a signed Mesh route
 * to an unsigned message when the HMAC configuration or headers are absent.
 */
export function authorizationState(
  request: Request,
  message: SoulMeshMessage,
): MeshAuthorization {
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  const production = process.env.NODE_ENV === 'production';

  if (production && (!secret || Buffer.byteLength(secret, 'utf8') < 32)) {
    return 'misconfigured';
  }

  if (secret) {
    const nonce = request.headers.get('x-soul-mesh-nonce')?.trim() ?? '';
    const signature = request.headers.get('x-soul-mesh-hmac')?.trim() ?? '';
    if (!nonce || !signature) return 'unauthorized';
    return verifySoulMeshRequest(message, secret, nonce, signature)
      ? 'hmac'
      : 'unauthorized';
  }

  // Bearer fallback remains only for explicitly non-production local/dev use.
  if (production) return 'misconfigured';
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (!token) return 'bearer';
  return request.headers.get('authorization') === `Bearer ${token}`
    ? 'bearer'
    : 'unauthorized';
}
