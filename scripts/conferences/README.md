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
  "featured": [{                                            // 特に注目された論文 1〜2本（最高賞を優先）
    "title": "原題", "titleJa": "日本語の題", "award": "Best Paper",
    "authors": ["..."], "url": "https://arxiv.org/abs/XXXX.XXXXX",
    "why": "注目される理由（2〜3文）"
    // "ochiai" は npm run conf:ochiai が追加する
  }],
  "sources": [{ "title": "出典名", "url": "https://..." }],
  "unreachable": ["確認できなかった情報と理由"]
}
```
