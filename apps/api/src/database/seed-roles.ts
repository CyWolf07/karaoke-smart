import { PrismaClient, RoleKey } from '@prisma/client';

/** Datos de referencia obligatorios: catálogo de roles y permisos. Idempotente. */
export const ROLE_DEFINITIONS: { key: RoleKey; description: string; permissions: string[] }[] = [
  { key: 'owner', description: 'Propietario de la organización', permissions: ['*'] },
  {
    key: 'admin',
    description: 'Administrador',
    permissions: [
      'org:read',
      'org:update',
      'members:manage',
      'rooms:manage',
      'providers:manage',
      'audio:manage',
    ],
  },
  {
    key: 'host',
    description: 'Anfitrión de sala',
    permissions: ['org:read', 'rooms:manage', 'queue:manage', 'playback:control', 'audio:manage'],
  },
  { key: 'participant', description: 'Participante', permissions: ['queue:add', 'audio:publish'] },
];

export async function seedRoles(prisma: PrismaClient) {
  for (const r of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { key: r.key },
      update: { description: r.description, permissions: r.permissions },
      create: r,
    });
  }
}
