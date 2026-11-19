// Entorno de pruebas: base de datos separada (karaoke_test) creada por infra/postgres/init.sql.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://karaoke:karaoke@localhost:5434/karaoke_test';
process.env.REDIS_URL ??= 'redis://localhost:6380';
process.env.JWT_ACCESS_SECRET ??= 'test_secret_test_secret_test_secret_test_secret';
process.env.CORS_ORIGINS ??= 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';
