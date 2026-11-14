// 会議まとめの注目論文（featured）のうち、落合フォーマットが未作成のものを作る。
// 共通モジュール scripts/lib/ochiai.mjs（arXiv 本文 → ログイン済みの claude CLI）を使う。API キーは不要。
//   node scripts/conferences/ochiai.mjs            … 全会議の未作成分
//   node scripts/conferences/ochiai.mjs neurips    … 指定した会議だけ
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, fetchText, log, toPlain } from '../lib/common.mjs'
import { summarizeOchiai, arxivId } from '../lib/ochiai.mjs'

const DATA = path.join(ROOT, 'data', 'conferences')

async function fetchAbstract(url) {
  const id = arxivId(url)
  if (!id) return ''
  try {
    const xml = await fetchText(`https://export.arxiv.org/api/query?id_list=${id}`)
    return toPlain(xml.match(/<entry>[\s\S]*?<summary>([\s\S]*?)<\/summary>/)?.[1] || '', 3000)
  } catch (e) {
    log(`  要旨の取得に失敗: ${e.message}`)
    return ''
  }
}

async function main() {
  const only = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const meta = JSON.parse(fs.readFileSync(path.join(DATA, 'meta.json'), 'utf-8'))
  let made = 0
  let failed = 0
  for (const [conf, c] of Object.entries(meta.conferences)) {
    if (only.length && !only.includes(conf)) continue
    const dir = path.join(DATA, conf)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir).filter(f => /^\d{4}\.json$/.test(f)).sort()) {
      const file = path.join(dir, f)
      const e = JSON.parse(fs.readFileSync(file, 'utf-8'))
      for (const p of e.featured || []) {
        if (p.ochiai || !arxivId(p.url)) continue
        log(`${c.name} ${e.year}: ${p.title}`)
        try {
          const abstract = await fetchAbstract(p.url)
          p.ochiai = await summarizeOchiai({ title: p.title, url: p.url, authors: p.authors, abstract })
          // 1本ごとに保存して、途中で止まっても作成済みの分は残す
          fs.writeFileSync(file, JSON.stringify(e, null, 2) + '\n')
          made++
        } catch (err) {
          failed++
          log(`  失敗: ${err.message}`)
        }
      }
    }
  }
  log(`落合フォーマット: ${made} 本作成、${failed} 本失敗`)
}

main().catch(e => {
  console.error(`::error::${e.message}`)
  process.exit(1)
})
