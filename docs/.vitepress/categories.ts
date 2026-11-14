// サイト全体で使うカテゴリ定義。ナビ・サイドバー・トップページ・一覧ページが参照する
export type CategoryGroup = 'daily' | 'research'

export interface Category {
  key: string
  icon: string
  label: string
  group: CategoryGroup
}

export const CATEGORIES: Category[] = [
  // 毎朝自動生成される日次ダイジェスト
  { key: 'trending', icon: '🔥', label: 'トレンド OSS', group: 'daily' },
  { key: 'genai', icon: '🧠', label: '生成AI', group: 'daily' },
  { key: 'aws', icon: '☁️', label: 'AWS', group: 'daily' },
  { key: 'factory', icon: '🏭', label: 'PLC・装置設計', group: 'daily' },
  { key: 'engineering', icon: '🛠️', label: '開発手法', group: 'daily' },
  // Deep Research 記事
  { key: 'frontend', icon: '🖥️', label: 'Frontend', group: 'research' },
  { key: 'backend', icon: '⚙️', label: 'Backend', group: 'research' },
  { key: 'ai', icon: '🤖', label: 'AI / 機械学習', group: 'research' },
  { key: 'devops', icon: '🚀', label: 'DevOps', group: 'research' },
  { key: 'security', icon: '🔒', label: 'Security', group: 'research' },
  { key: 'other', icon: '📝', label: 'その他', group: 'research' },
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
