import { createContentLoader } from 'vitepress'

// 全カテゴリの記事（各カテゴリの index.md を除く）を新しい順で読み込む
export interface ArticleData {
  url: string
  category: string
  slug: string
  title: string
  date: string
  description: string
}

declare const data: ArticleData[]
export { data }

const toYmd = (d: unknown) => {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(String(d))
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export default createContentLoader('*/*.md', {
  transform(raw): ArticleData[] {
    return raw
      .filter(p => !p.url.endsWith('/'))
      .map(p => {
        const [, category = '', slug = ''] = p.url.replace(/\.html$/, '').split('/')
        const fm = p.frontmatter
        return {
          url: p.url,
          category,
          slug,
          title: fm.title ?? slug,
          date: toYmd(fm.date) || (/^\d{4}-\d{2}-\d{2}$/.test(slug) ? slug : ''),
          description: fm.description ?? '',
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category))
  },
})
