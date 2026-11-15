// 落合フォーマット（6つの問い）で論文をまとめる共通モジュール。
// 分野別ダイジェストと学会セクションの両方から使い、プロンプトと表示形式をそろえる。
//
//   import { summarizeOchiai, renderOchiai } from '../lib/ochiai.mjs'
//   const ochiai = await summarizeOchiai({ title, url, authors, abstract })
//   lines.push(...renderOchiai(ochiai))

import { ask, extractJson, fetchText, decodeEntities, sanitize, log } from './common.mjs'

export const OCHIAI_QUESTIONS = [
  { key: 'what', label: 'どんなもの？' },
  { key: 'novelty', label: '先行研究と比べてどこがすごい？' },
  { key: 'method', label: '技術や手法のキモはどこ？' },
  { key: 'validation', label: 'どうやって有効だと検証した？' },
  { key: 'discussion', label: '議論はある？' },
  { key: 'next', label: '次に読むべき論文は？' },
]

const MAX_TEXT = 60000

/** arXiv の URL や ID から ID（例: 2611.13406）を取り出す */
export function arxivId(urlOrId) {
  return String(urlOrId || '').match(/(\d{4}\.\d{4,5})(v\d+)?/)?.[1] || ''
}

/**
 * arXiv の HTML 版から本文テキストを取得する（export.arxiv.org のミラーを使用）。
 * 長い場合は冒頭と参考文献を残して切り詰める。取得できなければ空文字。
 */
export async function fetchArxivText(urlOrId) {
  const id = arxivId(urlOrId)
  if (!id) return ''
  try {
    const html = await fetchText(`https://export.arxiv.org/html/${id}`)
    const text = decodeEntities(
      html.replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '),
    )
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length < 2000) return '' // HTML 版がない論文はエラーページなどになる
    if (text.length <= MAX_TEXT) return text
    const refAt = text.lastIndexOf(' References ')
    const refs = refAt > 0 ? text.slice(refAt, refAt + 12000) : ''
    return `${text.slice(0, MAX_TEXT - refs.length)} …(中略)… ${refs}`
  } catch (e) {
    log(`本文取得失敗 ${id}: ${e.message}`)
    return ''
  }
}

const SYSTEM = `あなたは日本の研究者・エンジニア向けに論文を解説する専門家です。
与えられた論文の情報だけを根拠に、落合フォーマット（6つの問い）で正確かつ簡潔な日本語でまとめます。
本文に書かれていない数値・結論を推測で補わないでください。出力は指定された JSON だけにしてください。
原文が中国語の場合も、中国語の語句（例: 档位・上游・渠道・行情・免費）をそのまま使わず自然な日本語に訳してください。製品名・機能名などの固有名詞は原語のままで構いません。`

function buildPrompt(paper, fullText) {
  return `次の論文を落合フォーマットでまとめてください。

<paper>
タイトル: ${paper.title}
著者: ${(paper.authors || []).join(', ') || '不明'}
URL: ${paper.url}
アブストラクト: ${paper.abstract || '(なし)'}
</paper>

<full_text>
${fullText || '(本文は取得できませんでした。アブストラクトだけを根拠にしてください)'}
</full_text>

各項目の書き方:
- what: 何を提案・実現した研究か（2〜3文）
- novelty: 先行研究と比べた新しさ・優れている点（2〜3文）
- method: 技術や手法の核心（2〜4文。重要な仕組みや工夫を具体的に）
- validation: どんな実験・データ・指標で有効性を示したか、主な結果（2〜3文。本文にある数値は使ってよい）
- discussion: 限界、課題、今後の展望、議論の余地（1〜3文）
- next: 次に読むべき論文。本文の参考文献・関連研究に出てくるものから最大3件を選び、論文タイトルと読む理由を書く。URL は書かない。本文がない場合は空配列

次の JSON だけを出力してください（コードブロックは不要）:
{
  "what": "...",
  "novelty": "...",
  "method": "...",
  "validation": "...",
  "discussion": "...",
  "next": [{ "title": "論文タイトル（原題）", "reason": "読む理由（1文）" }]
}`
}

/**
 * 論文を落合フォーマットでまとめる。paper: { title, url, authors?, abstract? }
 * 戻り値: { what, novelty, method, validation, discussion, next: [{title, reason}], basis: 'fulltext'|'abstract' }
 */
export async function summarizeOchiai(paper) {
  const fullText = paper.fullText ?? (await fetchArxivText(paper.url))
  const prompt = buildPrompt(paper, fullText)
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const json = extractJson(await ask(prompt, SYSTEM))
      const result = { basis: fullText ? 'fulltext' : 'abstract' }
      for (const { key } of OCHIAI_QUESTIONS) {
        if (key === 'next') {
          result.next = (Array.isArray(json.next) ? json.next : [])
            .filter(x => x && x.title)
            .slice(0, 3)
            .map(x => ({ title: String(x.title), reason: String(x.reason || '') }))
        } else {
          result[key] = String(json[key] || '').trim()
        }
      }
      if (!result.what || !result.method) throw new Error('必須項目が空です')
      return result
    } catch (e) {
      lastErr = e
      log(`落合フォーマットの生成に失敗（${attempt} 回目）: ${e.message}`)
    }
  }
  throw lastErr
}

/** 落合フォーマットを Markdown の行配列にする（VitePress のカスタムコンテナで囲む） */
export function renderOchiai(o) {
  if (!o) return []
  const lines = ['::: info 📝 落合フォーマット', '']
  for (const { key, label } of OCHIAI_QUESTIONS) {
    if (key === 'next') {
      if (!o.next?.length) continue
      lines.push(`**${label}**`, '')
      for (const n of o.next) lines.push(`- ${sanitize(n.title)}${n.reason ? `：${sanitize(n.reason)}` : ''}`)
      lines.push('')
    } else if (o[key]) {
      lines.push(`**${label}**`, '', sanitize(o[key]), '')
    }
  }
  if (o.basis === 'abstract') lines.push('<small>※ 本文を取得できなかったため、アブストラクトのみに基づいています。</small>', '')
  lines.push(':::', '')
  return lines
}
