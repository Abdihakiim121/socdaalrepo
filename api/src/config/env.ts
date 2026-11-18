/**
 * Checks the settings in .env before the API starts, so a missing secret or a wrong database
 * name stops the server with a clear message instead of failing at the first request.
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): void {
  const problems: string[] = [];
  const production = env.NODE_ENV === 'production';

  for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET']) {
    if (!env[key]?.trim()) problems.push(`${key} is not set`);
  }

  const secret = env.JWT_SECRET ?? '';
  if (secret && secret.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters (a long random string)');
  }
  if (production && /replace|change|secret|example/i.test(secret)) {
    problems.push('JWT_SECRET still looks like the example value');
  }

  if (env.DB_PORT && !/^\d+$/.test(env.DB_PORT)) problems.push('DB_PORT must be a number');
  if (env.PORT && !/^\d+$/.test(env.PORT)) problems.push('PORT must be a number');

  // synchronize rewrites tables to match the code and can drop columns with their data.
  if (production && env.DB_SYNCHRONIZE === 'true') {
    problems.push('DB_SYNCHRONIZE must be false in production; use npm run migration:run:prod');
  }

  if (problems.length) {
    throw new Error(`The API can't start because of these settings in .env:\n  - ${problems.join('\n  - ')}`);
  }
}
