/** Normalize successful controller responses to { success, message, data }. */
export function responseEnvelope(_request, response, next) {
  const sendJson = response.json.bind(response);
  response.json = (payload) => {
    if (payload && typeof payload === 'object' && typeof payload.success === 'boolean' && Object.hasOwn(payload, 'data')) {
      return sendJson(payload);
    }

    const { message, ...data } = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : { value: payload };
    const succeeded = response.statusCode < 400;
    return sendJson({
      success: succeeded,
      message: typeof message === 'string' ? message : succeeded ? 'Request completed successfully.' : 'Request failed.',
      data,
    });
  };
  next();
}
