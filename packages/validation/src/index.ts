import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(10, 'Mínimo 10 caracteres')
  .max(128)
  .regex(/[A-Za-z]/, 'Debe incluir letras')
  .regex(/[0-9]/, 'Debe incluir números');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(60),
  organizationName: z.string().trim().min(2).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(512) });
export type RefreshInput = z.infer<typeof refreshSchema>;

export const nicknameSchema = z.string().trim().min(1).max(30);

/** Alfabeto de códigos de sala: sin caracteres ambiguos (0/O, 1/I/L). */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;
export const joinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`), 'Código inválido');

export const createRoomSchema = z.object({ name: z.string().trim().min(2).max(60) });
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({ code: joinCodeSchema, nickname: nicknameSchema });
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

/**
 * Código de sala a partir de lo que lea el escáner: la URL del QR (…/join?code=XXXXXX)
 * o el código suelto. Devuelve null si no es un código válido.
 */
export function parseJoinCode(scanned: string): string | null {
  const raw = scanned.trim();
  let candidate = raw;
  const m = raw.match(/[?&]code=([^&#\s]+)/i);
  if (m) candidate = decodeURIComponent(m[1]);
  const r = joinCodeSchema.safeParse(candidate);
  return r.success ? r.data : null;
}

/** ID de vídeo de YouTube (11 caracteres). */
export const youtubeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'Vídeo de YouTube inválido');
export const addToQueueSchema = z.object({ videoId: youtubeIdSchema });
export type AddToQueueInput = z.infer<typeof addToQueueSchema>;
export const advanceQueueSchema = z.object({ fromItemId: z.string().uuid().nullable().optional() });
export type AdvanceQueueInput = z.infer<typeof advanceQueueSchema>;

/** Extrae el ID de un enlace de YouTube (watch, youtu.be, shorts, embed, music) o de un ID suelto. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

export { z };
