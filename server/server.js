import './config/env.js';
import app from './app.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { validateJwtConfiguration } from './utils/authToken.js';

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || '0.0.0.0';
let httpServer;
let isShuttingDown = false;

async function startServer() {
  validateJwtConfiguration();
  await connectDB();

  httpServer = app.listen(port, host, () => {
    console.log(`HotelPro API is listening on http://${host}:${port}`);
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`${signal} received. Closing HotelPro API.`);

  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await mongoose.connection.close();
  } catch {
    console.error('HotelPro shutdown completed with a connection close error.');
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

startServer().catch((error) => {
  console.error('Could not start the HotelPro API:', error.message);
  process.exit(1);
});
