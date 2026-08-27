export const N04_IN = ['/mesh/in/N01','/mesh/in/N02','/mesh/in/N03','/mesh/in/N05','/mesh/in/N06'] as const;
export const N04_OUT = ['N01','N02','N03','N05','N06'] as const;

export type N04Peer = typeof N04_OUT[number];
export type N04Channel = { peer: N04Peer; input: `/mesh/in/${N04Peer}`; output: N04Peer };
export const N04_CHANNELS: readonly N04Channel[] = N04_OUT.map((peer) => ({ peer, input: `/mesh/in/${peer}`, output: peer })) as readonly N04Channel[];
