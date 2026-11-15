// 既存の週刊ダイジェストのページに categories / tags を付け直す。
// 新しい号は収集スクリプトが最初から付けるので、規則を変えたときにだけ実行すればよい。
// 使い方: node scripts/taxonomy/backfill.mjs
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from '../lib/common.mjs'
import { FIELD_LABEL, digestTaxonomy, taxonomyLines } from '../lib/taxonomy.mjs'

let updated = 0
for (const category of Object.keys(FIELD_LABEL)) {
  const dir = path.join(ROOT, 'docs', category)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))) {
    const mdPath = path.join(dir, file)
    const dataPath = path.join(ROOT, 'data', category, file.replace(/\.md$/, '.json'))
    const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf-8')) : {}
    const md = fs.readFileSync(mdPath, 'utf-8')
    const m = md.match(/^---\n([\s\S]*?)\n---\n/)
    if (!m) continue
    const lines = m[1].split('\n').filter(l => !/^(categories|tags):/.test(l))
    const at = lines.findIndex(l => l.startsWith('category:'))
    lines.splice(at >= 0 ? at + 1 : lines.length, 0, ...taxonomyLines(digestTaxonomy(category, data)))
    const next = `---\n${lines.join('\n')}\n---\n` + md.slice(m[0].length)
    if (next !== md) {
      fs.writeFileSync(mdPath, next)
      updated++
      log(`更新: docs/${category}/${file}`)
    }
  }
}
log(`${updated} 件のページを更新しました`)
