import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// カテゴリの表示名マッピング
const CATEGORY_LABELS: Record<string, string> = {
  trending: '🔥 Trending OSS',
  frontend: '🖥️ Frontend',
  backend: '⚙️ Backend',
  ai: '🤖 AI / Machine Learning',
  devops: '🚀 DevOps',
  security: '🔒 Security',
  other: '📝 Other',
}

// サイドバーに表示する Trending 記事の最大件数（全件は /trending/ の一覧ページで閲覧可能）
const TRENDING_SIDEBAR_LIMIT = 14

// docs/ 配下のカテゴリディレクトリを走査してサイドバーを動的生成
function buildSidebar() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const docsDir = path.resolve(__dirname, '..')
  const categories = Object.keys(CATEGORY_LABELS)

  return categories
    .filter(cat => fs.existsSync(path.join(docsDir, cat)))
    .map(cat => {
      const catDir = path.join(docsDir, cat)
      const files = fs.readdirSync(catDir)
        .filter((f: string) => f.endsWith('.md') && f !== 'index.md')
        .map((f: string) => {
          const slug = f.replace(/\.md$/, '')
          // フロントマターから title を取得（なければスラグをそのまま使用）
          const content = fs.readFileSync(path.join(catDir, f), 'utf-8')
          const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m)
          const title = titleMatch ? titleMatch[1] : slug
          return { text: title, link: `/${cat}/${slug}`, slug }
        })
        // 日付ファイル名の Trending は新しい順に並べ、サイドバーには直近分だけ表示
        .sort((a, b) => (cat === 'trending' ? b.slug.localeCompare(a.slug) : 0))
        .slice(0, cat === 'trending' ? TRENDING_SIDEBAR_LIMIT : undefined)
        .map(({ text, link }) => ({ text, link }))
      return {
        text: CATEGORY_LABELS[cat],
        collapsed: false,
        items: files,
      }
    })
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/',
  title: 'AI Tech Blog',
  description: 'GitHub Copilot Deep Research が自動生成する技術ブログ',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Trending', link: '/trending/' },
      { text: 'Frontend', link: '/frontend/' },
      { text: 'Backend', link: '/backend/' },
      { text: 'AI', link: '/ai/' },
      { text: 'DevOps', link: '/devops/' },
    ],

    sidebar: buildSidebar(),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/T-T0821/T-T0821.github.io' }
    ]
  }
})
