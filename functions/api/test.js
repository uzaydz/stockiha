export async function onRequest(context) {
  const { request } = context;

  return new Response(JSON.stringify({
    success: true,
    message: 'Test function works!',
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
