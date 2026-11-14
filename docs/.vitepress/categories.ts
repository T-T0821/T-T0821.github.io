// 日次ダイジェストのカテゴリ定義。ナビ・サイドバー・トップページ・一覧ページが参照する
export interface Category {
  key: string
  icon: string
  label: string
}

export const CATEGORIES: Category[] = [
  { key: 'trending', icon: '🔥', label: 'トレンド OSS' },
  { key: 'genai', icon: '🧠', label: '生成AI' },
  { key: 'aws', icon: '☁️', label: 'AWS' },
  { key: 'factory', icon: '🏭', label: 'PLC・装置設計' },
  { key: 'engineering', icon: '🛠️', label: '開発手法' },
]

export const categoryOf = (key: string) => CATEGORIES.find(c => c.key === key)
export const isDailySlug = (slug: string) => /^\d{4}-\d{2}-\d{2}$/.test(slug)

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// "2026-11-14" → "11/14 (土)"。タイムゾーンに左右されないよう UTC で解釈する
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}/${d} (${wd})`
}
