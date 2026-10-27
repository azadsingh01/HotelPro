import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Resolve .env from the server folder even when npm is run from the monorepo root.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
