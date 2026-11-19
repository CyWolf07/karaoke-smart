import type { Pool } from 'pg';

/** Borra refresh tokens caducados o revocados hace más de 7 días. Devuelve cuántos eliminó. */
export async function purgeRefreshTokens(db: Pick<Pool, 'query'>): Promise<number> {
  const res = await db.query(
    `DELETE FROM refresh_tokens
      WHERE expires_at < now()
         OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days')`,
  );
  return res.rowCount ?? 0;
}
