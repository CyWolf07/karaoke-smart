import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { purgeRefreshTokens } from './jobs';

// Integración real contra la base de pruebas (requiere docker compose up -d y migraciones aplicadas).
const url = process.env.DATABASE_URL ?? 'postgresql://karaoke:karaoke@localhost:5434/karaoke_test';

describe('purgeRefreshTokens', () => {
  it('elimina tokens caducados y conserva los vigentes', async () => {
    const db = new Pool({ connectionString: url });
    try {
      const { rows } = await db.query(
        `INSERT INTO users (id, email, password_hash, display_name, updated_at)
         VALUES (gen_random_uuid(), $1, 'x', 'Worker Test', now()) RETURNING id`,
        [`worker-${Date.now()}@karaoke.test`],
      );
      const userId = rows[0].id;
      await db.query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at) VALUES
         (gen_random_uuid(), $1, $2, gen_random_uuid(), now() - interval '1 day'),
         (gen_random_uuid(), $1, $3, gen_random_uuid(), now() + interval '1 day')`,
        [userId, `exp-${Date.now()}`, `ok-${Date.now()}`],
      );
      expect(await purgeRefreshTokens(db)).toBeGreaterThanOrEqual(1);
      const left = await db.query(
        'SELECT count(*)::int AS n FROM refresh_tokens WHERE user_id = $1',
        [userId],
      );
      expect(left.rows[0].n).toBe(1);
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
    } finally {
      await db.end();
    }
  });
});
