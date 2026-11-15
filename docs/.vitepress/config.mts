import { defineConfig, type DefaultTheme } from 'vitepress'
import { defineTeekConfig } from 'vitepress-theme-teek/config'
import { RssPlugin } from 'vitepress-plugin-rss'
import { teekJaPatch } from './teek-ja-patch'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES as daily, isDailySlug, shortDate, type Category } from './categories'

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 週刊ダイジェストのサイドバーに並べる号数。全件は各カテゴリの一覧ページで見られる
const DAILY_SIDEBAR_LIMIT = 7

interface Page { slug: string; title: string }

// カテゴリ配下の記事（index.md 以外）を読み、新しい順に返す
function listPages(cat: string): Page[] {
  const dir = path.join(docsDir, cat)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .map(f => {
      const slug = f.replace(/\.md$/, '')
      const content = fs.readFileSync(path.join(dir, f), 'utf-8')
      const title = content.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? slug
      const date = content.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] ?? slug
      return { slug, title, date }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

const catText = (c: Category) => `${c.icon} ${c.label}`

// 週刊ダイジェスト用サイドバー。いま見ているカテゴリだけ開き、他は折りたたむ
function dailySidebar(current: string): DefaultTheme.SidebarItem[] {
  return [{
    text: '週刊ダイジェスト',
    items: daily.map(c => ({
      text: catText(c),
      collapsed: c.key !== current,
      items: [
        { text: '📚 すべての日付', link: `/${c.key}/` },
        ...listPages(c.key).slice(0, DAILY_SIDEBAR_LIMIT).map(p => ({
          text: isDailySlug(p.slug) ? shortDate(p.slug) : p.title,
          link: `/${c.key}/${p.slug}`,
        })),
      ],
    })),
  }]
}

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

function buildSidebar(): DefaultTheme.SidebarMulti {
  const sidebar: DefaultTheme.SidebarMulti = {}
  for (const c of daily) sidebar[`/${c.key}/`] = dailySidebar(c.key)
  sidebar['/conferences/'] = conferenceSidebar()
  return sidebar
}

const SITE_URL = 'https://t-t0821.github.io'

// Teek テーマの設定。Teek のブログ機能（記事カードの一覧、カテゴリ・タグ・アーカイブ、
// サイトの情報、記事ページの文字数・読了目安・共有、テーマカラーの切り替えなど）を使う。
// 記事のカテゴリ・タグは各ページの frontmatter（scripts/lib/taxonomy.mjs が付ける）から作られる。
// サイドバーは自作のもの（buildSidebar）を使うので、Teek の自動サイドバーとパーマリンクは切る
const teekConfig = defineTeekConfig({
  teekHome: true,
  vpHome: false,
  // カードはスマホでは記事一覧の下に並ぶ。PC では右側
  homeCardListPosition: 'right',
  homeCardSort: ['category', 'tag', 'docAnalysis', 'friendLink'],
  // 記事ページの見た目。PC 幅では本文・目次・ナビがそれぞれカードになる
  pageStyle: 'segment-nav',
  windowTransition: true,
  sidebarTrigger: true,
  anchorScroll: false,

  // トップのバナー。説明文はタイピング風に切り替わり、下に各分野への入口を並べる
  banner: {
    enabled: true,
    name: 'AI Tech Blog',
    bgStyle: 'partImg',
    imgSrc: '/banner.svg',
    mask: false,
    textColor: '#ffffff',
    descStyle: 'types',
    description: [
      '注目の OSS と各分野のニュース・論文を、AI が毎週日本語でまとめています',
      '毎週日曜の朝 9:00 ごろ更新',
      'NeurIPS・CVPR・ACL など主要な国際会議の流れもまとめています',
    ],
    typesInTime: 120,
    typesOutTime: 40,
    typesNextTime: 2200,
    features: [
      ...daily.map(c => ({ title: catText(c), link: `/${c.key}/` })),
      { title: '🎓 国際会議', link: '/conferences/' },
    ],
  },

  // 記事一覧
  post: {
    postStyle: 'card',
    excerptPosition: 'top',
    showMore: true,
    showCapture: false,
    coverImgMode: 'small',
  },
  page: { pageSize: 8 },

  // サイト紹介のカード（スマホでは一覧の下）
  blogger: {
    name: 'AI Tech Blog',
    slogan: '毎週届く技術ダイジェスト。OSS・生成AI・AWS・PLC/装置設計・開発手法と国際会議',
    avatar: '/logo.svg',
    shape: 'circle-rotate',
    circleSize: 96,
    circleBgImg: '/banner.svg',
  },
  category: { enabled: true, path: '/categories', limit: 8 },
  tag: { enabled: true, path: '/tags', limit: 20 },
  topArticle: { enabled: false },
  docAnalysis: {
    enabled: true,
    createTime: '2026-11-08',
    wordCount: true,
    readingTime: true,
    statistics: { provider: '' as any },
    overrideInfo: [
      { key: 'viewCount', show: false },
      { key: 'visitCount', show: false },
    ],
  },
  // 情報源のカード
  friendLink: {
    enabled: true,
    autoScroll: false,
    list: [
      { name: 'GitHub Trending', desc: 'トレンド OSS の収集元', link: 'https://github.com/trending', avatar: '/sources/github.svg' },
      { name: 'Trendshift', desc: 'スター急増リポジトリのランキング', link: 'https://trendshift.io/', avatar: '/sources/trendshift.svg' },
      { name: 'Hugging Face Papers', desc: '生成AIの注目論文', link: 'https://huggingface.co/papers', avatar: '/sources/huggingface.svg' },
      { name: 'arXiv', desc: '各分野の論文', link: 'https://arxiv.org/', avatar: '/sources/arxiv.svg' },
      { name: "AWS What's New", desc: 'AWS の新機能', link: 'https://aws.amazon.com/new/', avatar: '/sources/aws.svg' },
    ],
  },

  // 記事ページ
  articleAnalyze: {
    showIcon: true,
    dateFormat: 'yyyy-MM-dd',
    showInfo: true,
    showAuthor: false,
    showCreateDate: true,
    showUpdateDate: false,
    showCategory: true,
    showTag: true,
  },
  // 階層表示はフォルダ名（genai など）になるので使わない。カテゴリは記事の情報に出る
  breadcrumb: { enabled: false },
  articleShare: { enabled: true },
  articleUpdate: { enabled: true, limit: 3 },

  // お知らせ（右上のベル）。中身は theme/NoticeContent.vue
  notice: {
    enabled: true,
    title: 'お知らせ',
    initOpen: false,
    mobileMinify: true,
    twinkle: false,
    // 標準の右上だと記事のタイトルや目次ボタンに重なるので、スマホでも空いている左下に置く
    iconStyle: { top: 'auto', bottom: '24px', left: '16px', right: 'auto', opacity: 0.85 },
    position: 'center',
    // true にすると Teek 1.6.3 ではビルド時（SSR）に localStorage を読んでエラーになる
    useStorage: false,
  },

  backTop: { enabled: true, content: 'progress' },
  // コメント欄は置かないので「コメントへ」ボタンも出さない
  toComment: { enabled: false },
  footerInfo: {
    topMessage: ['各記事は AI（Claude）が公開情報をもとに自動で要約しています。内容は元の情報源でご確認ください。'],
    copyright: { suffix: 'AI Tech Blog' },
    theme: { show: true, name: 'テーマ: Teek' },
  },

  // テーマカラーの切り替え（右下のボタン）。選んだ色は端末ごとに保存される
  themeEnhance: {
    position: 'top',
    layoutSwitch: { hidden: true },
    spotlight: { hidden: true },
    themeColor: { defaultColorName: 'vp-primary', defaultSpread: false },
  },

  vitePlugins: {
    sidebar: false,
    permalink: false,
    autoFrontmatter: false,
    mdH1: false,
    docAnalysis: true,
    // サイトの情報の「記事の数」「文字数」と記事ページの「読了目安」の集計。
    // 一覧ページ（index.md やアーカイブなど）は数えず、日本語は 1 分あたり 500 字で読了目安を出す
    docAnalysisOption: { ignoreIndexMd: true, ignoreList: ['archives.md', 'categories.md', 'tags.md'], cn: 500 },
  },
})

// RSS フィード（/feed.rss）。日付のある記事（週刊ダイジェストと国際会議の各回）を新しい順に載せる
const rss = RssPlugin({
  title: 'AI Tech Blog',
  description: '注目の OSS と各分野のニュース・論文を AI が毎週日本語でまとめる技術ダイジェスト',
  baseUrl: SITE_URL,
  language: 'ja-JP',
  copyright: 'Copyright (c) 2026 AI Tech Blog',
  filename: 'feed.rss',
  limit: 50,
  icon: true,
  ariaLabel: 'RSS',
  renderHTML: false,
  filter: post => !!post.frontmatter.categories && post.frontmatter.article !== false,
} as any)

// https://vitepress.dev/reference/site-config
export default defineConfig({
  extends: teekConfig,
  // teekJaPatch: Teek のソースに直接書かれた中国語を日本語にする
  vite: { plugins: [teekJaPatch(), rss] },
  head: [['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }]],
  base: '/',
  lang: 'ja-JP',
  title: 'AI Tech Blog',
  description: '注目の OSS と各分野のニュース・論文を AI が毎週日本語でまとめる技術ダイジェスト',
  // 自動生成記事には README 由来の localhost や相対リンクが含まれることがあり、
  // それでデプロイが止まらないようにリンク切れチェックを無効化する
  ignoreDeadLinks: true,
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'ホーム', link: '/' },
      ...daily.map(c => ({ text: catText(c), link: `/${c.key}/`, activeMatch: `^/${c.key}/` })),
      { text: '🎓 国際会議', link: '/conferences/', activeMatch: '^/conferences/' },
      {
        text: '🗂️ 記事を探す',
        activeMatch: '^/(archives|categories|tags)',
        items: [
          { text: '📅 アーカイブ', link: '/archives' },
          { text: '📂 カテゴリ', link: '/categories' },
          { text: '🏷️ タグ', link: '/tags' },
          { text: '📡 RSS', link: '/feed.rss', target: '_blank' },
        ],
      },
    ],
    logo: '/logo.svg',

    sidebar: buildSidebar(),

    // ニュース記事は「ニュース > 各記事(h3)」の構成なので h3 まで目次に出す
    outline: { level: [2, 3], label: 'このページの内容' },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '検索', buttonAriaLabel: '検索' },
          modal: {
            displayDetails: '詳細を表示',
            resetButtonTitle: 'リセット',
            backButtonTitle: '閉じる',
            noResultsText: '見つかりませんでした',
            footer: { selectText: '選択', navigateText: '移動', closeText: '閉じる' },
          },
        },
      },
    },

    docFooter: { prev: '前のページ', next: '次のページ' },
    returnToTopLabel: 'ページの先頭へ',
    // 見つからないページ（404）の表示
    notFound: {
      title: 'ページが見つかりません',
      quote: 'URL が変わったか、ページが削除された可能性があります。',
      linkLabel: 'ホームへ戻る',
      linkText: 'ホームへ戻る',
      code: '404',
    },
    sidebarMenuLabel: 'メニュー',
    darkModeSwitchLabel: 'ダークモード',
    lightModeSwitchTitle: 'ライトモードに切り替え',
    darkModeSwitchTitle: 'ダークモードに切り替え',
    skipToContentLabel: '本文へ移動',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/T-T0821/T-T0821.github.io' }
    ]
  }
})
