import { createApiClient } from '@ks/api-client';
import Constants from 'expo-constants';

// 10.0.2.2 = localhost del PC visto desde el emulador Android. En un celular físico,
// cambiar extra.apiUrl en app.json por la IP LAN del PC o la URL pública (ver docs/10).
export const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://10.0.2.2:3000';
export const api = createApiClient({ baseUrl: API_URL });
