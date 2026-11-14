#!/usr/bin/env node
// 分野別（AWS / PLC・装置設計 / 生成AI / 開発手法）の最新ニュースと論文を収集し、
// Claude で重要なものを選んで日本語で要約し、docs/<category>/YYYY-MM-DD.md に出力する。
//
// 使い方: node scripts/news/collect.mjs [category ...]   （省略時は全分野）
//         node scripts/news/collect.mjs --render-only [category ...]
//           保存済みの data/*.json から Markdown だけを作り直す（収集・要約はしない）
// 任意の環境変数:
//   CLAUDE_MODEL   既定 claude-sonnet-5-5
//   DIGEST_DATE    出力日付 YYYY-MM-DD（既定は JST の今日）
//   OCHIAI_PER_FIELD  分野ごとに落合フォーマットで詳しくまとめる論文数（既定 2、0 で無効）

import fs from 'node:fs'
import path from 'node:path'
import {
  ROOT, MODEL, DATE, log, safe, fetchText, fetchJson, parseFeed, toPlain, ask, extractJson,
  sanitize, yamlStr, readRecentData, writeOutputs,
} from '../lib/common.mjs'
import { summarizeOchiai, renderOchiai } from '../lib/ochiai.mjs'
import { FIELDS } from './fields.mjs'

const NEWS_WINDOW_HOURS = 48 // これより古いニュースは対象外
const PAPER_WINDOW_DAYS = 5 // arXiv は週末や公開遅延があるため少し広めに
const DEDUPE_DAYS = 14 // この期間に紹介した URL は再掲しない
const MAX_NEWS_CANDIDATES = 60
const MAX_PAPER_CANDIDATES = 40
// 重要度の高い順に並んだ論文のうち、先頭から何件を落合フォーマットでまとめるか。
// 1 件ごとに本文を読ませるため、Max プランの使用量を見ながら調整する
const OCHIAI_PER_FIELD = Number(process.env.OCHIAI_PER_FIELD ?? 2)

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

// 保存・描画用に 1 件分の情報をまとめる（data/*.json にもこの形で保存し、--render-only で再描画できる）
function toItem(x, noteKey) {
  return {
    title: x.title_ja || x.item.title,
    original: x.item.title,
    url: x.item.url,
    source: x.item.source,
    date: x.item.date && !Number.isNaN(x.item.date.getTime()) ? x.item.date.toISOString().slice(0, 10) : '',
    authors: x.item.authors || [],
    summary: x.summary,
    [noteKey]: x[noteKey] || '',
    ...(x.ochiai ? { ochiai: x.ochiai } : {}),
  }
}

// ---------- Markdown 生成 ----------
// スマホで読みやすいよう、冒頭に「今日の動向」と見出し一覧を置き、各項目は
// 「見出し → 出典・日付・原文リンク → 要約 → 影響（注目点）」の順にそろえる。
function render(field, data) {
  const news = data.news || []
  const papers = data.papers || []
  const title = `${data.date} の${field.label}動向`
  const heads = news.slice(0, 2).map(n => n.title).join('／')
  const description = `${field.label}の最新ニュース ${news.length} 件と論文 ${papers.length} 件を日本語で要約。${heads ? heads + ' など' : ''}`
  const lines = [
    '---',
    `title: ${yamlStr(title)}`,
    `date: ${data.date}`,
    `category: "${field.category}"`,
    `description: ${yamlStr(description)}`,
    'lang: "日本語"',
    'pageClass: digest-page',
    '---',
    '',
    `# ${title}`,
    '',
  ]
  if (data.overview) lines.push('::: info 今日の動向', sanitize(data.overview), ':::', '')

  // 見出し一覧（タップで各項目へ移動）
  const toc = (label, list, prefix) => {
    if (!list.length) return
    lines.push(`**${label}（${list.length} 件）**`, '')
    list.forEach((x, i) => lines.push(`${i + 1}. [${sanitize(x.title)}](#${prefix}-${i + 1})${x.ochiai ? ' 📝' : ''}`))
    lines.push('')
  }
  toc('📰 ニュース', news, 'news')
  toc('📄 論文', papers, 'paper')
  if (papers.some(p => p.ochiai)) lines.push('<small>📝 は落合フォーマットで詳しくまとめた論文です。</small>', '')

  if (news.length) {
    lines.push('## 📰 ニュース', '')
    news.forEach((n, i) => {
      lines.push(`### ${i + 1}. ${sanitize(n.title)} {#news-${i + 1}}`, '')
      lines.push([sanitize(n.source), n.date, `[原文を読む ↗](${n.url})`].filter(Boolean).join(' ・ '), '')
      lines.push(sanitize(n.summary), '')
      if (n.impact) lines.push('::: tip 💡 影響・使いどころ', sanitize(n.impact), ':::', '')
    })
  }
  if (papers.length) {
    lines.push('## 📄 論文', '')
    papers.forEach((p, i) => {
      lines.push(`### ${i + 1}. ${sanitize(p.title)} {#paper-${i + 1}}`, '')
      const authors = p.authors?.length ? `${sanitize(p.authors.join(', '))}${p.authors.length >= 4 ? ' ほか' : ''}` : ''
      lines.push([sanitize(p.source), authors, `[論文を読む ↗](${p.url})`].filter(Boolean).join(' ・ '), '')
      if (p.original && p.original !== p.title) lines.push(`<small>原題: ${sanitize(p.original)}</small>`, '')
      lines.push(sanitize(p.summary), '')
      if (p.why) lines.push('::: tip 🔍 注目ポイント', sanitize(p.why), ':::', '')
      lines.push(...renderOchiai(p.ochiai))
    })
  }
  lines.push(
    '::: details このページについて',
    `${[...field.feeds.map(f => f.name), ...field.papers.map(p => p.name)].join('・')} から自動収集し、Claude（\`${data.model || MODEL}\`）が要約しています。詳細は各リンク先の一次情報を確認してください。`,
    ':::',
    '',
  )
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

  // 特に注目度の高い論文は本文を読んで落合フォーマットでまとめる
  for (const p of result.papers.slice(0, OCHIAI_PER_FIELD)) {
    try {
      p.ochiai = await summarizeOchiai({
        title: p.item.title,
        url: p.item.url,
        authors: p.item.authors,
        abstract: p.item.summary,
      })
      log(`${field.label}: 落合フォーマット作成: ${p.item.title}（${p.ochiai.basis === 'fulltext' ? '本文' : 'アブストラクト'}）`)
    } catch (e) {
      log(`${field.label}: 落合フォーマット失敗: ${p.item.title}: ${e.message}`)
    }
  }

  const data = {
    date: DATE,
    model: MODEL,
    overview: result.overview,
    news: result.news.map(x => toItem(x, 'impact')),
    papers: result.papers.map(x => toItem(x, 'why')),
  }
  writeOutputs(field.category, render(field, data), data)
}

// 保存済みの data/<category>/<DATE>.json から Markdown だけを作り直す（表示形式を変えたとき用）
function rerenderField(field) {
  const file = path.join(ROOT, 'data', field.category, `${DATE}.json`)
  if (!fs.existsSync(file)) return log(`${field.label}: ${DATE} のデータがないためスキップ`)
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
  fs.writeFileSync(path.join(ROOT, 'docs', field.category, `${DATE}.md`), render(field, data))
  log(`再描画: docs/${field.category}/${DATE}.md`)
}

async function main() {
  const args = process.argv.slice(2)
  const only = args.filter(a => !a.startsWith('--'))
  const targets = only.length ? FIELDS.filter(f => only.includes(f.category)) : FIELDS
  if (args.includes('--render-only')) return targets.forEach(rerenderField)
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
