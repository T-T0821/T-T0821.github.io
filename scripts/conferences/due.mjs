// 会議まとめで「やること」があるかを調べる（ネットワーク不要・数秒で終わる）。
//   node scripts/conferences/due.mjs          … 人が読む一覧
//   node scripts/conferences/due.mjs --json   … 機械向け
// 終了コード 0 = やることあり / 3 = なし（定期タスクはここで終了してよい）
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/common.mjs'
import { loadMeta, isPast, todayJst } from './render.mjs'

const meta = loadMeta()
const today = todayJst()
const tasks = []

for (const [conf, c] of Object.entries(meta.conferences)) {
  const years = Object.keys(c.editions).sort()
  // 2020年以降の分をまだ一度も登録していない会議は、初回の一括作成（手作業）を待つ
  if (!years.length) continue
  // 1) 開催が終わったのに、まとめがない回（会期末の3日後から対象。受賞発表のページ公開を待つ）
  for (const y of years) {
    const ed = c.editions[y]
    if (Number(y) < meta.since || !isPast(ed)) continue
    const end = ed.end.length === 7 ? `${ed.end}-28` : ed.end
    const ready = new Date(Date.parse(end) + 3 * 86400_000).toISOString().slice(0, 10) <= today
    const file = path.join(ROOT, 'data', 'conferences', conf, `${y}.json`)
    if (ready && !fs.existsSync(file)) tasks.push({ type: 'write', conf, year: Number(y), name: `${c.name} ${y}`, end: ed.end })
  }
  // 2) 次回の日程が未登録（最後に登録された回が終わっている）
  const last = years[years.length - 1]
  if (isPast(c.editions[last])) tasks.push({ type: 'schedule', conf, name: c.name, after: last })
}

// 3) 落合フォーマットが未作成の注目論文
for (const conf of Object.keys(meta.conferences)) {
  const dir = path.join(ROOT, 'data', 'conferences', conf)
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir).filter(f => /^\d{4}\.json$/.test(f))) {
    const e = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    const missing = (e.featured || []).filter(p => !p.ochiai && /arxiv\.org/.test(p.url || '')).length
    if (missing) tasks.push({ type: 'ochiai', conf, year: e.year, name: `${meta.conferences[conf].name} ${e.year}`, missing })
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ today, tasks }, null, 2))
} else if (!tasks.length) {
  console.log(`${today}: やることはありません`)
} else {
  const label = { write: 'まとめを作成', schedule: '次回の日程を登録', ochiai: '落合フォーマットを作成' }
  console.log(`${today}: やること ${tasks.length} 件`)
  for (const t of tasks) {
    const extra = t.type === 'write' ? `（会期末 ${t.end}）` : t.type === 'schedule' ? `（${t.after} 年より後の回）` : `（${t.missing} 本）`
    console.log(`- ${label[t.type]}: ${t.name}${extra}`)
  }
}
process.exit(tasks.length ? 0 : 3)
