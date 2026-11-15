// @sugarat/theme 独自の設定。項目の一覧は https://theme.sugarat.top/ を参照
// テーマの既定文言は中国語なので、画面に出る文言はここで日本語に置き換えている
import { getThemeConfig } from '@sugarat/theme/node'
import type { Theme } from '@sugarat/theme'
import { CATEGORIES } from './categories'

// 情報源カードのアイコン。外部の favicon は読み込めないことがあるので、絵文字の SVG を埋め込む
const emojiIcon = (emoji: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#ecf5ff"/><text x="32" y="44" font-size="32" text-anchor="middle">${emoji}</text></svg>`)}`

const SITE_URL = 'https://t-t0821.github.io'

const RSS: Theme.RSSOptions = {
  title: 'AI Tech Blog',
  baseUrl: SITE_URL,
  description: '注目の OSS と各分野のニュース・論文を AI が毎週日本語でまとめる技術ダイジェスト',
  language: 'ja',
  copyright: 'Copyright (c) AI Tech Blog',
  filename: 'feed.rss',
  // 新しい号だけで十分なので、件数を絞ってフィードを軽くする
  limit: 30,
}

export const blogTheme = getThemeConfig({
  author: 'AI Tech Blog',
  // frontmatter の date（例: 2026-11-15）をそのまま日付として扱う。
  // ビルドは UTC の環境で動くので 0 にしておくと、日本の閲覧者にも同じ日付で表示される
  timeZone: 0,
  themeColor: 'el-blue',

  // 「3日前」のような相対表記を日本語にする
  formatShowDate: {
    justNow: 'たった今',
    secondsAgo: '秒前',
    minutesAgo: '分前',
    hoursAgo: '時間前',
    daysAgo: '日前',
    weeksAgo: '週間前',
  },

  // 全文検索（Pagefind）。ビルド時に索引を作り、日本語も単語に分けて検索できる
  search: {
    btnPlaceholder: '検索',
    placeholder: '記事を検索（OSS 名・会議名・キーワード）',
    emptyText: '見つかりませんでした',
    loadingText: '検索しています…',
    heading: '{{searchResult}} 件見つかりました',
    toSelect: '選択',
    toNavigate: '移動',
    toClose: '閉じる',
    searchBy: '検索エンジン',
    forceLanguage: 'ja',
    // 日本語は単語の区切りに空白がないので、検索語を単語に分けてから渡す
    customSearchQuery(input: string) {
      const seg = new Intl.Segmenter('ja', { granularity: 'word' })
      return [...seg.segment(input)].filter(s => s.isWordLike).map(s => s.segment).join(' ')
    },
    // 検索結果の日付はファイルの更新日になり、会議ページの開催年とずれるので出さない
    showDate: false,
  } as Theme.SearchConfig,

  // トップの「注目の記事」。frontmatter の sticky で選ぶ（各カテゴリの最新号を自動で選んでいる）
  hotArticle: {
    title: '🔥 今週の注目',
    pageSize: 5,
    nextText: '別の記事を見る',
    empty: '注目の記事はまだありません',
  },

  // 記事を読んでいるときの左側。同じカテゴリの記事を新しい順に並べる
  recommend: {
    title: '📚 同じカテゴリの記事',
    mode: 'directory',
    sort: 'date',
    pageSize: 10,
    search: true,
    searchText: '記事を探す',
    searchPlaceholder: 'タイトルで絞り込み',
    searchEmpty: '該当する記事はありません',
    empty: '関連する記事はまだありません',
    collapseText: '閉じる',
    expandText: '開く',
    showDate: true,
    showNum: true,
  },

  // トップのタグ一覧。タップするとそのタグの記事だけに絞り込める
  homeTags: {
    title: '🏷️ タグで絞り込む',
    showCount: true,
    sort: 'desc',
  },

  article: {
    readingTime: true,
    readingTimePosition: 'inline',
    analyzeTitles: {
      topWordCount: '文字数：{{value}} 字',
      topReadTime: '読了目安：{{value}} 分',
      inlineWordCount: '{{value}} 字',
      inlineReadTime: '{{value}} 分',
      wordCount: '文字数',
      readTime: '読了目安',
      author: '執筆',
      publishDate: '公開日',
      lastUpdated: '最終更新',
      tag: 'タグ',
    },
  },

  // 右上に出るお知らせ。一度閉じたら内容が変わるまで出さない。
  // スマホでは本文を隠さないよう、最初から右上のベルに畳んでおく（タップで開く）
  popover: {
    title: 'お知らせ',
    duration: -1,
    reopen: true,
    // プラグインの mobileMinify は画面幅の取得前に判定されてスマホでも開いてしまうため、ページ表示後に畳む
    onRouteChanged(_route: unknown, show: { value: boolean }) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) show.value = false
    },
    body: [
      { type: 'text', content: '毎週日曜の朝 9:00 ごろ、5 つの分野の週刊ダイジェストを自動で追加しています。' },
      { type: 'text', content: '新しい回が終わった国際会議のまとめも自動で追加されます。' },
      { type: 'button', content: '今週のトレンド OSS', link: '/trending/' },
      { type: 'button', content: '主要AI国際会議', link: '/conferences/', props: { type: 'success' } },
    ],
  },

  // 「友情リンク」枠を、記事のもとにしている情報源の紹介に使う
  friend: {
    title: '📡 情報源',
    list: [
      { nickname: 'Trendshift', des: 'GitHub で伸びている OSS のランキング', url: 'https://trendshift.io/', avatar: emojiIcon('📈') },
      { nickname: 'AWS What\'s New', des: 'AWS の新機能・アップデート', url: 'https://aws.amazon.com/new/', avatar: emojiIcon('☁️') },
      { nickname: 'arXiv', des: '論文のプレプリント', url: 'https://arxiv.org/', avatar: emojiIcon('📄') },
      { nickname: 'GitHub', des: 'このサイトのソースコード', url: 'https://github.com/T-T0821/T-T0821.github.io', avatar: emojiIcon('🐙') },
    ],
  },

  home: {
    name: 'AI Tech Blog',
    motto: '毎週届く技術ダイジェスト',
    inspiring: [
      '注目の OSS と、生成AI・AWS・PLC/装置設計・開発手法のニュースを毎週まとめています',
      '主要AI国際会議の受賞論文を、落合フォーマットで日本語要約しています',
      'すべての記事は Claude が自動で収集・要約しています',
    ],
    inspiringTimeout: 5000,
    pageSize: 8,
    avatarMode: 'split',
    logo: '/logo.svg',
    // スマホでは自己紹介カードを折りたたみ、記事一覧をすぐ見せる
    blogInfoCollapsible: true,
    analysis: {
      articles: { title: ['記事数', '今月', '今週'] },
    },
  },

  footer: {
    copyright: 'AI Tech Blog',
    version: false,
  },

  backToTop: true,
  RSS,
  mermaid: false,
  // 既定の中国語ボタン（記事末尾の投げ銭）は使わない
  buttonAfterArticle: false,
})

// 週刊ダイジェストのカテゴリ表示名（タグ・分類に使う）
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.key, `${c.icon} ${c.label}`]))
