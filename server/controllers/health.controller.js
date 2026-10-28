import mongoose from 'mongoose';

/** Report whether the API is running and its current MongoDB connection state. */
export async function getHealth(_request, response) {
  const isReady = mongoose.connection.readyState === 1;
  const database = isReady ? 'connected' : 'disconnected';

  response.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'unavailable',
    database,
    timestamp: new Date().toISOString(),
  });
}
