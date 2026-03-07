import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// カテゴリの表示名マッピング
const CATEGORY_LABELS: Record<string, string> = {
  frontend: '🖥️ Frontend',
  backend: '⚙️ Backend',
  ai: '🤖 AI / Machine Learning',
  devops: '🚀 DevOps',
  security: '🔒 Security',
  other: '📝 Other',
}

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
        .filter((f: string) => f.endsWith('.md'))
        .map((f: string) => {
          const slug = f.replace(/\.md$/, '')
          // フロントマターから title を取得（なければスラグをそのまま使用）
          const content = fs.readFileSync(path.join(catDir, f), 'utf-8')
          const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m)
          const title = titleMatch ? titleMatch[1] : slug
          return { text: title, link: `/${cat}/${slug}` }
        })
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
