import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Resolve .env from the server folder even when npm is run from the monorepo root.
if (process.env.NODE_ENV !== 'production' && process.env.RENDER !== 'true') {
  const require = createRequire(import.meta.url);
  require('dotenv').config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
}
