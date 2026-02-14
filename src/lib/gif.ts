const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'dc6zaTOxFJmzC' // Public beta key fallback
const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ' // Public key fallback

export interface GifResult {
  url: string
  previewUrl: string
  title: string
  source: 'giphy' | 'tenor'
}

function normalizeGifResult(
  url: string | undefined,
  previewUrl: string | undefined,
  title: string,
  source: 'giphy' | 'tenor',
): GifResult | null {
  if (!url) return null
  return {
    url,
    previewUrl: previewUrl || url,
    title,
    source,
  }
}

export async function searchGiphy(query: string): Promise<GifResult | null> {
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=1&rating=g`
    const response = await fetch(url)
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data.data || data.data.length === 0) return null
    
    const gif = data.data[0]
    return normalizeGifResult(gif.images.original.url, gif.images.fixed_height.url, gif.title || query, 'giphy')
  } catch (error) {
    console.error('Giphy search failed:', error)
    return null
  }
}

export async function getTrendingGiphy(): Promise<GifResult | null> {
  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=1&rating=g`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    if (!data.data || data.data.length === 0) return null

    const gif = data.data[0]
    return normalizeGifResult(gif.images.original.url, gif.images.fixed_height.url, gif.title || 'Trending GIF', 'giphy')
  } catch (error) {
    console.error('Giphy trending failed:', error)
    return null
  }
}

export async function searchTenor(query: string): Promise<GifResult | null> {
  try {
    const url = `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=1&contentfilter=medium`
    const response = await fetch(url)
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data.results || data.results.length === 0) return null
    
    const gif = data.results[0]
    const mediaFormats = gif.media_formats
    return normalizeGifResult(
      mediaFormats.gif?.url || mediaFormats.mediumgif?.url || mediaFormats.tinygif?.url,
      mediaFormats.tinygif?.url || mediaFormats.gif?.url,
      gif.content_description || query,
      'tenor',
    )
  } catch (error) {
    console.error('Tenor search failed:', error)
    return null
  }
}

export async function getTrendingTenor(): Promise<GifResult | null> {
  try {
    const url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=1&contentfilter=medium`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    if (!data.results || data.results.length === 0) return null

    const gif = data.results[0]
    const mediaFormats = gif.media_formats
    return normalizeGifResult(
      mediaFormats.gif?.url || mediaFormats.mediumgif?.url || mediaFormats.tinygif?.url,
      mediaFormats.tinygif?.url || mediaFormats.gif?.url,
      gif.content_description || 'Trending GIF',
      'tenor',
    )
  } catch (error) {
    console.error('Tenor featured failed:', error)
    return null
  }
}

export async function searchGif(query: string, source?: 'giphy' | 'tenor'): Promise<GifResult | null> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    if (source === 'giphy') return getTrendingGiphy()
    if (source === 'tenor') return getTrendingTenor()
    const giphyTrending = await getTrendingGiphy()
    if (giphyTrending) return giphyTrending
    return getTrendingTenor()
  }

  if (source === 'giphy') return searchGiphy(query)
  if (source === 'tenor') return searchTenor(query)
  
  // Default: try Giphy first, fall back to Tenor
  const giphyResult = await searchGiphy(normalizedQuery)
  if (giphyResult) return giphyResult
  return searchTenor(normalizedQuery)
}

export function parseGifCommand(message: string): { query: string; source?: 'giphy' | 'tenor' } | null {
  const trimmed = message.trim()

  const match = trimmed.match(/^\/(gif|giphy|tenor)(?:\s+(.*))?$/i)
  if (!match) return null

  const command = match[1].toLowerCase()
  const query = (match[2] ?? '').trim()
  if (command === 'giphy') return { query, source: 'giphy' }
  if (command === 'tenor') return { query, source: 'tenor' }
  if (command === 'gif') return { query }
  
  return null
}
