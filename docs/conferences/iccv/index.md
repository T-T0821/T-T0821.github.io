---
title: "ICCV の年ごとの流れ"
description: "IEEE/CVF International Conference on Computer Vision（ICCV）の2020年以降の各回のまとめと技術動向"
article: false
pageClass: digest-page conf-page
prev: false
next: false
---

# ICCV

👁️ [画像認識・CV](../#cv) ・ IEEE/CVF International Conference on Computer Vision ・ 奇数年の秋 ・ [公式サイト ↗](https://iccv.thecvf.com/)

::: info 2020年からの流れ
ICCV は奇数年の秋に開かれる CV の国際会議で、最優秀論文はマー賞（Marr Prize）と呼ばれます。2021年（オンライン）は Vision Transformer を CV の汎用バックボーンにした Swin Transformer、2023年（パリ）は単一光子カメラによる超広帯域の撮像がマー賞を受け、Segment Anything も表彰されました。2025年（ホノルル）はテキストから崩れずに組み立てられるブロック構造を生成する BrickGPT がマー賞で、生成モデルに物理的な制約を組み込む方向が評価されました。投稿は2021年の約6,200本から2025年の約1.1万本に増え、2027年は香港で開催予定です。
:::

## 📅 各回のまとめ

- **ICCV 2027** — 開催前です<br><small>2027年10月2日〜8日 ・ 中国・香港</small>
- **[ICCV 2025](./2025)** — ホノルル開催・投稿1.1万本。テキストから「崩れずに組み立てられる」ブロック構造を生成する BrickGPT がマー賞に<br><small>2025年10月19日〜23日 ・ 米国・ホノルル</small>
- **[ICCV 2023](./2023)** — パリ開催。超広帯域の単一光子イメージングがマー賞、Segment Anything と「すべてをどこでも追跡する」研究も受賞した回<br><small>2023年10月2日〜6日 ・ フランス・パリ</small>
- **[ICCV 2021](./2021)** — オンライン開催。Vision Transformer を CV の汎用バックボーンにした Swin Transformer（Microsoft Research Asia）がマー賞に<br><small>2021年10月11日〜17日 ・ オンライン開催（当初予定はカナダ・モントリオール）</small>

## 🔭 年ごとのテーマの移り変わり

- 2021: Swin Transformer、Mip-NeRF、オープンセット認識
- 2023: 単一光子イメージング、Segment Anything、長期の密な追跡
- 2025: 物理的に実現可能な生成（BrickGPT）、フローモデルによる画像編集、正解姿勢なしの視点合成

::: tip 💡 技術動向への示唆
- Swin Transformer と Segment Anything はその後の CV の標準部品になっており、ICCV の受賞論文は数年先の実務の基盤技術を示すことが多い
- 生成結果が物理的に成り立つか（安定性・組み立て可能性）を問う研究が評価されはじめ、生成 AI を設計や製造に使う道が広がっている
:::
