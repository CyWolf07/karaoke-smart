/**
 * Pruebas de integración contra PostgreSQL y Redis REALES (docker compose up -d).
 * Sin simulaciones: cada prueba ejercita la API completa por HTTP y Socket.IO.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { io } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('API (integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `test-${Date.now()}@karaoke.test`;
  const password = 'ClaveSegura123';

  beforeAll(async () => {
    execSync('pnpm prisma migrate deploy', { stdio: 'ignore', env: process.env });
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ bufferLogs: true });
    await configureApp(app);
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);
  }, 60_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@karaoke.test' } } });
    await prisma.organization.deleteMany({ where: { memberships: { none: {} } } });
    await app.close();
  });

  it('GET /v1/health reporta base de datos y Redis arriba', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.status).toBe('up');
    expect(res.body.checks.redis.status).toBe('up');
  });

  it('Swagger está publicado', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.paths['/v1/auth/login']).toBeDefined();
  });

  it('rechaza registro inválido con errores detallados', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email: 'no-es-email', password: 'corta', displayName: 'A', organizationName: 'B' })
      .expect(400);
    expect(res.body.message).toBe('Datos inválidos');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  let refreshToken = '';
  let accessToken = '';

  it('registro crea usuario, organización y membresía owner', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Ana', organizationName: 'Bar Prueba' })
      .expect(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.organizations[0].role).toBe('owner');
    expect(res.body.organizations[0].slug).toMatch(/^bar-prueba/);
  });

  it('correo duplicado devuelve 409', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Ana', organizationName: 'Otro' })
      .expect(409);
  });

  it('login con contraseña incorrecta devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'mala' })
      .expect(401);
  });

  it('login correcto + /me', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);
  });

  it('/me sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
  });

  it('refresh rota el token y detecta reutilización', async () => {
    const r1 = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(r1.body.refreshToken).not.toBe(refreshToken);
    // Reutilizar el token viejo revoca toda la familia...
    await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    // ...incluido el nuevo.
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: r1.body.refreshToken })
      .expect(401);
  });

  it('aislamiento: no se accede a organizaciones ajenas', async () => {
    const other = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `otro-${Date.now()}@karaoke.test`,
        password,
        displayName: 'Beto',
        organizationName: 'Ajena',
      })
      .expect(201);
    const foreignOrg = other.body.organizations[0].id;
    await request(app.getHttpServer())
      .get(`/v1/organizations/${foreignOrg}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    const own = await request(app.getHttpServer())
      .get('/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(own.body).toHaveLength(1);
  });

  it('Socket.IO: rechaza sin token y sincroniza reloj con token', async () => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    const url = `http://localhost:${port}/realtime`;

    const anon = io(url, { transports: ['websocket'], auth: {} });
    await new Promise<void>((resolve) => anon.on('disconnect', () => resolve()));
    anon.close();

    const sock = io(url, { transports: ['websocket'], auth: { token: accessToken } });
    await new Promise<void>((resolve, reject) => {
      sock.on('connect', () => resolve());
      sock.on('connect_error', reject);
    });
    const r = await sock.timeout(3000).emitWithAck('clock:sync');
    expect(Math.abs(r.serverTime - Date.now())).toBeLessThan(2000);
    sock.close();
  });
});
