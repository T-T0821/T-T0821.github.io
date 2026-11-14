// data/conferences/ の JSON から docs/conferences/ の Markdown を作る。
// ネットワークも claude CLI も使わないので、何度実行してもよい。
//   node scripts/conferences/render.mjs
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, sanitize, yamlStr, log } from '../lib/common.mjs'
import { renderOchiai } from '../lib/ochiai.mjs'

const DATA = path.join(ROOT, 'data', 'conferences')
const DOCS = path.join(ROOT, 'docs', 'conferences')

export function loadMeta() {
  return JSON.parse(fs.readFileSync(path.join(DATA, 'meta.json'), 'utf-8'))
}

export function loadOverviews() {
  const f = path.join(DATA, 'overviews.json')
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : { fields: {}, conferences: {} }
}

/** data/conferences/<conf>/<year>.json を年の新しい順で返す */
export function loadEditions(conf) {
  const dir = path.join(DATA, conf)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => /^\d{4}\.json$/.test(f))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
    .sort((a, b) => b.year - a.year)
}

const s = t => sanitize(t ?? '')

// "2024-12-10" → "2024年12月10日"、"2024-12" → "2024年12月"
function jpDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  return day ? `${y}年${m}月${day}日` : `${y}年${m}月`
}

export function period(e) {
  if (!e?.start) return ''
  if (!e.end || e.end === e.start) return jpDate(e.start)
  const [y1, m1] = e.start.split('-')
  const [y2, m2, d2] = e.end.split('-').map(Number)
  if (e.start.length === 7) return jpDate(e.start)
  if (y1 === String(y2) && m1 === String(m2).padStart(2, '0')) return `${jpDate(e.start)}〜${d2}日`
  if (y1 === String(y2)) return `${jpDate(e.start)}〜${m2}月${d2}日`
  return `${jpDate(e.start)}〜${jpDate(e.end)}`
}

const num = n => (typeof n === 'number' ? n.toLocaleString('en-US') : n)

function statsLine(st) {
  if (!st) return ''
  const parts = []
  if (st.submissions) parts.push(`投稿 ${num(st.submissions)} 本`)
  if (st.accepted) parts.push(`採択 ${num(st.accepted)} 本`)
  if (st.rate) parts.push(`採択率 ${st.rate}`)
  let line = parts.join(' ／ ')
  if (st.note) line += `（${st.note}）`
  return line
}

// ---------- 各回のページ ----------
function renderEdition(meta, conf, e) {
  const c = meta.conferences[conf]
  const field = meta.fields.find(f => f.key === c.field)
  const sched = c.editions[String(e.year)] || {}
  const title = `${c.name} ${e.year} のまとめ`
  const L = [
    '---',
    `title: ${yamlStr(title)}`,
    `description: ${yamlStr(e.headline || e.summary?.slice(0, 120) || '')}`,
    'pageClass: digest-page conf-page',
    'prev: false',
    'next: false',
    '---',
    '',
    `# ${c.name} ${e.year}`,
    '',
    `${field.icon} ${field.label} ・ [${c.name} の年ごとの流れ](./) ・ [公式サイト ↗](${e.site || c.site})`,
    '',
  ]
  if (e.summary) L.push('::: info この回のまとめ', s(e.summary), ':::', '')

  // 基本情報
  const facts = []
  const when = period(sched)
  if (when) facts.push(`**日程**: ${when}`)
  if (sched.location || e.location) facts.push(`**開催地**: ${s(e.location || sched.location)}`)
  const st = statsLine(e.stats)
  if (st) facts.push(`**規模**: ${s(st)}`)
  if (e.attendees) facts.push(`**参加者**: ${s(e.attendees)}`)
  if (e.keynotes?.length) facts.push(`**招待講演**: ${s(e.keynotes.join('、'))}`)
  if (facts.length) L.push(...facts.map(f => `- ${f}`), '')

  const featured = e.featured || []
  if (featured.length) {
    L.push(`**📝 注目論文（${featured.length} 本）**`, '')
    featured.forEach((p, i) => L.push(`${i + 1}. [${s(p.titleJa || p.title)}](#paper-${i + 1})`))
    L.push('')
  }

  if (e.trends?.length) {
    L.push('## 🔭 この回の主なテーマ', '')
    for (const t of e.trends) L.push(`- ${s(t)}`)
    L.push('')
  }

  if (e.implications?.length) {
    L.push('::: tip 💡 技術動向への示唆')
    for (const t of e.implications) L.push(`- ${s(t)}`)
    L.push(':::', '')
  }

  if (featured.length) {
    L.push('## 📝 注目論文', '')
    featured.forEach((p, i) => {
      L.push(`### ${i + 1}. ${s(p.titleJa || p.title)} {#paper-${i + 1}}`, '')
      const authors = p.authors?.length ? s(p.authors.slice(0, 4).join(', ')) + (p.authors.length > 4 ? ' ほか' : '') : ''
      L.push([p.award ? `🏆 ${s(p.award)}` : '', authors, p.url ? `[論文を読む ↗](${p.url})` : ''].filter(Boolean).join(' ・ '), '')
      if (p.titleJa && p.titleJa !== p.title) L.push(`<small>原題: ${s(p.title)}</small>`, '')
      if (p.why) L.push(s(p.why), '')
      if (p.ochiai) L.push(...renderOchiai(p.ochiai), '')
    })
  }

  if (e.awards?.length) {
    L.push('## 🏆 受賞論文の一覧', '')
    const groups = new Map()
    for (const a of e.awards) {
      if (!groups.has(a.award)) groups.set(a.award, [])
      groups.get(a.award).push(a)
    }
    for (const [award, list] of groups) {
      L.push(`**${s(award)}**`, '')
      for (const a of list) {
        const t = a.url ? `[${s(a.title)}](${a.url})` : s(a.title)
        L.push(`- ${t}${a.authors ? `<br><small>${s(a.authors)}</small>` : ''}`)
      }
      L.push('')
    }
  }

  L.push('## 🔗 出典', '')
  for (const src of e.sources || []) L.push(`- [${s(src.title)}](${src.url})`)
  L.push('')
  if (e.unreachable?.length) {
    L.push('::: warning 確認できなかった情報')
    for (const u of e.unreachable) L.push(`- ${s(u)}`)
    L.push(':::', '')
  }
  L.push(
    '::: details このページについて',
    `公式サイト・受賞発表・ファクトシートなどの一次情報をもとに Claude が日本語でまとめています（${e.updated || ''} 時点）。落合フォーマットは論文本文または要旨から作成しています。正確な内容は各リンク先を確認してください。`,
    ':::',
    '',
  )
  return L.join('\n').replace(/<br><small>/g, '<br><small>')
}

// ---------- 会議ごとのページ ----------
function renderConference(meta, overviews, conf, editions) {
  const c = meta.conferences[conf]
  const field = meta.fields.find(f => f.key === c.field)
  const ov = overviews.conferences?.[conf] || {}
  const L = [
    '---',
    `title: ${yamlStr(`${c.name} の年ごとの流れ`)}`,
    `description: ${yamlStr(`${c.fullName}（${c.name}）の${meta.since}年以降の各回のまとめと技術動向`)}`,
    'pageClass: digest-page conf-page',
    'prev: false',
    'next: false',
    '---',
    '',
    `# ${c.name}`,
    '',
    `${field.icon} [${field.label}](../#${field.key}) ・ ${s(c.fullName)} ・ ${c.cadence} ・ [公式サイト ↗](${c.site})`,
    '',
  ]
  if (ov.summary) L.push('::: info 2020年からの流れ', s(ov.summary), ':::', '')

  const years = Object.keys(c.editions).sort().reverse()
  if (years.length || editions.length) {
    L.push('## 📅 各回のまとめ', '')
    const done = new Map(editions.map(e => [String(e.year), e]))
    const all = [...new Set([...years, ...done.keys()])].sort().reverse()
    for (const y of all) {
      const e = done.get(y)
      const sched = c.editions[y] || {}
      const where = [period(sched), sched.location].filter(Boolean).join(' ・ ')
      if (e) L.push(`- **[${c.name} ${y}](./${y})** — ${s(e.headline || '')}<br><small>${s(where)}</small>`)
      else L.push(`- **${c.name} ${y}** — ${isPast(sched) ? 'まとめを準備中です' : '開催前です'}<br><small>${s(where)}</small>`)
    }
    L.push('')
  }
  if (ov.trends?.length) {
    L.push('## 🔭 年ごとのテーマの移り変わり', '')
    for (const t of ov.trends) L.push(`- ${s(t)}`)
    L.push('')
  }
  if (ov.implications?.length) {
    L.push('::: tip 💡 技術動向への示唆')
    for (const t of ov.implications) L.push(`- ${s(t)}`)
    L.push(':::', '')
  }
  if (!editions.length) L.push('::: warning 準備中', 'この会議のまとめは順次追加します。', ':::', '')
  return L.join('\n')
}

export function todayJst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

export function isPast(sched) {
  if (!sched?.end) return false
  const end = sched.end.length === 7 ? sched.end + '-31' : sched.end
  return end < todayJst()
}

// ---------- 会議セクションのトップ ----------
function renderTop(meta, overviews, all) {
  const L = [
    '---',
    'title: "主要AI国際会議"',
    `description: "NeurIPS・ICML・ICLR・AAAI・IJCAI・CVPR・ICCV・ECCV・ACL・EMNLP・KDD・WWW の${meta.since}年以降の各回のまとめと技術動向"`,
    'pageClass: digest-page conf-page',
    'prev: false',
    'next: false',
    '---',
    '',
    '# 🎓 主要AI国際会議',
    '',
    `AI 分野の主要国際会議について、${meta.since}年以降の各回の概要・受賞論文・技術動向への示唆を日本語でまとめています。特に注目された論文は落合フォーマットで要約しています。新しい回が開催されると自動で追加します。`,
    '',
  ]
  // 最近追加・開催予定
  const recent = all.flatMap(({ conf, editions }) => editions.map(e => ({ conf, e, end: meta.conferences[conf].editions[String(e.year)]?.end || '' })))
    .sort((a, b) => b.end.localeCompare(a.end)).slice(0, 5)
  if (recent.length) {
    L.push('**🆕 最近の回**', '')
    recent.forEach(({ conf, e }, i) => L.push(`${i + 1}. [${meta.conferences[conf].name} ${e.year}](./${conf}/${e.year}) — ${s(e.headline || '')}`))
    L.push('')
  }
  const upcoming = Object.entries(meta.conferences)
    .flatMap(([conf, c]) => Object.entries(c.editions).filter(([, x]) => x.start && !isPast(x)).map(([y, x]) => ({ c, y, x })))
    .sort((a, b) => a.x.start.localeCompare(b.x.start))
  if (upcoming.length) {
    L.push('**🗓️ 開催予定**', '')
    for (const { c, y, x } of upcoming) L.push(`- ${c.name} ${y} — ${s(period(x))} ・ ${s(x.location || '')}`)
    L.push('')
  }

  for (const f of meta.fields) {
    const fov = overviews.fields?.[f.key] || {}
    L.push(`## ${f.icon} ${f.label} {#${f.key}}`, '', s(f.position), '')
    if (fov.summary) L.push('::: info 分野の流れ', s(fov.summary), ':::', '')
    for (const conf of f.conferences) {
      const c = meta.conferences[conf]
      const eds = all.find(x => x.conf === conf)?.editions || []
      const links = eds.map(e => `[${e.year}](./${conf}/${e.year})`).join(' ・ ')
      L.push(`- **[${c.name}](./${conf}/)** — ${s(c.fullName)}<br><small>${links || '準備中'}</small>`)
    }
    L.push('')
    if (fov.implications?.length) {
      L.push('::: tip 💡 分野横断の示唆')
      for (const t of fov.implications) L.push(`- ${s(t)}`)
      L.push(':::', '')
    }
  }
  return L.join('\n')
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null
  if (prev !== text) {
    fs.writeFileSync(file, text)
    log(`出力: ${path.relative(ROOT, file)}`)
  }
}

export function renderAll() {
  const meta = loadMeta()
  const overviews = loadOverviews()
  const all = Object.keys(meta.conferences).map(conf => ({ conf, editions: loadEditions(conf) }))
  for (const { conf, editions } of all) {
    for (const e of editions) write(path.join(DOCS, conf, `${e.year}.md`), renderEdition(meta, conf, e))
    write(path.join(DOCS, conf, 'index.md'), renderConference(meta, overviews, conf, editions))
  }
  write(path.join(DOCS, 'index.md'), renderTop(meta, overviews, all))
}

if (import.meta.url === `file://${process.argv[1]}`) renderAll()
