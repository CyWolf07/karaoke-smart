import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ks.nickname';

/** Misma regla que nicknameSchema de @ks/validation: 1 a 30 caracteres tras recortar. */
export function validateNickname(raw: string): string | null {
  const v = raw.trim();
  return v.length >= 1 && v.length <= 30 ? v : null;
}

export const loadNickname = async (): Promise<string> =>
  (await AsyncStorage.getItem(KEY).catch(() => null)) ?? '';

export const saveNickname = (v: string): Promise<void> => AsyncStorage.setItem(KEY, v);
