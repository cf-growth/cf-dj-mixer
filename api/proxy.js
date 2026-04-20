/**
 * Vercel serverless proxy for CF Studio S3 audio files.
 * Bypasses CORS by fetching server-side and returning with permissive headers.
 * Only proxies URLs from the CF Studio S3 bucket — not an open proxy.
 */

const ALLOWED_ORIGIN = 'https://cf-upscaler-live.s3.amazonaws.com/musicGenerator/'

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Range')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { url } = req.query

  if (!url || !url.startsWith(ALLOWED_ORIGIN)) {
    return res.status(400).json({ error: 'Only CF Studio audio URLs are supported.' })
  }

  let upstream
  try {
    upstream = await fetch(url, {
      headers: req.headers.range ? { Range: req.headers.range } : {},
    })
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch audio from S3.' })
  }

  const contentType = upstream.headers.get('Content-Type') || 'audio/mpeg'
  const contentLength = upstream.headers.get('Content-Length')
  const acceptRanges = upstream.headers.get('Accept-Ranges')

  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  if (contentLength) res.setHeader('Content-Length', contentLength)
  if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges)

  res.status(upstream.status)

  const buffer = await upstream.arrayBuffer()
  res.send(Buffer.from(buffer))
}
