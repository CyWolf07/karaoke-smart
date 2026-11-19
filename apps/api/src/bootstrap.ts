import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import type { Env } from './config/env';
import { RedisIoAdapter } from './realtime/realtime.gateway';

/** Configuración común a main.ts y a las pruebas de integración. */
export async function configureApp(app: INestApplication): Promise<void> {
  const config = app.get(ConfigService<Env, true>);
  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((s) => s.trim());

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({ origin: origins, credentials: true });
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  const io = new RedisIoAdapter(app, origins);
  await io.connect(config.get('REDIS_URL', { infer: true }));
  app.useWebSocketAdapter(io);

  const doc = new DocumentBuilder()
    .setTitle('Karaoke Smart API')
    .setDescription('API REST v1. Eventos en tiempo real: namespace Socket.IO /realtime.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));
  serveWebApp(app);
}

/**
 * Si existe el build de apps/web, la API lo sirve en el mismo dominio: la raíz abre la
 * interfaz del karaoke y cualquier ruta que no sea /v1, /docs o /socket.io devuelve
 * index.html (rutas del SPA). Sin build, la raíz redirige a /docs.
 */
function serveWebApp(app: INestApplication): void {
  const dist = process.env.WEB_DIST_DIR ?? join(__dirname, '..', '..', 'web', 'dist');
  const http = app.getHttpAdapter();
  if (!existsSync(join(dist, 'index.html'))) {
    http.get('/', (_req: Request, res: Response) => res.redirect('/docs'));
    return;
  }
  (app as NestExpressApplication).useStaticAssets(dist, { index: false, maxAge: '1h' });
  const reserved = /^\/(v\d+|docs|socket\.io)(\/|$)/;
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || reserved.test(req.path) || !req.accepts('html')) return next();
    res.sendFile(join(dist, 'index.html'));
  });
}
