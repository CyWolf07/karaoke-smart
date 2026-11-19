import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
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
  // La raíz no es una página: se redirige a la documentación interactiva.
  app
    .getHttpAdapter()
    .get('/', (_req: unknown, res: { redirect: (url: string) => void }) => res.redirect('/docs'));
}
