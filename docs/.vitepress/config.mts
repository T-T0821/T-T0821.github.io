import { defineConfig, type DefaultTheme } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES as daily, type Category } from './categories'
import { blogTheme, CATEGORY_LABEL } from './blog-theme'

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const catText = (c: Category) => `${c.icon} ${c.label}`

// 主要AI国際会議のサイドバー。分野 → 会議 → 年の3段で、会議ごとに折りたたむ
function conferenceSidebar(): DefaultTheme.SidebarItem[] {
  const metaFile = path.resolve(docsDir, '../data/conferences/meta.json')
  if (!fs.existsSync(metaFile)) return []
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
  const years = (conf: string) => {
    const dir = path.join(docsDir, 'conferences', conf)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir).map(f => f.match(/^(\d{4})\.md$/)?.[1]).filter(Boolean).sort().reverse() as string[]
  }
  return [
    { text: '🎓 主要AI国際会議', link: '/conferences/' },
    ...meta.fields.map((f: any) => ({
      text: `${f.icon} ${f.label}`,
      items: f.conferences.map((conf: string) => ({
        text: meta.conferences[conf].name,
        collapsed: true,
        items: [
          { text: '📈 年ごとの流れ', link: `/conferences/${conf}/` },
          ...years(conf).map(y => ({ text: `${y}年`, link: `/conferences/${conf}/${y}` })),
        ],
      })),
    })),
  ]
}

// 週刊ダイジェストの記事では、テーマの「同じカテゴリの記事」一覧を左側に出す。
// 国際会議は分野 → 会議 → 年の階層で探したいので、従来のサイドバーを残す
function buildSidebar(): DefaultTheme.SidebarMulti {
  return {
    '/conferences/': conferenceSidebar(),
    '/': [{ text: '', items: [] }],
  }
}

// 会議ページの「日程: 2024年2月20日〜27日」から開催日を取り出す（記事一覧の並び順と日付表示に使う）
function conferenceDate(file: string): string | undefined {
  if (!fs.existsSync(file)) return
  const m = fs.readFileSync(file, 'utf-8').match(/\*\*日程\*\*:\s*(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?/)
  if (!m) return
  const pad = (v?: string) => String(v ?? 1).padStart(2, '0')
  return `${m[1]}/${pad(m[2])}/${pad(m[3])} 00:00:00`
}

// テーマが集めた記事情報（pagesData）に、タグ・分類・注目フラグを付ける。
// 自動生成スクリプトの出力を変えずに済むよう、パスと既存の frontmatter から決める
function enrichPagesData(): import('vite').Plugin {
  return {
    name: 'ai-tech-blog:enrich-pages-data',
    enforce: 'post',
    config(config: any) {
      const pages: any[] = config.vitepress?.site?.themeConfig?.blog?.pagesData ?? []
      const metaFile = path.resolve(docsDir, '../data/conferences/meta.json')
      const confMeta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf-8')) : null
      const fieldOf = (conf: string) => confMeta?.fields.find((f: any) => f.conferences.includes(conf))
      const latest: Record<string, any> = {}

      for (const page of pages) {
        const route: string = page.route.replace(/\.html$/, '').replace(/\/index$/, '/')
        const parts = route.split('/').filter(Boolean)
        const meta = page.meta
        // 各カテゴリの一覧ページは記事一覧に出さない
        if (route.endsWith('/') || parts.length < 2) {
          meta.hidden = true
          meta.recommend = false
          continue
        }
        const [cat, slug, sub] = parts
        if (CATEGORY_LABEL[cat]) {
          meta.categories = [CATEGORY_LABEL[cat]]
          meta.tags = ['週刊ダイジェスト']
          meta.tag = [CATEGORY_LABEL[cat], '週刊ダイジェスト']
          if (!latest[cat] || meta.date > latest[cat].date) latest[cat] = meta
        } else if (cat === 'conferences' && sub) {
          const conf = confMeta?.conferences?.[slug]
          const field = fieldOf(slug)
          const fieldLabel = field ? `${field.icon} ${field.label}` : undefined
          meta.categories = ['🎓 国際会議']
          meta.tags = [conf?.name ?? slug.toUpperCase(), ...(fieldLabel ? [fieldLabel] : [])]
          meta.tag = ['🎓 国際会議', ...meta.tags]
          const date = conferenceDate(path.join(docsDir, 'conferences', slug, `${sub}.md`))
          if (date) meta.date = date
        }
      }

      // 各カテゴリの最新号を「今週の注目」に出し、トレンド OSS の最新号はトップの記事一覧で先頭に固定する
      daily.forEach((c, i) => {
        const meta = latest[c.key]
        if (!meta) return
        meta.sticky = daily.length - i
        if (c.key === 'trending') meta.top = 1
      })
    },
  }
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // @sugarat/theme の設定を引き継ぐ（記事一覧・タグ・全文検索・RSS などを有効にする）
  extends: blogTheme,
  vite: {
    plugins: [enrichPagesData()],
    // テーマが読み込む .vue 入りのプラグインを SSR ビルドでも変換させる
    ssr: { noExternal: ['vitepress-plugin-product-card'] },
  },
  base: '/',
  lang: 'ja-JP',
  title: 'AI Tech Blog',
  description: '注目の OSS と各分野のニュース・論文を AI が毎週日本語でまとめる技術ダイジェスト',
  // 自動生成記事には README 由来の localhost や相対リンクが含まれることがあり、
  // それでデプロイが止まらないようにリンク切れチェックを無効化する
  ignoreDeadLinks: true,
  cleanUrls: true,
  head: [['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }]],
  themeConfig: {
    logo: '/logo.svg',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'ホーム', link: '/' },
      ...daily.map(c => ({ text: catText(c), link: `/${c.key}/`, activeMatch: `^/${c.key}/` })),
      { text: '🎓 国際会議', link: '/conferences/', activeMatch: '^/conferences/' },
    ],

    sidebar: buildSidebar(),

    // ニュース記事は「ニュース > 各記事(h3)」の構成なので h3 まで目次に出す
    outline: { level: [2, 3], label: 'このページの内容' },

    // 検索はテーマ内蔵の全文検索（Pagefind）を使う。設定は blog-theme.ts
    docFooter: { prev: '前のページ', next: '次のページ' },
    returnToTopLabel: 'ページの先頭へ',
    sidebarMenuLabel: '記事一覧',
    darkModeSwitchLabel: 'ダークモード',
    lightModeSwitchTitle: 'ライトモードに切り替え',
    darkModeSwitchTitle: 'ダークモードに切り替え',
    skipToContentLabel: '本文へ移動',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/T-T0821/T-T0821.github.io' }
    ]
  }
})
