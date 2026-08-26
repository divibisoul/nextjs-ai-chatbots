import { getWeatherData, type WeatherInput } from '@/lib/ai/tools/get-weather';

export type Nucleus02MeshHandler = (payload: unknown) => Promise<unknown> | unknown;

export const NUCLEUS_02_MESH_HANDLERS: Record<string, Nucleus02MeshHandler> = {
  'weather.current': async (payload) => getWeatherData(payload as WeatherInput),
};
