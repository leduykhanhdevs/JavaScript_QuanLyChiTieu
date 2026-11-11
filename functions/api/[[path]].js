export async function onRequest({ request, env }) {
  let backendOrigin;
  try {
    backendOrigin = new URL(env.AWS_API_ORIGIN || '');
  } catch {
    return jsonError(503, 'AWS_API_ORIGIN chưa được cấu hình.');
  }

  const proxySecret = env.EDGE_PROXY_SECRET;
  if (backendOrigin.protocol !== 'https:' || backendOrigin.pathname !== '/' || backendOrigin.search || backendOrigin.hash || !proxySecret) {
    return jsonError(503, 'Cấu hình proxy API chưa hợp lệ.');
  }

  const upstreamUrl = new URL(request.url);
  upstreamUrl.protocol = backendOrigin.protocol;
  upstreamUrl.host = backendOrigin.host;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('connection');
  headers.delete('transfer-encoding');
  for (const [name] of headers) {
    if (name.toLowerCase().startsWith('cf-')) headers.delete(name);
  }
  headers.set('x-edge-proxy-secret', proxySecret);

  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) headers.set('x-edge-client-ip', clientIp);

  const requestOptions = {
    method: request.method,
    headers,
    redirect: 'manual'
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') requestOptions.body = request.body;

  try {
    const upstreamResponse = await fetch(new Request(upstreamUrl, requestOptions));
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Cache-Control', 'private, no-store');
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  } catch {
    return jsonError(502, 'Không kết nối được backend AWS.');
  }
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: { code: 'API_PROXY_UNAVAILABLE', message } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
