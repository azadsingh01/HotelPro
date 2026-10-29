/** Report API health with the simple payload used by deployment checks. */
export function getHealth(_request, response) {
  response.json({ status: 'ok' });
}
