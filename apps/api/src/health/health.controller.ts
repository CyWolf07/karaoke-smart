import { Controller, Get, Inject, Module, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthResponse } from '@ks/shared-types';
import type { Response } from 'express';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { REDIS } from '../redis/redis.module';

@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Comprueba conexiones reales a PostgreSQL y Redis. Devuelve 503 si alguna falla. */
  @Get()
  @ApiOkResponse({ description: 'Estado de dependencias' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const checks: HealthResponse['checks'] = {};
    await Promise.all([
      this.prisma.$queryRaw`SELECT 1`
        .then(() => (checks.database = { status: 'up' }))
        .catch((e: Error) => (checks.database = { status: 'down', error: e.message })),
      this.redis
        .ping()
        .then(() => (checks.redis = { status: 'up' }))
        .catch((e: Error) => (checks.redis = { status: 'down', error: e.message })),
    ]);
    const ok = Object.values(checks).every((c) => c.status === 'up');
    if (!ok) res.status(503);
    return {
      status: ok ? 'ok' : 'error',
      checks,
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
