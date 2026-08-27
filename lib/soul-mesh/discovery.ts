export type SoulMeshPeer = { nucleus: 'N01'|'N02'|'N03'|'N04'|'N05'|'N06'; url: string; capabilities: string[]; lastSeen: number };

export const N04_CAPABILITIES = [
  'ai-pilot','tool-execution','artifact-processing','document-processing','context-orchestration','streaming','mesh-communication',
  'batch.process','document.create','document.edit','artifact.analyze','tool.run','workflow.execute','schedule.task','parallel.map',
];

export function getStaticSoulMeshPeers(): SoulMeshPeer[] {
  return (process.env.SOUL_MESH_PEERS ?? '').split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [nucleus, url] = entry.split('|');
    return nucleus && url ? { nucleus: nucleus as SoulMeshPeer['nucleus'], url, capabilities: [], lastSeen: Date.now() } : null;
  }).filter(Boolean) as SoulMeshPeer[];
}

export async function registerWithN01(registration: Omit<SoulMeshPeer, 'lastSeen'|'nucleus'> & { nucleus: 'N04' }): Promise<boolean> {
  const base = process.env.SOUL_MESH_N01_URL ?? process.env.SOUL_N01_URL;
  if (!base) return false;
  const response = await fetch(`${base.replace(/\/$/, '')}/soul-mesh/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...registration, capabilities: registration.capabilities.length ? registration.capabilities : N04_CAPABILITIES, lastSeen: Date.now() }),
  });
  return response.ok;
}

export async function registerN04AtBoot(url = process.env.SOUL_MESH_N01_URL ?? process.env.SOUL_N01_URL): Promise<boolean> {
  if (!url) return false;
  return registerWithN01({ nucleus: 'N04', url: process.env.SOUL_MESH_N04_URL ?? '', capabilities: N04_CAPABILITIES, lastSeen: Date.now() });
}
