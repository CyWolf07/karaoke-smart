import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { slugify } from '@ks/business-logic';
import type { AuthResponse, OrganizationDto, Role } from '@ks/shared-types';
import type { LoginInput, RegisterInput } from '@ks/validation';
import { Prisma, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '../config/env';
import { PrismaService } from '../database/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  typ: 'access';
}

const BCRYPT_ROUNDS = 12;
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Crea usuario + organización + membresía owner en una sola transacción. */
  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const baseSlug = slugify(input.organizationName) || 'org';
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const ownerRole = await tx.role.findUniqueOrThrow({ where: { key: 'owner' } });
        const slugTaken = await tx.organization.findUnique({ where: { slug: baseSlug } });
        const org = await tx.organization.create({
          data: {
            name: input.organizationName,
            slug: slugTaken ? `${baseSlug}-${randomBytes(3).toString('hex')}` : baseSlug,
          },
        });
        const created = await tx.user.create({
          data: { email: input.email, passwordHash, displayName: input.displayName },
        });
        await tx.membership.create({
          data: { organizationId: org.id, userId: created.id, roleId: ownerRole.id },
        });
        await tx.auditLog.create({
          data: {
            organizationId: org.id,
            userId: created.id,
            action: 'auth.register',
            ip: meta.ip,
          },
        });
        return created;
      });
      return this.issue(user, meta);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw e;
    }
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Comparación siempre ejecutada para no filtrar existencia de cuentas por tiempo de respuesta.
    const ok = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
    );
    if (!user || !ok || !user.isActive) {
      await this.prisma.auditLog.create({
        data: {
          action: 'auth.login_failed',
          userId: user?.id,
          ip: meta.ip,
          metadata: { email: input.email },
        },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    await this.prisma.auditLog.create({
      data: { action: 'auth.login', userId: user.id, ip: meta.ip },
    });
    return this.issue(user, meta);
  }

  /** Rotación de refresh token con detección de reutilización (revoca toda la familia). */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResponse> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Sesión expirada');
    }
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.prisma.auditLog.create({
        data: { action: 'auth.refresh_reuse_detected', userId: stored.userId, ip: meta.ip },
      });
      throw new UnauthorizedException('Sesión inválida');
    }
    // Revocación condicional: si dos peticiones compiten, solo una gana.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new UnauthorizedException('Sesión inválida');
    return this.issue(stored.user, meta, stored.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.jwt.verify<AccessTokenPayload>(token);
    if (payload.typ !== 'access') throw new UnauthorizedException();
    return payload;
  }

  async organizationsFor(userId: string): Promise<OrganizationDto[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role.key as Role,
    }));
  }

  private async issue(
    user: User,
    meta: RequestMeta,
    familyId: string = randomUUID(),
  ): Promise<AuthResponse> {
    const expiresIn = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, typ: 'access' } satisfies AccessTokenPayload,
      { expiresIn },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const days = this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + days * 86_400_000),
        userAgent: meta.userAgent?.slice(0, 255),
      },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      organizations: await this.organizationsFor(user.id),
    };
  }
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}
