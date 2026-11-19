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

export { z };
