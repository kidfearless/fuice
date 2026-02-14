import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { parseGifCommand, searchGiphy, getTrendingGiphy, searchTenor, getTrendingTenor, searchGif } from './gif'

describe('gif command parsing', () => {
  it('parses /gif with query', () => {
    expect(parseGifCommand('/gif cat')).toEqual({ query: 'cat' })
  })

  it('parses /giphy with query', () => {
    expect(parseGifCommand('/giphy happy dance')).toEqual({ query: 'happy dance', source: 'giphy' })
  })

  it('parses /tenor with query', () => {
    expect(parseGifCommand('/tenor hello')).toEqual({ query: 'hello', source: 'tenor' })
  })

  it('supports case-insensitive commands', () => {
    expect(parseGifCommand('/GiPhY wow')).toEqual({ query: 'wow', source: 'giphy' })
    expect(parseGifCommand('/TENOR wow')).toEqual({ query: 'wow', source: 'tenor' })
    expect(parseGifCommand('/GIF wow')).toEqual({ query: 'wow' })
  })

  it('supports empty query forms', () => {
    expect(parseGifCommand('/gif')).toEqual({ query: '' })
    expect(parseGifCommand('/giphy')).toEqual({ query: '', source: 'giphy' })
    expect(parseGifCommand('/tenor')).toEqual({ query: '', source: 'tenor' })
  })

  it('returns null for non-gif slash commands or plain text', () => {
    expect(parseGifCommand('/shrug test')).toBeNull()
    expect(parseGifCommand('hello world')).toBeNull()
  })
})

describe('gif API functions', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchGiphy', () => {
    it('returns a GifResult on success', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: {
              original: { url: 'https://giphy.com/original.gif' },
              fixed_height: { url: 'https://giphy.com/fixed.gif' },
            },
            title: 'cat gif',
          }],
        }),
      } as Response)

      const result = await searchGiphy('cat')
      expect(result).toEqual({
        url: 'https://giphy.com/original.gif',
        previewUrl: 'https://giphy.com/fixed.gif',
        title: 'cat gif',
        source: 'giphy',
      })
    })

    it('returns null on HTTP error', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
      expect(await searchGiphy('cat')).toBeNull()
    })

    it('returns null on empty data', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)
      expect(await searchGiphy('cat')).toBeNull()
    })

    it('returns null on missing data property', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
      expect(await searchGiphy('cat')).toBeNull()
    })

    it('returns null on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('network error'))
      expect(await searchGiphy('cat')).toBeNull()
    })

    it('uses query as title fallback', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: {
              original: { url: 'https://giphy.com/original.gif' },
              fixed_height: { url: 'https://giphy.com/fixed.gif' },
            },
            title: '',
          }],
        }),
      } as Response)
      const result = await searchGiphy('cat')
      expect(result!.title).toBe('cat')
    })
  })

  describe('getTrendingGiphy', () => {
    it('returns trending gif', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: {
              original: { url: 'https://giphy.com/trending.gif' },
              fixed_height: { url: 'https://giphy.com/trending_small.gif' },
            },
            title: 'trending',
          }],
        }),
      } as Response)
      const result = await getTrendingGiphy()
      expect(result!.source).toBe('giphy')
    })

    it('returns null on error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('network'))
      expect(await getTrendingGiphy()).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
      expect(await getTrendingGiphy()).toBeNull()
    })

    it('returns null on empty result', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)
      expect(await getTrendingGiphy()).toBeNull()
    })

    it('uses fallback title', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/t.gif' }, fixed_height: { url: 'https://g.com/s.gif' } },
            title: '',
          }],
        }),
      } as Response)
      const result = await getTrendingGiphy()
      expect(result!.title).toBe('Trending GIF')
    })
  })

  describe('searchTenor', () => {
    it('returns a GifResult on success', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: {
              gif: { url: 'https://tenor.com/full.gif' },
              tinygif: { url: 'https://tenor.com/tiny.gif' },
            },
            content_description: 'hello gif',
          }],
        }),
      } as Response)

      const result = await searchTenor('hello')
      expect(result).toEqual({
        url: 'https://tenor.com/full.gif',
        previewUrl: 'https://tenor.com/tiny.gif',
        title: 'hello gif',
        source: 'tenor',
      })
    })

    it('returns null on HTTP error', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
      expect(await searchTenor('hello')).toBeNull()
    })

    it('returns null on empty results', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      } as Response)
      expect(await searchTenor('hello')).toBeNull()
    })

    it('returns null on missing results', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
      expect(await searchTenor('hello')).toBeNull()
    })

    it('returns null on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('fail'))
      expect(await searchTenor('hello')).toBeNull()
    })

    it('uses mediumgif when gif is missing', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: {
              mediumgif: { url: 'https://tenor.com/medium.gif' },
              tinygif: { url: 'https://tenor.com/tiny.gif' },
            },
            content_description: 'test',
          }],
        }),
      } as Response)
      const result = await searchTenor('test')
      expect(result!.url).toBe('https://tenor.com/medium.gif')
    })

    it('uses tinygif when gif and mediumgif are missing', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: {
              tinygif: { url: 'https://tenor.com/tiny.gif' },
            },
            content_description: 'test',
          }],
        }),
      } as Response)
      const result = await searchTenor('test')
      expect(result!.url).toBe('https://tenor.com/tiny.gif')
    })

    it('uses query as title fallback', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: { gif: { url: 'https://tenor.com/full.gif' } },
            content_description: '',
          }],
        }),
      } as Response)
      const result = await searchTenor('myquery')
      expect(result!.title).toBe('myquery')
    })
  })

  describe('getTrendingTenor', () => {
    it('returns trending tenor gif', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: {
              gif: { url: 'https://tenor.com/trending.gif' },
              tinygif: { url: 'https://tenor.com/trending_tiny.gif' },
            },
            content_description: 'trending',
          }],
        }),
      } as Response)
      const result = await getTrendingTenor()
      expect(result!.source).toBe('tenor')
    })

    it('returns null on error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('fail'))
      expect(await getTrendingTenor()).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
      expect(await getTrendingTenor()).toBeNull()
    })

    it('returns null on empty results', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      } as Response)
      expect(await getTrendingTenor()).toBeNull()
    })

    it('uses fallback title', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: { gif: { url: 'https://tenor.com/t.gif' } },
            content_description: '',
          }],
        }),
      } as Response)
      const result = await getTrendingTenor()
      expect(result!.title).toBe('Trending GIF')
    })
  })

  describe('searchGif', () => {
    it('returns giphy trending when query is empty and no source', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/t.gif' }, fixed_height: { url: 'https://g.com/s.gif' } },
            title: 'trending',
          }],
        }),
      } as Response)
      const result = await searchGif('')
      expect(result!.source).toBe('giphy')
    })

    it('falls back to tenor trending when giphy trending fails', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ ok: false } as Response) // giphy fails
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              media_formats: { gif: { url: 'https://t.com/t.gif' } },
              content_description: 'tenor trending',
            }],
          }),
        } as Response) // tenor succeeds
      })
      const result = await searchGif('')
      expect(result!.source).toBe('tenor')
    })

    it('returns giphy trending when query is empty and source is giphy', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/t.gif' }, fixed_height: { url: 'https://g.com/s.gif' } },
            title: 'trending',
          }],
        }),
      } as Response)
      const result = await searchGif('', 'giphy')
      expect(result!.source).toBe('giphy')
    })

    it('returns tenor trending when query is empty and source is tenor', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: { gif: { url: 'https://t.com/t.gif' } },
            content_description: 'tenor',
          }],
        }),
      } as Response)
      const result = await searchGif('', 'tenor')
      expect(result!.source).toBe('tenor')
    })

    it('searches giphy with source=giphy', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/s.gif' }, fixed_height: { url: 'https://g.com/s2.gif' } },
            title: 'cat',
          }],
        }),
      } as Response)
      const result = await searchGif('cat', 'giphy')
      expect(result!.source).toBe('giphy')
    })

    it('searches tenor with source=tenor', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            media_formats: { gif: { url: 'https://t.com/s.gif' } },
            content_description: 'cat',
          }],
        }),
      } as Response)
      const result = await searchGif('cat', 'tenor')
      expect(result!.source).toBe('tenor')
    })

    it('falls back to tenor search when giphy search fails', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ ok: false } as Response)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              media_formats: { gif: { url: 'https://t.com/s.gif' } },
              content_description: 'cat',
            }],
          }),
        } as Response)
      })
      const result = await searchGif('cat')
      expect(result!.source).toBe('tenor')
    })

    it('returns giphy result first when no source specified', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/s.gif' }, fixed_height: { url: 'https://g.com/s2.gif' } },
            title: 'cat',
          }],
        }),
      } as Response)
      const result = await searchGif('cat')
      expect(result!.source).toBe('giphy')
    })

    it('trims whitespace-only query and falls back to trending', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/t.gif' }, fixed_height: { url: 'https://g.com/s.gif' } },
            title: 'trending',
          }],
        }),
      } as Response)
      const result = await searchGif('   ')
      expect(result).not.toBeNull()
    })
  })

  describe('normalizeGifResult edge cases', () => {
    it('returns null when url is undefined', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: undefined }, fixed_height: { url: 'https://g.com/s.gif' } },
            title: 'test',
          }],
        }),
      } as Response)
      // searchGiphy calls normalizeGifResult
      const result = await searchGiphy('test')
      expect(result).toBeNull()
    })

    it('uses url as previewUrl when previewUrl is undefined', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            images: { original: { url: 'https://g.com/main.gif' }, fixed_height: { url: undefined } },
            title: 'test',
          }],
        }),
      } as Response)
      const result = await searchGiphy('test')
      expect(result!.previewUrl).toBe('https://g.com/main.gif')
    })
  })
})
