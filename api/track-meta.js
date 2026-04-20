/**
 * Fetches CF Studio track metadata from the page's OG meta tags.
 * The page shell is served server-side even though the app is CSR —
 * OG tags include title and artwork URL.
 */

const CF_STUDIO_BASE = 'https://studio.creativefabrica.com/ai-music-generator/'
const CF_STUDIO_OG_IMAGE = 'https://studio.creativefabrica.com/og-image/ai-music-generator-lightbox/'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { slug } = req.query
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug.' })
  }

  let html
  try {
    const response = await fetch(`${CF_STUDIO_BASE}${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    })
    html = await response.text()
  } catch {
    return res.status(502).json({ error: 'Could not fetch CF Studio page.' })
  }

  // Extract og:title — "Track Name - AI Music Generator"
  const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/)
  const rawTitle = titleMatch ? titleMatch[1] : null
  const title = rawTitle ? rawTitle.replace(/ - AI Music Generator$/, '').trim() : slug

  // Artwork URL is a known pattern from the slug
  const artwork = `${CF_STUDIO_OG_IMAGE}${slug}/result.png`

  res.status(200).json({ title, artwork, slug })
}
