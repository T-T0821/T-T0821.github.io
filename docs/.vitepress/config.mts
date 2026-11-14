import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// カテゴリの表示名マッピング
const CATEGORY_LABELS: Record<string, string> = {
  trending: '🔥 Trending OSS',
  aws: '☁️ AWS',
  factory: '🏭 PLC・装置設計',
  genai: '🧠 生成AI',
  engineering: '🛠️ 開発手法・エンジニアリング',
  frontend: '🖥️ Frontend',
  backend: '⚙️ Backend',
  ai: '🤖 AI / Machine Learning',
  devops: '🚀 DevOps',
  security: '🔒 Security',
  other: '📝 Other',
}

// 日次ダイジェスト（ファイル名が YYYY-MM-DD）のカテゴリでサイドバーに表示する最大件数。
// 全件は各カテゴリの一覧ページで閲覧できる
const DAILY_SIDEBAR_LIMIT = 7
const isDaily = (slug: string) => /^\d{4}-\d{2}-\d{2}$/.test(slug)

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
      // 日次ダイジェストは新しい順に並べ、直近分だけ表示
      const daily = files.length > 0 && files.every(f => isDaily(f.slug))
      const items = daily
        ? files.sort((a, b) => b.slug.localeCompare(a.slug)).slice(0, DAILY_SIDEBAR_LIMIT)
        : files
      return {
        text: CATEGORY_LABELS[cat],
        collapsed: daily,
        items: items.map(({ text, link }) => ({ text, link })),
      }
    })
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/',
  title: 'AI Tech Blog',
  description: 'GitHub Copilot Deep Research が自動生成する技術ブログ',
  // 自動生成記事には README 由来の localhost や相対リンクが含まれることがあり、
  // それでデプロイが止まらないようにリンク切れチェックを無効化する
  ignoreDeadLinks: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      {
        text: '毎日のダイジェスト',
        items: [
          { text: '🔥 Trending OSS', link: '/trending/' },
          { text: '☁️ AWS', link: '/aws/' },
          { text: '🏭 PLC・装置設計', link: '/factory/' },
          { text: '🧠 生成AI', link: '/genai/' },
          { text: '🛠️ 開発手法', link: '/engineering/' },
        ],
      },
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
