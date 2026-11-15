import Teek from 'vitepress-theme-teek'
import 'vitepress-theme-teek/index.css'
import { inBrowser, useRoute, type EnhanceAppContext } from 'vitepress'
import { h, watch } from 'vue'
import ArticleList from './ArticleList.vue'
import HomeDashboard from './HomeDashboard.vue'
import RelatedPosts from './RelatedPosts.vue'
import NoticeContent from './NoticeContent.vue'
import teekJa from './teek-ja'
import './custom.css'

const RELOAD_KEY = 'vp-stale-reload'

// 新しいデプロイ後に古い画面からページ移動（ブラウザバック含む）すると、
// 削除済みの古いページファイルを読もうとして VitePress が 404 を出すことがある。
// 404 表示になったときにサーバー上ではそのページが存在するなら、
// 古い画面が残っているだけなので最新版を読み込み直す。
async function reloadIfPageExists(path: string) {
  try {
    const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) ?? 'null')
    // 同じページで短時間に何度も再読み込みしないようにする
    if (last && last.path === path && Date.now() - last.at < 10_000) return
    const res = await fetch(path, { method: 'HEAD', cache: 'no-store' })
    if (!res.ok) return
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ path, at: Date.now() }))
    location.reload()
  } catch {
    // オフラインなどで確認できないときは何もしない
  }
}

// Teek 1.6.3 のアーカイブは月をオブジェクトのキー（"09"、"10" など）でまとめるため、
// JavaScript の仕様で "10"〜"12" が先頭に来て「10月 → 11月 → 9月」の順になってしまう。
// 数字だけのキーにならないよう見えない文字（U+2060）を前に付け、新しい月から並べ直す
function fixArchiveMonthOrder(posts: any) {
  for (const p of [posts, ...Object.values(posts?.locales ?? {})] as any[]) {
    const byYear = p?.groupPostsByYearMonth
    if (!byYear) continue
    for (const year of Object.keys(byYear)) {
      const sorted = Object.entries(byYear[year] as Record<string, unknown>)
        .sort(([a], [b]) => Number(b.replace(/\D/g, '')) - Number(a.replace(/\D/g, '')))
      byYear[year] = Object.fromEntries(sorted.map(([m, list]) => [`\u2060${Number(m.replace(/\D/g, ''))}`, list]))
    }
  }
}

// 記事ページの「読了目安」は集計プラグインが "20.2m"・"1h20m"・"1d2h" の形で出すので、日本語にする
function jaReadingTime(v: string): string {
  const m = /^(?:(\d+)d)?(?:(\d+)h)?(?:([\d.]+)m)?$/.exec(String(v ?? ''))
  if (!m || !m[0]) return v
  const [, d, h, min] = m
  const parts = [d && `${d}日`, h && `${h}時間`, min && `${Math.max(1, Math.round(Number(min)))}分`].filter(Boolean)
  return parts.length ? `約${parts.join('')}` : v
}

function fixReadingTime(info: any) {
  for (const item of info?.eachFileWords ?? []) item.readingTime = jaReadingTime(item.readingTime)
}

export default {
  extends: Teek,
  // Teek の表示文言を日本語にし、Teek の差し込み口に自作の部品を置く
  Layout: () => h(Teek.Layout, { locale: teekJa }, {
    // トップ: 記事一覧の上に「今週の注目」（各分野の最新号）と国際会議の案内
    'teek-home-post-before': () => h(HomeDashboard),
    // 記事ページ: 末尾の「最近の更新」の前に同じカテゴリの記事
    'teek-doc-update-before': () => h(RelatedPosts),
    // 右上のお知らせの中身
    'teek-notice-content': () => h(NoticeContent),
  }),
  enhanceApp({ app, siteData }: EnhanceAppContext) {
    fixArchiveMonthOrder(siteData.value.themeConfig.posts)
    fixReadingTime(siteData.value.themeConfig.docAnalysisInfo)
    app.component('ArticleList', ArticleList)
  },
  setup() {
    if (!inBrowser) return
    const route = useRoute()
    watch(
      // ページ移動のたびに route.data が差し替わるので、404 から 404 への移動も拾える
      () => route.data,
      data => { if (data.isNotFound) reloadIfPageExists(location.pathname) },
      { immediate: true },
    )
  },
}
