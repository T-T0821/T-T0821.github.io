#!/usr/bin/env node
// 直近24時間で注目されている OSS を複数ソースから収集し、
// Claude で日本語の技術要約を作成して VitePress 用 Markdown を出力する。
//
// 使い方: node scripts/trending/collect.mjs
// 要約はログイン済みの Claude Code CLI（`claude -p`）で行う。
// 毎朝 Claude Code のスケジュールタスクから実行され、Max プランの使用枠を消費する。
// 任意の環境変数:
//   CLAUDE_MODEL       既定 claude-sonnet-5-5
//   TRENDING_LIMIT     要約するリポジトリ数（既定 15）
//   TRENDING_DATE      出力日付 YYYY-MM-DD（既定は JST の今日）
//   SKIP_RECENT_DAYS   この日数以内に要約済みのリポジトリは再要約しない（既定 7）

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { spawn } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DOCS_DIR = path.join(ROOT, 'docs/trending')
const DATA_DIR = path.join(ROOT, 'data/trending')

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'
const LIMIT = Number(process.env.TRENDING_LIMIT || 15)
const SKIP_RECENT_DAYS = Number(process.env.SKIP_RECENT_DAYS || 7)
const UA = 'trending-oss-digest (+https://github.com/T-T0821/T-T0821.github.io)'

function todayJst() {
  const d = new Date(Date.now() + 9 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}
const DATE = process.env.TRENDING_DATE || todayJst()

const log = (...a) => console.error('[trending]', ...a)

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.text()
}

async function gh(pathname, accept = 'application/vnd.github+json') {
  const headers = { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' }
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: { 'User-Agent': UA, ...headers },
  })
  if (!res.ok) throw new Error(`GitHub API ${pathname} -> HTTP ${res.status}`)
  return accept.includes('raw') ? res.text() : res.json()
}

const decode = s =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const NOT_REPO_OWNERS = new Set([
  'trending', 'topics', 'collections', 'sponsors', 'features', 'about', 'login',
  'signup', 'orgs', 'marketplace', 'settings', 'apps', 'site', 'contact', 'pricing',
])
const isRepo = name => REPO_RE.test(name) && !NOT_REPO_OWNERS.has(name.split('/')[0].toLowerCase())

// ---------- ソース1: GitHub Trending（日次） ----------
async function fromGithubTrending() {
  const html = await fetchText('https://github.com/trending?since=daily')
  const items = []
  for (const block of html.split('<article').slice(1)) {
    const href = block.match(/<h2[^>]*>[\s\S]*?href="\/([^"?#]+)"/)
    if (!href || !isRepo(href[1])) continue
    const desc = block.match(/<p class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const lang = block.match(/itemprop="programmingLanguage">([^<]+)</)
    const today = block.match(/([\d,]+)\s+stars?\s+today/)
    items.push({
      fullName: href[1],
      description: desc ? decode(desc[1]) : '',
      language: lang ? lang[1].trim() : '',
      starsToday: today ? Number(today[1].replace(/,/g, '')) : 0,
    })
  }
  return items
}

// ---------- ソース2: Trendshift ----------
// 公開 API がないため HTML / 埋め込みデータから owner/repo を抽出する（ベストエフォート）。
async function fromTrendshift() {
  const html = await fetchText('https://trendshift.io/')
  const found = new Map()
  const add = name => {
    if (isRepo(name) && !found.has(name.toLowerCase())) found.set(name.toLowerCase(), name)
  }
  // 埋め込み JSON (Next.js の RSC ペイロード等) の full_name
  for (const m of html.matchAll(/\\?"(?:full_name|fullName|repo_name|name_with_owner)\\?"\s*:\s*\\?"([^"\\]+)\\?"/g)) add(m[1])
  // github.com へのリンク
  for (const m of html.matchAll(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?["'/?#\s\\]/g)) add(m[1])
  // リンクテキストが owner/repo 形式のもの
  for (const m of html.matchAll(/>\s*([A-Za-z0-9_.-]+\s*\/\s*[A-Za-z0-9_.-]+)\s*</g)) add(m[1].replace(/\s+/g, ''))
  return [...found.values()]
    .filter(n => n.toLowerCase() !== 't-t0821/t-t0821.github.io')
    .slice(0, 30)
    .map((fullName, i) => ({ fullName, trendshiftRank: i + 1 }))
}

// ---------- ソース3: GitHub Search（直近に作成されスターを集めている新規リポジトリ） ----------
async function fromGithubSearch() {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10)
  const q = encodeURIComponent(`created:>=${since} stars:>=50`)
  const json = await gh(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`)
  return json.items.map(r => ({
    fullName: r.full_name,
    description: r.description || '',
    language: r.language || '',
    newRepo: true,
  }))
}

async function safe(name, fn) {
  try {
    const items = await fn()
    log(`${name}: ${items.length} 件`)
    return items
  } catch (e) {
    log(`${name}: 取得失敗 (${e.message})`)
    return []
  }
}

// ---------- 既存記事から最近要約したリポジトリを取得 ----------
function recentlyCovered() {
  const covered = new Map() // lower fullName -> date
  if (!fs.existsSync(DATA_DIR)) return covered
  const limit = new Date(DATE).getTime() - SKIP_RECENT_DAYS * 86400 * 1000
  for (const f of fs.readdirSync(DATA_DIR)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/)
    if (!m || m[1] >= DATE || new Date(m[1]).getTime() < limit) continue
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'))
    for (const r of data.repos || []) {
      if (!r.summary) continue
      const key = r.fullName.toLowerCase()
      if (!covered.has(key) || covered.get(key) < m[1]) covered.set(key, m[1])
    }
  }
  return covered
}

// ---------- 候補の統合とスコアリング ----------
function merge(trending, trendshift, search) {
  const map = new Map()
  const upsert = (item, source) => {
    const key = item.fullName.toLowerCase()
    const cur = map.get(key) || { fullName: item.fullName, sources: [] }
    for (const [k, v] of Object.entries(item)) if (v && !cur[k]) cur[k] = v
    if (!cur.sources.includes(source)) cur.sources.push(source)
    map.set(key, cur)
  }
  trending.forEach(i => upsert(i, 'GitHub Trending'))
  trendshift.forEach(i => upsert(i, 'Trendshift'))
  search.forEach(i => upsert(i, 'GitHub 新着'))

  for (const r of map.values()) {
    let score = 0
    if (r.starsToday) score += r.starsToday
    if (r.trendshiftRank) score += Math.max(0, 300 - r.trendshiftRank * 10)
    if (r.newRepo) score += 100
    score *= 1 + 0.5 * (r.sources.length - 1) // 複数ソースに出ているものを優遇
    r.score = Math.round(score)
  }
  return [...map.values()].sort((a, b) => b.score - a.score)
}

async function enrich(repo) {
  try {
    const meta = await gh(`/repos/${repo.fullName}`)
    repo.fullName = meta.full_name
    repo.url = meta.html_url
    repo.description = repo.description || meta.description || ''
    repo.language = repo.language || meta.language || ''
    repo.stars = meta.stargazers_count
    repo.forks = meta.forks_count
    repo.topics = meta.topics || []
    repo.license = meta.license?.spdx_id || ''
    repo.homepage = meta.homepage || ''
    repo.createdAt = meta.created_at
    repo.archived = meta.archived
  } catch (e) {
    log(`メタデータ取得失敗 ${repo.fullName}: ${e.message}`)
    repo.url = `https://github.com/${repo.fullName}`
  }
  try {
    const readme = await gh(`/repos/${repo.fullName}/readme`, 'application/vnd.github.raw')
    repo.readme = readme.slice(0, 20000)
  } catch {
    repo.readme = ''
  }
  return repo
}

// ---------- Claude による要約 ----------

const SYSTEM = `あなたは日本のソフトウェアエンジニア向けに OSS の技術解説を書くテクニカルライターです。
与えられたリポジトリ情報と README だけを根拠に、正確で簡潔な日本語の解説を書きます。
README に書かれていないことは推測で断定せず、不明な点は書かないでください。
誇張した宣伝文句は避け、エンジニアが「自分の仕事に使えるか」を判断できる情報を優先します。`

function repoPrompt(r) {
  return `次の GitHub リポジトリを解説してください。

<repository>
名前: ${r.fullName}
URL: ${r.url}
説明: ${r.description}
主要言語: ${r.language || '不明'}
スター数: ${r.stars ?? '不明'}（本日の増加: ${r.starsToday || '不明'}）
トピック: ${(r.topics || []).join(', ') || 'なし'}
ライセンス: ${r.license || '不明'}
注目ソース: ${r.sources.join(', ')}
</repository>

<readme>
${r.readme || '(README を取得できませんでした)'}
</readme>

以下の Markdown 形式だけを出力してください。見出しの前後に余計な前置きや結びの文は不要です。

**一言で:** （何をするものかを 1 文で）

**解決する課題:** （2〜3 文）

**技術的なポイント:**
- （アーキテクチャ、使用技術、他ツールとの違いなどを 3〜5 項目）

**使いどころ:** （想定ユースケースを 1〜2 文）

**始め方:** （README にインストール手順があれば最小限のコマンドをコードブロックで。なければこの項目ごと省略）`
}

// Claude Code CLI で 1 回だけ応答させる。ツールはすべて無効化する。
function ask(prompt) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--model', MODEL,
      '--output-format', 'text',
      '--tools', '',
      '--system-prompt', SYSTEM,
      '--no-session-persistence',
    ]
    const child = spawn('claude', args, {
      cwd: os.tmpdir(), // リポジトリの設定ファイル等を読み込ませない
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill('SIGTERM'), 5 * 60 * 1000)
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

async function summarizeOverview(repos) {
  const list = repos
    .filter(r => r.summary)
    .map(r => `- ${r.fullName}: ${r.summary.match(/\*\*一言で:\*\*\s*(.+)/)?.[1] ?? r.description}`)
    .join('\n')
  return ask(
    `今日注目を集めた OSS の一覧です。\n\n${list}\n\n` +
      `全体の傾向（どんな分野・技術が注目されているか）を日本語で 3〜5 文にまとめてください。` +
      `見出しや箇条書きは使わず、本文の段落だけを出力してください。`,
  )
}

// ---------- Markdown 生成 ----------
// VitePress は Markdown を Vue テンプレートとしてコンパイルするため、
// コード以外の部分の `<` と `{{` をエスケープしてビルド失敗を防ぐ。
function sanitize(text) {
  return String(text || '')
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 ? part : part.replace(/</g, '&lt;').replace(/\{\{/g, '&#123;&#123;')))
    .join('')
}

const fmt = n => (typeof n === 'number' ? n.toLocaleString('en-US') : '-')
const yamlStr = s => JSON.stringify(s)

function renderMarkdown(repos, carried, overview) {
  const summarized = repos.filter(r => r.summary)
  const title = `${DATE} のトレンド OSS`
  const top = summarized.slice(0, 3).map(r => r.fullName.split('/')[1]).join('、')
  const description = `GitHub Trending・Trendshift などで直近24時間に注目を集めた OSS ${summarized.length} 件を日本語で要約。${top ? `注目: ${top} ほか` : ''}`

  const lines = [
    '---',
    `title: ${yamlStr(title)}`,
    `date: ${DATE}`,
    'category: "trending"',
    `description: ${yamlStr(description)}`,
    'lang: "日本語"',
    '---',
    '',
    `# ${title}`,
    '',
    `> GitHub Trending・Trendshift・GitHub 検索から自動収集し、Claude（\`${MODEL}\`）で要約しています。内容は README をもとに自動生成したものです。`,
    '',
  ]
  if (overview) lines.push('## 今日の傾向', '', sanitize(overview), '')

  lines.push('## 一覧', '', '| # | リポジトリ | 言語 | ★ 合計 | ★ 本日 | ソース |', '|---|---|---|---:|---:|---|')
  summarized.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | [${r.fullName}](#${slug(r.fullName)}) | ${sanitize(r.language) || '-'} | ${fmt(r.stars)} | ${r.starsToday ? '+' + fmt(r.starsToday) : '-'} | ${r.sources.join(', ')} |`,
    )
  })
  lines.push('')

  summarized.forEach((r, i) => {
    lines.push(`## ${i + 1}. ${r.fullName} {#${slug(r.fullName)}}`, '')
    const badges = [
      `[GitHub](${r.url})`,
      r.homepage ? `[Website](${r.homepage})` : null,
      r.language ? `言語: ${r.language}` : null,
      `★ ${fmt(r.stars)}${r.starsToday ? `（本日 +${fmt(r.starsToday)}）` : ''}`,
      r.license ? `ライセンス: ${r.license}` : null,
    ].filter(Boolean)
    lines.push(badges.join(' ・ '), '')
    if (r.description) lines.push(`> ${sanitize(r.description)}`, '')
    lines.push('::: v-pre', '', sanitize(r.summary), '', ':::', '')
  })

  if (carried.length) {
    lines.push('## 引き続き注目', '', '直近で既に紹介済みのリポジトリです。', '')
    lines.push('| リポジトリ | ★ 本日 | 紹介記事 |', '|---|---:|---|')
    for (const r of carried) {
      lines.push(
        `| [${r.fullName}](${r.url}) | ${r.starsToday ? '+' + fmt(r.starsToday) : '-'} | [${r.coveredOn}](./${r.coveredOn}#${slug(r.fullName)}) |`,
      )
    }
    lines.push('')
  }
  return { markdown: lines.join('\n'), title, description }
}

function slug(fullName) {
  return fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ---------- メイン ----------
async function main() {
  log(`モデル: ${MODEL}`)

  const [trending, trendshift, search] = await Promise.all([
    safe('GitHub Trending', fromGithubTrending),
    safe('Trendshift', fromTrendshift),
    safe('GitHub Search', fromGithubSearch),
  ])
  const candidates = merge(trending, trendshift, search)
  if (!candidates.length) throw new Error('どのソースからも候補を取得できませんでした')

  const covered = recentlyCovered()
  const fresh = []
  const carried = []
  for (const c of candidates) {
    const coveredOn = covered.get(c.fullName.toLowerCase())
    if (coveredOn) {
      if (carried.length < 10) carried.push({ ...c, coveredOn, url: `https://github.com/${c.fullName}` })
    } else if (fresh.length < LIMIT) {
      fresh.push(c)
    }
  }
  log(`要約対象 ${fresh.length} 件 / 継続 ${carried.length} 件`)

  if (!fresh.length) {
    log('新たに要約すべきリポジトリがありません。出力をスキップします。')
    return
  }

  for (const r of fresh) {
    await enrich(r)
    if (r.archived) continue
    try {
      r.summary = await ask(repoPrompt(r))
      log(`要約完了: ${r.fullName}`)
    } catch (e) {
      log(`要約失敗 ${r.fullName}: ${e.message}`)
    }
  }
  if (!fresh.some(r => r.summary)) throw new Error('要約に 1 件も成功しませんでした')

  let overview = ''
  try {
    overview = await summarizeOverview(fresh)
  } catch (e) {
    log(`全体傾向の生成に失敗: ${e.message}`)
  }

  const { markdown } = renderMarkdown(fresh, carried, overview)
  fs.mkdirSync(DOCS_DIR, { recursive: true })
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const mdPath = path.join(DOCS_DIR, `${DATE}.md`)
  fs.writeFileSync(mdPath, markdown)
  fs.writeFileSync(
    path.join(DATA_DIR, `${DATE}.json`),
    JSON.stringify(
      {
        date: DATE,
        model: MODEL,
        repos: fresh.map(({ readme, ...r }) => r),
        carried: carried.map(({ fullName, starsToday, coveredOn }) => ({ fullName, starsToday, coveredOn })),
      },
      null,
      2,
    ) + '\n',
  )
  log(`出力: ${path.relative(ROOT, mdPath)}`)
}

main().catch(e => {
  console.error(`::error::${e.message}`)
  process.exit(1)
})
