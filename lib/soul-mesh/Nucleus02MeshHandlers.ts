import { getWeatherData, type WeatherInput } from '@/lib/ai/tools/get-weather';

export type Nucleus02MeshHandler = (payload: unknown) => Promise<unknown> | unknown;

export const NUCLEUS_02_MESH_HANDLERS: Record<string, Nucleus02MeshHandler> = {
  getWeather: async (payload) => getWeatherData(payload as WeatherInput),
  'mesh.health': () => ({ nucleus: 'N02', status: 'ready', transport: 'hybrid' }),
  'mesh.handshake': (payload) => ({ nucleus: 'N02', connected: true, peer: (payload as { source?: string })?.source ?? null }),
  'mesh.capabilities': () => ({ nucleus: 'N02', capabilities: Object.keys(NUCLEUS_02_MESH_HANDLERS) }),
};
