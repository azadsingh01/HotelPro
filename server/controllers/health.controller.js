import mongoose from 'mongoose';

const databaseStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/** Report whether the API is running and its current MongoDB connection state. */
export async function getHealth(_request, response) {
  const database = databaseStates[mongoose.connection.readyState] ?? 'unknown';
  const isReady = database === 'connected';

  response.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'unavailable',
    database,
    timestamp: new Date().toISOString(),
  });
}
