import { Queue, Worker } from 'bullmq';
import pino from 'pino';
import { Pool } from 'pg';
import { z } from 'zod';
import { purgeRefreshTokens } from './jobs';

const env = z
  .object({
    REDIS_URL: z.string().url().default('redis://localhost:6380'),
    DATABASE_URL: z.string().url().default('postgresql://karaoke:karaoke@localhost:5434/karaoke'),
    LOG_LEVEL: z.string().default('info'),
  })
  .parse(process.env);

const log = pino({ level: env.LOG_LEVEL });
const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  maxRetriesPerRequest: null,
};
const db = new Pool({ connectionString: env.DATABASE_URL, max: 5 });

export const MAINTENANCE_QUEUE = 'maintenance';

async function main(): Promise<void> {
  const queue = new Queue(MAINTENANCE_QUEUE, { connection });
  // Tarea programada real: limpieza diaria de refresh tokens caducados/revocados.
  await queue.upsertJobScheduler(
    'purge-refresh-tokens',
    { pattern: '0 4 * * *' },
    { name: 'purge-refresh-tokens' },
  );

  const worker = new Worker(
    MAINTENANCE_QUEUE,
    async (job) => {
      if (job.name === 'purge-refresh-tokens') return { deleted: await purgeRefreshTokens(db) };
      throw new Error(`Trabajo desconocido: ${job.name}`);
    },
    { connection, concurrency: 2 },
  );
  worker.on('completed', (job, result) =>
    log.info({ job: job.name, result }, 'trabajo completado'),
  );
  worker.on('failed', (job, err) => log.error({ job: job?.name, err }, 'trabajo fallido'));
  log.info('Worker escuchando la cola %s', MAINTENANCE_QUEUE);

  const shutdown = async () => {
    await worker.close();
    await queue.close();
    await db.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.fatal(err);
  process.exit(1);
});
