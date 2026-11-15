import BlogTheme from '@sugarat/theme'
import { inBrowser, useRoute, type EnhanceAppContext } from 'vitepress'
import { h, watch } from 'vue'
import { ElConfigProvider } from 'element-plus'
import ja from 'element-plus/es/locale/lang/ja'
import ArticleList from './ArticleList.vue'
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

export default {
  // @sugarat/theme（VitePress 標準テーマを拡張したブログ向けテーマ）を土台にする
  extends: BlogTheme,
  // テーマ内のページ送り（Element Plus）の文言を日本語にする
  Layout: () => h(ElConfigProvider, { locale: ja }, () => h(BlogTheme.Layout!)),
  enhanceApp({ app }: EnhanceAppContext) {
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
