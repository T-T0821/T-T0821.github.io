import type { Plugin } from 'vite'

// Teek（vitepress-theme-teek 1.6.3）には、表示文言の設定（theme/teek-ja.ts）を通らず
// ソースに中国語が直接書かれている箇所がある。ビルド時にその部分だけ日本語に置き換える。
// Teek のソースは "刚刚" のようなエスケープ表記なので、置き換え前もその表記で書く。
// Teek を更新して該当箇所が変わったときはビルドを止めて気付けるようにしている（下の check）。

interface Patch {
  // 対象ファイル（パスの末尾）
  file: string
  // [置き換え前, 置き換え後]
  replace: [string, string][]
}

const RELATIVE_TIME: [string, string][] = [
  // サイトの情報の「最終更新」などに出る「〜前」の表記
  ['"\\u521A\\u521A"', '"たった今"'], // 刚刚
  [' \\u79D2\\u524D`', ' 秒前`'], // 秒前
  [' \\u5206\\u524D`', ' 分前`'], // 分前
  [' \\u65F6\\u524D`', ' 時間前`'], // 时前
  [' \\u5929\\u524D`', ' 日前`'], // 天前
  [' \\u5468\\u524D`', ' 週間前`'], // 周前
  [' \\u6708\\u524D`', ' か月前`'], // 月前
  [' \\u5E74\\u524D`', ' 年前`'], // 年前
]

const PATCHES: Patch[] = [
  { file: 'vitepress-theme-teek/es/helper/date.mjs', replace: RELATIVE_TIME },
  { file: 'vitepress-theme-teek/es/helper/dist/index.mjs', replace: RELATIVE_TIME },
  {
    // 長いコードブロックの「もっと見る」
    file: 'vitepress-theme-teek/es/components/theme/article-code-block/src/overlay.vue2.mjs',
    replace: [['"\\u67E5\\u770B\\u66F4\\u591A"', '"もっと見る"']], // 查看更多
  },
  {
    // サイトの情報の「全記事の文字数」。中国式の k（千）/ w（万）をやめ、1 万字以上は「◯万」で出す
    file: 'vitepress-theme-teek/es/components/theme/home-card-doc-analysis/src/index.vue2.mjs',
    replace: [[
      'if (wordCount < 1e6) return Math.round(wordCount / 100) / 10 + "k";\n      return Math.round(wordCount / 1e4) / 10 + "w";',
      'return Math.round(wordCount / 1e3) / 10 + "万";',
    ], [
      'if (wordCount < 1e3) return wordCount + "";',
      'if (wordCount < 1e4) return wordCount.toLocaleString("ja-JP");',
    ]],
  },
  {
    // ページ読み込み中の表示（今は使っていないが、有効にしたときのため）
    file: 'vitepress-theme-teek/es/components/theme/route-loading/src/index.vue.mjs',
    replace: [['Teek \\u62FC\\u547D\\u52A0\\u8F7D\\u4E2D ...', '読み込み中 ...']], // 拼命加载中
  },
]

export function teekJaPatch(): Plugin {
  return {
    name: 'teek-ja-patch',
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('?')[0].replace(/\\/g, '/')
      const patch = PATCHES.find(p => path.endsWith(p.file))
      if (!patch) return
      let out = code
      for (const [from, to] of patch.replace) {
        if (!out.includes(from)) {
          this.error(`[teek-ja-patch] ${patch.file} に「${from}」が見つかりません。Teek の更新で中身が変わった可能性があります`)
        }
        out = out.split(from).join(to)
      }
      return { code: out, map: null }
    },
  }
}
