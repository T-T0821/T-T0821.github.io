// 収集スクリプト共通のユーティリティ
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'
const UA = 'Mozilla/5.0 (compatible; daily-tech-digest; +https://t-t0821.github.io/)'

export function todayJst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}
export const DATE = process.env.DIGEST_DATE || todayJst()

export const log = (...a) => console.error('[digest]', ...a)

export async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.text()
}

export async function fetchJson(url) {
  return JSON.parse(await fetchText(url, { Accept: 'application/json' }))
}

/** 失敗してもログだけ出して空配列を返す */
export async function safe(name, fn) {
  try {
    const items = await fn()
    log(`${name}: ${items.length} 件`)
    return items
  } catch (e) {
    log(`${name}: 取得失敗 (${e.message})`)
    return []
  }
}

export function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

/** HTML タグを除いた 1 行のテキストにする */
export function toPlain(s, max = 500) {
  const t = decodeEntities(decodeEntities(s)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max) + '…' : t
}

/** RSS 2.0 / Atom を {title, url, date, summary} の配列にする */
export function parseFeed(xml) {
  const pick = (block, tag) => block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`))?.[1] ?? ''
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/g) || []
  return blocks.map(b => {
    const link =
      decodeEntities(pick(b, 'link')).trim() ||
      b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ||
      b.match(/<link[^>]*href="([^"]+)"/)?.[1] ||
      ''
    const date = pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date')
    return {
      title: toPlain(pick(b, 'title'), 200),
      url: decodeEntities(link).trim(),
      date: date ? new Date(decodeEntities(date).trim()) : null,
      summary: toPlain(pick(b, 'description') || pick(b, 'summary') || pick(b, 'content'), 500),
      authors: [...b.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map(m => decodeEntities(m[1]).trim()),
    }
  })
}

/** Claude Code CLI で 1 回だけ応答させる（ツールは無効）。ログイン済みの claude CLI が必要 */
export function ask(prompt, system) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', MODEL, '--output-format', 'text', '--tools', '', '--no-session-persistence']
    if (system) args.push('--system-prompt', system)
    const child = spawn('claude', args, { cwd: os.tmpdir(), env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill('SIGTERM'), 10 * 60 * 1000)
    child.stdout.on('data', d => (out += d))
    child.stderr.on('data', d => (err += d))
    child.on('error', e => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', code => {
      clearTimeout(timer)
      const text = out.trim()
      if (code !== 0 || !text) reject(new Error(`claude CLI 失敗 (exit ${code}): ${err.trim().slice(0, 500)}`))
      else resolve(text)
    })
    child.stdin.end(prompt)
  })
}

/** 応答から JSON オブジェクトを取り出す */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('JSON が見つかりません')
  return JSON.parse(body.slice(start, end + 1))
}

/**
 * VitePress は Markdown を Vue テンプレートとしてコンパイルするため、
 * コード以外の部分の `<` と `{{` をエスケープしてビルド失敗を防ぐ。
 */
export function sanitize(text) {
  return String(text || '')
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 ? part : part.replace(/</g, '&lt;').replace(/\{\{/g, '&#123;&#123;')))
    .join('')
}

export const yamlStr = s => JSON.stringify(String(s))

/** data/<dir>/YYYY-MM-DD.json のうち、今日より前で days 日以内のものを読む */
export function readRecentData(dir, days) {
  const result = []
  if (!fs.existsSync(dir)) return result
  const limit = new Date(DATE).getTime() - days * 86400 * 1000
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/)
    if (!m || m[1] >= DATE || new Date(m[1]).getTime() < limit) continue
    result.push({ date: m[1], data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) })
  }
  return result
}

export function writeOutputs(category, markdown, data) {
  const docsDir = path.join(ROOT, 'docs', category)
  const dataDir = path.join(ROOT, 'data', category)
  fs.mkdirSync(docsDir, { recursive: true })
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(docsDir, `${DATE}.md`), markdown)
  fs.writeFileSync(path.join(dataDir, `${DATE}.json`), JSON.stringify(data, null, 2) + '\n')
  log(`出力: docs/${category}/${DATE}.md`)
}
