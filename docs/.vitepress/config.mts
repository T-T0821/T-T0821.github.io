import { defineConfig, type DefaultTheme } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, isDailySlug, shortDate, type Category } from './categories'

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 日次ダイジェストのサイドバーに並べる日数。全件は各カテゴリの一覧ページで見られる
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

const daily = CATEGORIES.filter(c => c.group === 'daily')
// 記事がまだないカテゴリはナビとサイドバーに出さない（一覧ページ自体は残す）
const research = CATEGORIES.filter(c => c.group === 'research' && listPages(c.key).length > 0)
const catText = (c: Category) => `${c.icon} ${c.label}`

// 日次ダイジェスト用サイドバー。いま見ているカテゴリだけ開き、他は折りたたむ
function dailySidebar(current: string): DefaultTheme.SidebarItem[] {
  return [{
    text: '毎日のダイジェスト',
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

// Deep Research 記事用サイドバー
function researchSidebar(): DefaultTheme.SidebarItem[] {
  return [{
    text: 'Deep Research 記事',
    items: research.map(c => ({
      text: catText(c),
      link: `/${c.key}/`,
      items: listPages(c.key).map(p => ({ text: p.title, link: `/${c.key}/${p.slug}` })),
    })),
  }]
}

function buildSidebar(): DefaultTheme.SidebarMulti {
  const sidebar: DefaultTheme.SidebarMulti = {}
  for (const c of daily) sidebar[`/${c.key}/`] = dailySidebar(c.key)
  const rs = researchSidebar()
  for (const c of CATEGORIES.filter(c => c.group === 'research')) sidebar[`/${c.key}/`] = rs
  return sidebar
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/',
  lang: 'ja-JP',
  title: 'AI Tech Blog',
  description: '毎朝の技術ダイジェストと Deep Research 記事を AI が自動でまとめるブログ',
  // 自動生成記事には README 由来の localhost や相対リンクが含まれることがあり、
  // それでデプロイが止まらないようにリンク切れチェックを無効化する
  ignoreDeadLinks: true,
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'ホーム', link: '/' },
      {
        text: '毎日のダイジェスト',
        activeMatch: `^/(${daily.map(c => c.key).join('|')})/`,
        items: daily.map(c => ({ text: catText(c), link: `/${c.key}/` })),
      },
      {
        text: 'Deep Research',
        activeMatch: `^/(${CATEGORIES.filter(c => c.group === 'research').map(c => c.key).join('|')})/`,
        items: research.map(c => ({ text: catText(c), link: `/${c.key}/` })),
      },
    ],

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
