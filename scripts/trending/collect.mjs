#!/usr/bin/env node
// 直近 1 週間でスターが急増している OSS を Trendshift から収集し（毎週日曜に実行）、
// Claude で日本語の技術要約を作成して docs/trending/YYYY-MM-DD.md に出力する。
//
// 使い方: node scripts/trending/collect.mjs
//         node scripts/trending/collect.mjs --render-only
//           保存済みの data/trending/*.json から Markdown だけを作り直す（収集・要約はしない）
// 任意の環境変数:
//   CLAUDE_MODEL      既定 claude-sonnet-5-5
//   TRENDING_LIMIT    要約するリポジトリ数（既定 15）
//   DIGEST_DATE       出力日付 YYYY-MM-DD（既定は JST の今日）

import fs from 'node:fs'
import path from 'node:path'
import {
  ROOT, MODEL, DATE, log, fetchText, fetchJson, decodeEntities, ask, sanitize, yamlStr,
  readRecentData, writeOutputs,
} from '../lib/common.mjs'

const CATEGORY = 'trending'
const LIMIT = Number(process.env.TRENDING_LIMIT || 15)
const SKIP_RECENT_DAYS = 28 // 直近 4 週に紹介済みのものは再要約しない

// ---------- 収集: Trendshift の週間ランキング（毎週日曜に実行） ----------
// ページに埋め込まれたデータ（Next.js の RSC ペイロード）から各リポジトリの情報を取り出す。
async function fromTrendshift() {
  const html = await fetchText('https://trendshift.io/weekly')
  const payload = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  const items = []
  const seen = new Set()
  const str = (chunk, key) => {
    const m = chunk.match(new RegExp(`"${key}":("(?:[^"\\\\]|\\\\.)*")`))
    try {
      return m ? JSON.parse(m[1]) : ''
    } catch {
      return ''
    }
  }
  const num = (chunk, key) => {
    const m = chunk.match(new RegExp(`"${key}":(\\d+)`))
    return m ? Number(m[1]) : undefined
  }
  for (const chunk of payload.split('{"id":').slice(1)) {
    if (!/^\d+,"rank":\d+/.test(chunk)) continue
    const fullName = str(chunk, 'full_name')
    if (!fullName || seen.has(fullName.toLowerCase())) continue
    seen.add(fullName.toLowerCase())
    items.push({
      fullName,
      rank: num(chunk, 'rank'),
      description: decodeEntities(str(chunk, 'repository_description')),
      language: str(chunk, 'repository_language') || str(chunk, 'language'),
      stars: num(chunk, 'repository_stars'),
      starsGained: num(chunk, 'repository_stars_gained'),
      createdAt: str(chunk, 'repository_created_at'),
    })
  }
  if (!items.length) throw new Error('Trendshift のページからランキングを読み取れませんでした')
  return items.sort((a, b) => a.rank - b.rank)
}

// ---------- 詳細: メタデータ（OSS Insight 経由）と README ----------
async function enrich(repo) {
  repo.url = `https://github.com/${repo.fullName}`
  try {
    const { data } = await fetchJson(`https://api.ossinsight.io/gh/repos/${repo.fullName}`)
    repo.stars = data.stargazers_count ?? repo.stars
    repo.topics = data.topics || []
    repo.license = data.license?.spdx_id && data.license.spdx_id !== 'NOASSERTION' ? data.license.spdx_id : ''
    repo.homepage = data.homepage || ''
    repo.archived = Boolean(data.archived)
    repo.description = repo.description || data.description || ''
  } catch (e) {
    log(`メタデータ取得失敗 ${repo.fullName}: ${e.message}`)
  }
  repo.readme = ''
  for (const name of ['README.md', 'readme.md', 'README.MD', 'README.rst', 'README']) {
    try {
      repo.readme = (await fetchText(`https://raw.githubusercontent.com/${repo.fullName}/HEAD/${name}`)).slice(0, 20000)
      break
    } catch {}
  }
  return repo
}

// ---------- 要約 ----------
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
スター数: ${r.stars ?? '不明'}（直近 1 週間の増加: ${r.starsGained ?? '不明'}）
トピック: ${(r.topics || []).join(', ') || 'なし'}
ライセンス: ${r.license || '不明'}
</repository>

<readme>
${r.readme || '(README を取得できませんでした)'}
</readme>

以下の Markdown 形式だけを出力してください。前置きや結びの文は不要です。

**一言で:** （何をするものかを 1 文で）

**解決する課題:** （2〜3 文）

**技術的なポイント:**
- （アーキテクチャ、使用技術、他ツールとの違いなどを 3〜5 項目）

**使いどころ:** （想定ユースケースを 1〜2 文）

**始め方:** （README にインストール手順があれば最小限のコマンドをコードブロックで。なければこの項目ごと省略）`
}

async function summarizeOverview(repos) {
  const list = repos
    .map(r => `- ${r.fullName}: ${r.summary.match(/\*\*一言で:\*\*\s*(.+)/)?.[1] ?? r.description}`)
    .join('\n')
  return ask(
    `今週注目を集めた OSS の一覧です。\n\n${list}\n\n` +
      '全体の傾向（どんな分野・技術が注目されているか）を日本語で 3〜5 文にまとめてください。' +
      '見出しや箇条書きは使わず、本文の段落だけを出力してください。',
    SYSTEM,
  )
}

// ---------- Markdown 生成 ----------
const fmt = n => (typeof n === 'number' ? n.toLocaleString('en-US') : '-')
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const ONE_LINER = /^\*\*一言で:\*\*\s*(.+)$/m

// スマホで読みやすいよう、冒頭に「今週の傾向」と一言付きの一覧を置き、各リポジトリは
// 「見出し → ★・言語・ライセンス → リンク → 一言 → 詳細」の順にそろえる。
function render({ date = DATE, model = MODEL, repos, carried = [], overview = '' }) {
  const title = `週刊トレンド OSS（${date}）`
  const top = repos.slice(0, 3).map(r => r.fullName.split('/')[1]).join('、')
  const description = `直近 1 週間でスターが急増した OSS ${repos.length} 件を日本語で要約。注目: ${top} ほか`
  const gained = r => (r.starsGained ? `+${fmt(r.starsGained)}` : '')
  const lines = [
    '---',
    `title: ${yamlStr(title)}`,
    `date: ${date}`,
    `category: "${CATEGORY}"`,
    `description: ${yamlStr(description)}`,
    'lang: "日本語"',
    'pageClass: digest-page',
    '---',
    '',
    `# ${title}`,
    '',
  ]
  if (overview) lines.push('::: info 今週の傾向', sanitize(overview), ':::', '')

  // 一覧（タップで各リポジトリへ移動）
  lines.push(`**🔥 今週の ${repos.length} 件**`, '')
  repos.forEach((r, i) => {
    const one = r.summary.match(ONE_LINER)?.[1]
    const star = gained(r) ? `（★${gained(r)}）` : ''
    lines.push(`${i + 1}. [${r.fullName}](#${slug(r.fullName)})${star}${one ? `<br>${sanitize(one)}` : ''}`)
  })
  lines.push('')

  repos.forEach((r, i) => {
    lines.push(`## ${i + 1}. ${r.fullName} {#${slug(r.fullName)}}`, '')
    const meta = [
      `★ ${fmt(r.stars)}${gained(r) ? `（今週 ${gained(r)}）` : ''}`,
      r.language ? sanitize(r.language) : null,
      r.license || null,
      `[GitHub ↗](${r.url})`,
      r.homepage ? `[Website ↗](${r.homepage})` : null,
    ].filter(Boolean)
    lines.push(meta.join(' ・ '), '')
    const one = r.summary.match(ONE_LINER)?.[1]
    if (one) lines.push('::: tip 一言で', sanitize(one), ':::', '')
    if (r.description) lines.push(`> ${sanitize(r.description)}`, '')
    lines.push('::: v-pre', '', sanitize(r.summary.replace(ONE_LINER, '').trim()), '', ':::', '')
  })

  if (carried.length) {
    lines.push('## 引き続き注目', '', '直近で既に紹介済みのリポジトリです。', '')
    for (const r of carried) {
      const star = gained(r) ? `（★${gained(r)}）` : ''
      lines.push(`- [${r.fullName}](https://github.com/${r.fullName})${star} ・ [${r.coveredOn} の紹介](./${r.coveredOn}#${slug(r.fullName)})`)
    }
    lines.push('')
  }
  lines.push(
    '::: details このページについて',
    `[Trendshift](https://trendshift.io/) の週間ランキングから収集し、Claude（\`${model}\`）が README をもとに要約しています。`,
    ':::',
    '',
  )
  return lines.join('\n')
}

// 保存済みの data/trending/<DATE>.json から Markdown だけを作り直す（表示形式を変えたとき用）
function rerender() {
  const file = path.join(ROOT, 'data', CATEGORY, `${DATE}.json`)
  if (!fs.existsSync(file)) return log(`${DATE} のデータがないためスキップ`)
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
  fs.writeFileSync(path.join(ROOT, 'docs', CATEGORY, `${DATE}.md`), render({ ...data, carried: (data.carried || []).slice(0, 10) }))
  log(`再描画: docs/${CATEGORY}/${DATE}.md`)
}

// ---------- メイン ----------
async function main() {
  if (process.argv.includes('--render-only')) return rerender()
  log(`トレンド OSS / モデル: ${MODEL}`)
  const candidates = await fromTrendshift()
  log(`Trendshift: ${candidates.length} 件`)

  const covered = new Map()
  for (const { date, data } of readRecentData(path.join(ROOT, 'data', CATEGORY), SKIP_RECENT_DAYS)) {
    for (const r of data.repos || []) {
      const key = r.fullName.toLowerCase()
      if (!covered.has(key) || covered.get(key) < date) covered.set(key, date)
    }
  }

  const fresh = []
  const carried = []
  for (const c of candidates) {
    const coveredOn = covered.get(c.fullName.toLowerCase())
    if (coveredOn) carried.push({ ...c, coveredOn })
    else if (fresh.length < LIMIT) fresh.push(c)
  }
  log(`要約対象 ${fresh.length} 件 / 紹介済み ${carried.length} 件`)
  if (!fresh.length) return log('新たに要約するリポジトリがありません')

  const done = []
  for (const r of fresh) {
    await enrich(r)
    if (r.archived) continue
    try {
      r.summary = await ask(repoPrompt(r), SYSTEM)
      done.push(r)
      log(`要約完了: ${r.fullName}`)
    } catch (e) {
      log(`要約失敗 ${r.fullName}: ${e.message}`)
    }
  }
  if (!done.length) throw new Error('要約に 1 件も成功しませんでした')

  let overview = ''
  try {
    overview = await summarizeOverview(done)
  } catch (e) {
    log(`全体傾向の生成に失敗: ${e.message}`)
  }

  const data = {
    date: DATE,
    model: MODEL,
    overview,
    repos: done.map(({ readme, ...r }) => r),
    carried: carried.map(({ fullName, starsGained, coveredOn }) => ({ fullName, starsGained, coveredOn })),
  }
  writeOutputs(CATEGORY, render({ ...data, carried: data.carried.slice(0, 10) }), data)
}

main().catch(e => {
  console.error(`::error::${e.message}`)
  process.exit(1)
})
