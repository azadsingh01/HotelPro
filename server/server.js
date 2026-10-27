import './config/env.js';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { validateJwtConfiguration } from './utils/authToken.js';

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || '0.0.0.0';

async function startServer() {
  validateJwtConfiguration();
  await connectDatabase();

  app.listen(port, host, () => {
    console.log(`HotelPro API is listening on http://${host}:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Could not start the HotelPro API:', error.message);
  process.exitCode = 1;
});
