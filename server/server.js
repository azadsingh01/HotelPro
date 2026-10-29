import './config/env.js';
import app from './app.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { validateJwtConfiguration } from './utils/authToken.js';

const PORT = process.env.PORT || 5000;
let httpServer;
let isShuttingDown = false;

async function startServer() {
  validateJwtConfiguration();
  await connectDB();

  httpServer = app.listen(Number(PORT), () => {
    console.log(`HotelPro API is listening on port ${PORT}`);
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
  console.error('Could not start the HotelPro API:', error);
  process.exit(1);
});
