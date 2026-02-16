import { describe, expect, it } from 'vitest'
import { renderDiscordMarkdown } from './discordMarkdown'

describe('renderDiscordMarkdown', () => {
  it('renders basic markdown formatting', () => {
    const html = renderDiscordMarkdown('**bold** *italic* ~~strike~~ `code`')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<del>strike</del>')
    expect(html).toContain('<code>code</code>')
  })

  it('renders discord underline and spoiler formatting', () => {
    const html = renderDiscordMarkdown('__under__ and ||hidden||')
    expect(html).toContain('<u>under</u>')
    expect(html).toContain('<span class="discord-spoiler">hidden</span>')
  })

  it('escapes raw html input', () => {
    const html = renderDiscordMarkdown('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('allows safe links and strips unsafe links', () => {
    const safeHtml = renderDiscordMarkdown('[site](https://example.com)')
    expect(safeHtml).toContain('href="https://example.com"')
    expect(safeHtml).toContain('target="_blank"')

    const unsafeHtml = renderDiscordMarkdown('[x](javascript:alert(1))')
    expect(unsafeHtml).not.toContain('href="javascript:alert(1)"')
    expect(unsafeHtml).toContain('x')
  })

  it('renders link labels with inline markdown without recursion errors', () => {
    const html = renderDiscordMarkdown('[**site** _name_](https://example.com)')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('<strong>site</strong>')
    expect(html).toContain('<em>name</em>')
  })

  it('renders fenced code blocks and blockquotes', () => {
    const html = renderDiscordMarkdown('```ts\nconst a = 1\n```\n> quote')
    expect(html).toContain('<pre><code class="language-ts">')
    expect(html).toContain('<blockquote>')
  })

  it('renders line breaks inside a paragraph', () => {
    const html = renderDiscordMarkdown('line one\nline two')
    expect(html).toContain('line one<br>line two')
  })
})
