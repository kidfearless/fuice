import { Marked, Renderer, type Token, type TokenizerThis, type RendererThis } from 'marked'

type InlineToken = {
  type: 'underline' | 'spoiler'
  raw: string
  text: string
  tokens: Token[]
}

const allowedProtocols = ['http://', 'https://', 'mailto:']

const isSafeUrl = (value?: string | null) => {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return allowedProtocols.some((protocol) => normalized.startsWith(protocol))
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const escapeAttribute = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

let parser: Marked

const underlineExtension = {
  name: 'underline',
  level: 'inline' as const,
  start(src: string) {
    return src.indexOf('__')
  },
  tokenizer(this: TokenizerThis, src: string) {
    const match = /^__([\s\S]+?)__(?!_)/.exec(src)
    if (!match) return undefined
    return {
      type: 'underline',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1]),
    } as InlineToken
  },
  renderer(this: RendererThis, token: InlineToken) {
    return `<u>${this.parser.parseInline(token.tokens)}</u>`
  },
}

const spoilerExtension = {
  name: 'spoiler',
  level: 'inline' as const,
  start(src: string) {
    return src.indexOf('||')
  },
  tokenizer(this: TokenizerThis, src: string) {
    const match = /^\|\|([\s\S]+?)\|\|/.exec(src)
    if (!match) return undefined
    return {
      type: 'spoiler',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1]),
    } as InlineToken
  },
  renderer(this: RendererThis, token: InlineToken) {
    return `<span class="discord-spoiler">${this.parser.parseInline(token.tokens)}</span>`
  },
}

const renderer = new Renderer()

renderer.link = function (this: RendererThis, { href, title, tokens }) {
  const label = this.parser.parseInline(tokens)
  if (!isSafeUrl(href)) return label
  const safeHref = escapeAttribute(href)
  const safeTitle = title ? ` title="${escapeAttribute(title)}"` : ''
  return `<a href="${safeHref}"${safeTitle} target="_blank" rel="noopener noreferrer">${label}</a>`
}

renderer.image = ({ href, text }) => {
  if (!isSafeUrl(href)) return text ?? ''
  const safeHref = escapeAttribute(href)
  const label = text ? escapeHtml(text) : safeHref
  return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`
}

renderer.html = ({ raw, text }: { raw?: string; text?: string }) => {
  return escapeHtml(text ?? raw ?? '')
}

parser = new Marked({
  gfm: true,
  breaks: true,
  async: false,
  renderer,
  extensions: [underlineExtension, spoilerExtension],
})

export const renderDiscordMarkdown = (content: string) => {
  try {
    return parser.parse(content)
  } catch (error) {
    console.error('Failed to render markdown content:', error)
    return `<p>${escapeHtml(content)}</p>`
  }
}
