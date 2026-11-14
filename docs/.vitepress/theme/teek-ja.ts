import { en } from 'vitepress-theme-teek'

// Teek には日本語の表示文言がないため、英語版をもとに画面に出る部分だけ日本語にする
const ja: any = JSON.parse(JSON.stringify(en))
ja.lang = 'ja-JP'
Object.assign(ja.tk.rightBottomButton, { backTopTitle: 'ページの先頭へ', toComment: 'コメントへ' })
Object.assign(ja.tk.articleAnalyze, { label: '記事の情報', wordCount: '文字数', readingTime: '読了目安', pageView: '閲覧数' })
Object.assign(ja.tk.image, { error: '読み込めませんでした' })
ja.tk.themeEnhance.title = '表示の調整'
Object.assign(ja.tk.themeEnhance.themeColor, {
  title: 'テーマカラー',
  speedLabel: '全体に反映',
  label: 'テーマカラー',
  tip: 'テーマカラー',
  primaryLabel: '基本',
  successLabel: '緑',
  warningLabel: '橙',
  dangerLabel: '赤',
  helpDesc: 'サイトのアクセントカラーを選べます。「全体に反映」をオンにすると、サイドバーの背景や文字色にも色を広げます。',
  helpTipTitle: 'テーマカラー',
  helpTipContent: '色を選ぶとアクセントカラーが切り替わります。',
})

export default ja
