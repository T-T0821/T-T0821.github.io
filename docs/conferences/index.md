---
title: "主要AI国際会議"
description: "NeurIPS・ICML・ICLR・AAAI・IJCAI・CVPR・ICCV・ECCV・ACL・EMNLP・KDD・WWW の2020年以降の各回のまとめと技術動向"
pageClass: digest-page conf-page
prev: false
next: false
---

# 🎓 主要AI国際会議

AI 分野の主要国際会議について、2020年以降の各回の概要・受賞論文・技術動向への示唆を日本語でまとめています。特に注目された論文は落合フォーマットで要約しています。新しい回が開催されると自動で追加します。

**🆕 最近の回**

1. [ICML 2026](./icml/2026) — 投稿約2.4万本・ソウル開催。拡散 LM の「自由な生成順序」の罠と、拡散モデルの高精度サンプリング理論が受賞した回
2. [ICLR 2026](./iclr/2026) — 投稿約2万本（リオデジャネイロ）。Transformer の簡潔さの理論と「LLM は複数ターンの会話で迷子になる」が最優秀論文に
3. [NeurIPS 2025](./neurips/2025) — 投稿2万本超・2都市開催。アテンションのゲート化、拡散モデルの記憶、RL は推論力を伸ばすのかが問われた回
4. [ICML 2025](./icml/2025) — 投稿1.2万本（バンクーバー）。マスク型拡散 LM、受け身でない協働型 LLM、次トークン予測の創造性の限界が受賞した回
5. [ICLR 2025](./iclr/2025) — 参加者1.1万人（シンガポール）。安全性アラインメントの「浅さ」、LLM のファインチューニング動態、モデル編集が最優秀論文になった回

**🗓️ 開催予定**

- NeurIPS 2026 — 2026年12月6日〜13日 ・ オーストラリア・シドニー（アトランタ・パリにサテライト会場）
- ICLR 2027 — 2027年4月26日〜30日 ・ 未発表
- ICML 2027 — 2027年7月31日〜8月6日 ・ ブラジル・リオデジャネイロ

## 🤖 AI・機械学習全般 {#ml}

「機械学習の3大トップ会議」と呼ばれ、深層学習や基盤モデルの最重要論文が集中します。

::: info 分野の流れ
2020年の GPT-3 受賞から始まり、2022年に Chinchilla（計算最適なスケーリング）と拡散モデル、2023年に DPO と LLM 評価、2024〜2025年に世界モデル・推論と強化学習へと、3会議の最高賞の対象は「大きくする」から「どう学習し、どう検証し、どう安全に使うか」へ移ってきました。投稿数は NeurIPS が約9,500本（2020年）から約2.2万本（2025年）、ICML が約5,000本から約2.4万本（2026年）、ICLR が約2,600本から約2万本（2026年）へ急増しています。
:::

- **[NeurIPS](./neurips/)** — Conference on Neural Information Processing Systems<br><small>[2025](./neurips/2025) ・ [2024](./neurips/2024) ・ [2023](./neurips/2023) ・ [2022](./neurips/2022) ・ [2021](./neurips/2021) ・ [2020](./neurips/2020)</small>
- **[ICML](./icml/)** — International Conference on Machine Learning<br><small>[2026](./icml/2026) ・ [2025](./icml/2025) ・ [2024](./icml/2024) ・ [2023](./icml/2023) ・ [2022](./icml/2022) ・ [2021](./icml/2021) ・ [2020](./icml/2020)</small>
- **[ICLR](./iclr/)** — International Conference on Learning Representations<br><small>[2026](./iclr/2026) ・ [2025](./iclr/2025) ・ [2024](./iclr/2024) ・ [2023](./iclr/2023) ・ [2022](./iclr/2022) ・ [2021](./iclr/2021) ・ [2020](./iclr/2020)</small>

::: tip 💡 分野横断の示唆
- 最先端の研究テーマは「モデル規模」から「データの質・学習後の調整（アラインメントや強化学習）・評価方法」へ移っており、実務でも自社データと評価設計が差別化の源泉になる
- 拡散モデル・状態空間モデル・拡散言語モデルなど、Transformer の自己回帰以外の選択肢が毎年最高賞に入っており、アーキテクチャの多様化は今後も続く
- 安全性・プライバシー・透かし・攻撃耐性が毎年受賞しており、生成 AI を製品に組み込む際の非機能要件として定着した
- 投稿数の急増で査読の信頼性が課題になっており、論文の主張は再現実験やコード公開の有無とあわせて評価する必要がある
:::

## 🏛️ AI全般（老舗・総合） {#ai}

AI分野で最も歴史と権威のある総合国際会議で、理論から応用まで幅広いテーマを扱います。

- **[AAAI](./aaai/)** — AAAI Conference on Artificial Intelligence<br><small>準備中</small>
- **[IJCAI](./ijcai/)** — International Joint Conference on Artificial Intelligence<br><small>準備中</small>

## 👁️ 画像認識・CV {#cv}

コンピュータビジョン分野の最高峰会議です。特にCVPRは全科学分野でもトップクラスの影響力を持ちます。

- **[CVPR](./cvpr/)** — IEEE/CVF Conference on Computer Vision and Pattern Recognition<br><small>準備中</small>
- **[ICCV](./iccv/)** — IEEE/CVF International Conference on Computer Vision<br><small>準備中</small>
- **[ECCV](./eccv/)** — European Conference on Computer Vision<br><small>準備中</small>

## 💬 自然言語処理 {#nlp}

言語モデルやテキスト解析など、NLP分野における世界最高峰の国際会議です。

- **[ACL](./acl/)** — Annual Meeting of the Association for Computational Linguistics<br><small>準備中</small>
- **[EMNLP](./emnlp/)** — Conference on Empirical Methods in Natural Language Processing<br><small>準備中</small>

## 🔎 データマイニング・Web {#dm}

検索技術、推薦システム、ビッグデータ解析など、ITサービスの実装に直結する研究が集まります。

- **[KDD](./kdd/)** — ACM SIGKDD Conference on Knowledge Discovery and Data Mining<br><small>準備中</small>
- **[WWW](./www/)** — The ACM Web Conference (WWW)<br><small>準備中</small>
