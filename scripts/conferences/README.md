# 主要AI国際会議のまとめ（docs/conferences/）

NeurIPS・ICML・ICLR・AAAI・IJCAI・CVPR・ICCV・ECCV・ACL・EMNLP・KDD・WWW について、
2020年以降の各回の概要・受賞論文・技術動向への示唆を日本語でまとめるセクションです。

## ファイル

| パス | 内容 |
|---|---|
| `data/conferences/meta.json` | 分野と会議の定義、各回の日程・開催地（`editions`）。次回の日程もここに登録する |
| `data/conferences/<会議>/<年>.json` | 各回のまとめ（下のスキーマ）。**ページの元データはこれだけ** |
| `data/conferences/overviews.json` | 会議ごと・分野ごとの「年ごとの流れ」と示唆 |
| `docs/conferences/**` | 上の JSON から `npm run conf:render` で生成する。手で編集しない |

## コマンド

- `npm run conf:due` … やることの一覧。終了コード 3 なら何もしなくてよい（ネットワーク不要）
- `npm run conf:ochiai` … `featured` のうち落合フォーマットが未作成の論文を、arXiv 本文と claude CLI で作る
- `npm run conf:render` … JSON から Markdown を作り直す

## 週1回の定期タスクの手順

1. `npm run conf:due` を実行する。終了コード 3（やることなし）なら終了。
2. 「次回の日程を登録」: 公式サイトの日程ページを WebSearch / WebFetch で確認し、
   `meta.json` の `editions` に `{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "location": "国・都市（日本語）", "source": "<URL>" }` を追加する。
   公式に未発表なら何もしない（推測で書かない）。
3. 「まとめを作成」: 下の情報源を WebSearch / WebFetch で確認し、`data/conferences/<会議>/<年>.json` を書く。
   受賞発表がまだ公開されていなければ作らずに次週へ回す。
4. `overviews.json` の該当会議の `summary`・`trends`・`implications` に新しい回を反映する。
5. `npm run conf:ochiai` → `npm run conf:render` → `npm run docs:build` が通ることを確認して、
   `data/conferences` と `docs/conferences` をコミットし main に push する。

### 注目論文の選び方（featured）

1回あたり5本前後（最大6本）。ページにも同じ説明が表示される（`render.mjs` の `SELECTION_NOTE`）。

1. その回の受賞論文を、賞の格の順（最優秀 → 優秀・佳作・次点 → Test of Time）に最大4本。
2. Paper Digest の「Most Influential <会議> Papers」（被引用数の集計）でその年の上位の論文を、合計5本になるまで加える（最低1本）。
   `"selection": "被引用数上位（Paper Digest の集計で同年N位）"` とし、出典 `sources` にそのページを加える。
   開催直後で集計がまだ無い回は受賞論文だけでよい。
3. URL は arXiv で原題が一致したものだけを付ける。arXiv に無い論文は URL なしで載せてよい（落合フォーマットは作られない）。

### 情報源（この順で確認）

- 受賞一覧: `https://<会議>.cc/virtual/<年>/awards_detail`（NeurIPS・ICML・ICLR）、各会議の公式ブログ（blog.neurips.cc / blog.iclr.cc など）
- 規模: 公式のファクトシート（media.neurips.cc / media.iclr.cc）、開会挨拶の発表、Wikipedia の会議記事の表
- 日程・開催地・招待講演: 公式サイトの `Conferences/<年>` ページ
- CV（CVPR・ICCV・ECCV）は thecvf.com / ecva.net、NLP（ACL・EMNLP）は aclweb.org / aclanthology.org、AAAI は aaai.org、IJCAI は ijcai.org、KDD は kdd.org、WWW は thewebconf.org の各回サイト

**記憶だけで書かない。** 取得できなかった項目は書かずに `unreachable` に理由を残す。数値が出典によって違う場合は片方を採用し `stats.note` に併記する。

## 各回の JSON スキーマ

```jsonc
{
  "conf": "neurips", "year": 2025, "updated": "YYYY-MM-DD",
  "headline": "一覧に出す1行の要約（60〜80字）",
  "summary": "この回のまとめ（4〜6文。規模・最高賞・全体の傾向）",
  "stats": { "submissions": 21575, "accepted": 5290, "rate": "24.5%", "note": "任意の補足" },
  "attendees": "任意。参加者数",
  "keynotes": ["招待講演者名", "..."],
  "trends": ["この回の主なテーマ: 説明", "..."],          // 3〜5件
  "implications": ["技術動向への示唆", "..."],             // 2〜4件
  "awards": [{ "award": "Best Paper", "title": "原題", "authors": "著者", "url": "任意（arXiv など）" }],
  "featured": [{                                            // 注目論文 5本前後（下の「注目論文の選び方」）
    "title": "原題", "award": "Best Paper",                 // 受賞していない論文は award の代わりに "selection"
    "authors": ["..."], "url": "https://arxiv.org/abs/XXXX.XXXXX"
    // "titleJa"・"why"・"ochiai" は書かなくてよい。npm run conf:ochiai が論文本文から作る
  }],
  "sources": [{ "title": "出典名", "url": "https://..." }],
  "unreachable": ["確認できなかった情報と理由"]
}
```
