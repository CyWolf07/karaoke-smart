import { nicknameSchema } from '@ks/validation';

const KEY = 'ks.nickname';

type Result = { ok: true; value: string } | { ok: false; error: string };

/** Valida y normaliza un apodo. */
export function validateNickname(raw: string): Result {
  const r = nicknameSchema.safeParse(raw);
  return r.success
    ? { ok: true, value: r.data }
    : { ok: false, error: 'Escribe entre 1 y 30 caracteres' };
}

export function loadNickname(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(v: string): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Almacenamiento bloqueado: el apodo solo vive en esta pestaña.
  }
}
