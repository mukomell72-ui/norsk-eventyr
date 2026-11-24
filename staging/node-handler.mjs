// Build Output API functions can receive raw Node HTTP objects.
export function withHttpHelpers(handler) {
  return async (req, res) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return handler(req, res);
    }

    res.status = code => { res.statusCode = code; return res; };
    res.json = body => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(body));
    };
    res.send = body => res.end(body);
    req.query ??= Object.fromEntries(new URL(req.url, 'http://local.invalid').searchParams);

    if (req.method === 'POST' && req.body === undefined) {
      const limit = 4_000_000;
      const chunks = [];
      let size = 0;
      if (Number(req.headers['content-length']) > limit) {
        return res.status(413).json({error:'BODY_TOO_LARGE', code:'BODY_TOO_LARGE'});
      }
      try {
        // Preserve the response socket when rejecting an oversized streaming body.
        for await (const chunk of req.iterator({destroyOnReturn:false})) {
          size += chunk.length;
          if (size > limit) return res.status(413).json({error:'BODY_TOO_LARGE', code:'BODY_TOO_LARGE'});
          chunks.push(chunk);
        }
        req.body = size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
      } catch {
        return res.status(400).json({error:'BAD_JSON', code:'BAD_JSON'});
      }
    }
    return handler(req,res);
  };
}
