#!/usr/bin/env node
// 分野別（AWS / PLC・装置設計 / 生成AI / 開発手法）の最新ニュースと論文を収集し、
// Claude で重要なものを選んで日本語で要約し、docs/<category>/YYYY-MM-DD.md に出力する。
//
// 使い方: node scripts/news/collect.mjs [category ...]   （省略時は全分野）
// 任意の環境変数:
//   CLAUDE_MODEL   既定 claude-sonnet-5-5
//   DIGEST_DATE    出力日付 YYYY-MM-DD（既定は JST の今日）

import path from 'node:path'
import {
  ROOT, MODEL, DATE, log, safe, fetchText, fetchJson, parseFeed, toPlain, ask, extractJson,
  sanitize, yamlStr, readRecentData, writeOutputs,
} from '../lib/common.mjs'
import { FIELDS } from './fields.mjs'

const NEWS_WINDOW_HOURS = 48 // これより古いニュースは対象外
const PAPER_WINDOW_DAYS = 5 // arXiv は週末や公開遅延があるため少し広めに
const DEDUPE_DAYS = 14 // この期間に紹介した URL は再掲しない
const MAX_NEWS_CANDIDATES = 60
const MAX_PAPER_CANDIDATES = 40

const now = Date.now()
const within = (date, ms) => date && !Number.isNaN(date.getTime()) && now - date.getTime() <= ms

async function collectNews(field) {
  const lists = await Promise.all(
    field.feeds.map(feed =>
      safe(`${field.label} / ${feed.name}`, async () =>
        parseFeed(await fetchText(feed.url))
          .filter(i => i.title && i.url && within(i.date, NEWS_WINDOW_HOURS * 3600 * 1000))
          .map(i => ({ ...i, source: feed.name })),
      ),
    ),
  )
  return lists.flat().sort((a, b) => b.date - a.date)
}

async function fromArxiv(source) {
  return parseFeed(await fetchText(source.url)).map(p => ({
    ...p,
    url: p.url.replace(/v\d+$/, '').replace('http://', 'https://'),
    authors: p.authors.slice(0, 4),
  }))
}

async function fromHuggingFace() {
  const list = await fetchJson('https://huggingface.co/api/daily_papers')
  return list
    .map(x => ({
      title: toPlain(x.paper?.title || x.title, 300),
      url: `https://arxiv.org/abs/${x.paper?.id}`,
      date: new Date(x.publishedAt || x.paper?.publishedAt),
      summary: toPlain(x.paper?.summary || x.summary, 800),
      upvotes: Number(x.paper?.upvotes || 0),
      authors: (x.paper?.authors || []).slice(0, 4).map(a => a.name),
    }))
    .sort((a, b) => b.upvotes - a.upvotes)
}

async function collectPapers(field) {
  const lists = await Promise.all(
    field.papers.map(src =>
      safe(`${field.label} / ${src.name}`, async () => {
        const items = src.huggingface ? await fromHuggingFace() : await fromArxiv(src)
        return items
          .filter(p => p.title && p.url && within(p.date, PAPER_WINDOW_DAYS * 86400 * 1000))
          .map(p => ({ ...p, source: src.name }))
      }),
    ),
  )
  return lists.flat()
}

const SYSTEM = `あなたは日本のエンジニア向けに技術ニュースと論文を紹介する編集者です。
与えられた候補の情報（タイトルと概要）だけを根拠に、正確で簡潔な日本語で書きます。
候補に書かれていないことを推測で断定しないでください。宣伝的な表現は避けます。
出力は指定された JSON だけにしてください。`

function buildPrompt(field, news, papers) {
  const line = (prefix, i, x) =>
    `[${prefix}${i}] ${x.title}\n出典: ${x.source} / ${x.date.toISOString().slice(0, 10)}` +
    (x.authors?.length ? ` / 著者: ${x.authors.join(', ')}` : '') +
    (x.upvotes ? ` / 注目度: ${x.upvotes}` : '') +
    `\n概要: ${x.summary || '(なし)'}`
  return `分野「${field.label}」の今日のダイジェストを作ります。この分野の関心事: ${field.focus}

<news>
${news.map((x, i) => line('n', i, x)).join('\n\n') || '(候補なし)'}
</news>

<papers>
${papers.map((x, i) => line('p', i, x)).join('\n\n') || '(候補なし)'}
</papers>

手順:
1. news から、この分野のエンジニアにとって重要度の高いものを最大 8 件選ぶ（分野に関係の薄いものは選ばない）。
2. papers から、この分野に関係があり実務・研究で注目すべきものを最大 5 件選ぶ（関係の薄いものしかなければ 0 件でよい）。
3. 選んだものを重要度の高い順に並べ、それぞれ日本語で要約する。
4. 全体の動向を 2〜4 文でまとめる。

次の JSON だけを出力してください（コードブロックは不要）:
{
  "overview": "今日の動向（2〜4文）",
  "news": [
    { "id": "n0", "title_ja": "日本語タイトル", "summary": "何が発表・変更されたか（2〜3文）", "impact": "エンジニアへの影響・使いどころ（1文）" }
  ],
  "papers": [
    { "id": "p0", "title_ja": "日本語タイトル", "summary": "何を提案し、どんな結果か（2〜3文）", "why": "注目する理由（1文）" }
  ]
}`
}

async function summarize(field, news, papers) {
  const prompt = buildPrompt(field, news, papers)
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const json = extractJson(await ask(prompt, SYSTEM))
      const pick = (list, prefix, src) =>
        (Array.isArray(list) ? list : [])
          .map(x => ({ ...x, item: src[Number(String(x.id).replace(prefix, ''))] }))
          .filter(x => x.item && x.summary)
      return {
        overview: String(json.overview || ''),
        news: pick(json.news, 'n', news),
        papers: pick(json.papers, 'p', papers),
      }
    } catch (e) {
      lastErr = e
      log(`${field.label}: 要約の解析に失敗（${attempt} 回目）: ${e.message}`)
    }
  }
  throw lastErr
}

function render(field, result) {
  const title = `${DATE} の${field.label}動向`
  const heads = result.news.slice(0, 2).map(n => n.title_ja).join('／')
  const description = `${field.label}の最新ニュース ${result.news.length} 件と論文 ${result.papers.length} 件を日本語で要約。${heads ? heads + ' など' : ''}`
  const lines = [
    '---',
    `title: ${yamlStr(title)}`,
    `date: ${DATE}`,
    `category: "${field.category}"`,
    `description: ${yamlStr(description)}`,
    'lang: "日本語"',
    '---',
    '',
    `# ${title}`,
    '',
    `> ${[...field.feeds.map(f => f.name), ...field.papers.map(p => p.name)].join('・')} から自動収集し、Claude（\`${MODEL}\`）が要約しています。詳細は各リンク先の一次情報を確認してください。`,
    '',
  ]
  if (result.overview) lines.push('## 今日の動向', '', sanitize(result.overview), '')

  if (result.news.length) {
    lines.push('## ニュース', '')
    for (const n of result.news) {
      lines.push(`### ${sanitize(n.title_ja || n.item.title)}`, '')
      lines.push(`[${sanitize(n.item.title)}](${n.item.url}) ・ ${n.item.source} ・ ${n.item.date.toISOString().slice(0, 10)}`, '')
      lines.push(sanitize(n.summary), '')
      if (n.impact) lines.push(`**影響・使いどころ:** ${sanitize(n.impact)}`, '')
    }
  }
  if (result.papers.length) {
    lines.push('## 論文', '')
    for (const p of result.papers) {
      lines.push(`### ${sanitize(p.title_ja || p.item.title)}`, '')
      const authors = p.item.authors?.length ? ` ・ ${sanitize(p.item.authors.join(', '))}${p.item.authors.length >= 4 ? ' ほか' : ''}` : ''
      lines.push(`[${sanitize(p.item.title)}](${p.item.url}) ・ ${p.item.source}${authors}`, '')
      lines.push(sanitize(p.summary), '')
      if (p.why) lines.push(`**注目ポイント:** ${sanitize(p.why)}`, '')
    }
  }
  return lines.join('\n')
}

async function runField(field) {
  const seen = new Set()
  for (const { data } of readRecentData(path.join(ROOT, 'data', field.category), DEDUPE_DAYS)) {
    for (const x of [...(data.news || []), ...(data.papers || [])]) seen.add(x.url)
  }
  const news = (await collectNews(field)).filter(x => !seen.has(x.url)).slice(0, MAX_NEWS_CANDIDATES)
  const papers = (await collectPapers(field)).filter(x => !seen.has(x.url)).slice(0, MAX_PAPER_CANDIDATES)
  log(`${field.label}: 候補 ニュース ${news.length} 件 / 論文 ${papers.length} 件`)
  if (!news.length && !papers.length) return log(`${field.label}: 新しい候補がないためスキップ`)

  const result = await summarize(field, news, papers)
  if (!result.news.length && !result.papers.length) return log(`${field.label}: 選ばれた項目がないためスキップ`)

  const strip = x => ({ title: x.title_ja, summary: x.summary, url: x.item.url, source: x.item.source, original: x.item.title })
  writeOutputs(field.category, render(field, result), {
    date: DATE,
    model: MODEL,
    overview: result.overview,
    news: result.news.map(strip),
    papers: result.papers.map(strip),
  })
}

async function main() {
  const only = process.argv.slice(2)
  const targets = only.length ? FIELDS.filter(f => only.includes(f.category)) : FIELDS
  log(`分野別ダイジェスト / モデル: ${MODEL} / 対象: ${targets.map(f => f.category).join(', ')}`)
  let failed = 0
  for (const field of targets) {
    try {
      await runField(field)
    } catch (e) {
      failed++
      log(`${field.label}: 失敗: ${e.message}`)
    }
  }
  if (failed === targets.length) throw new Error('すべての分野で失敗しました')
}

main().catch(e => {
  console.error(`::error::${e.message}`)
  process.exit(1)
})
