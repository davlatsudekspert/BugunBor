// Answers "Range: bytes=…" from a whole file. The site's static files are
// always sent whole, and Safari (iPhone, Mac) plays a video only when the
// server can send it in parts (206 Partial Content).

const RANGE = /^bytes=(\d*)-(\d*)$/;

export async function rangeResponse(request: Request, file: Response, cacheControl: string): Promise<Response> {
  if (!file.ok) return file;
  const body = await file.arrayBuffer();
  const size = body.byteLength;
  const headers = new Headers({ 'content-type': file.headers.get('content-type') ?? 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': cacheControl });
  const etag = file.headers.get('etag');
  if (etag) headers.set('etag', etag);
  const head = request.method === 'HEAD';

  // No range, or a form this does not handle (several ranges): the whole file.
  const match = RANGE.exec(request.headers.get('range') ?? '');
  if (!match || (match[1] === '' && match[2] === '')) {
    headers.set('content-length', String(size));
    return new Response(head ? null : body, { status: 200, headers });
  }
  // "bytes=-500" is the last 500 bytes; "bytes=100-" runs to the end.
  const start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = match[1] === '' || match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}`, 'accept-ranges': 'bytes' } });
  headers.set('content-range', `bytes ${start}-${end}/${size}`);
  headers.set('content-length', String(end - start + 1));
  return new Response(head ? null : body.slice(start, end + 1), { status: 206, headers });
}
