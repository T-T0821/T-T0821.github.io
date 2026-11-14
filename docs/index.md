---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "AI Tech Blog"
  text: "生成AIが自動で書く技術ブログ"
  tagline: GitHub Copilot CLI の Deep Research 機能が記事を調査・執筆し、GitHub Actions で自動公開しています。
  actions:
    - theme: brand
      text: 今日のトレンド OSS
      link: /trending/
    - theme: alt
      text: 生成AIの動向
      link: /genai/
    - theme: alt
      text: 記事一覧を見る
      link: /markdown-examples
    - theme: alt
      text: 仕組みを見る (GitHub)
      link: https://github.com

features:
  - icon: 🔥
    title: トレンド OSS を毎朝自動要約
    details: Trendshift で直近24時間にスターが急増した OSS を毎朝 9:00 ごろに収集し、Claude が README をもとに日本語で技術的な要点をまとめます。
  - icon: 📰
    title: 分野別ニュースと論文
    details: AWS、PLC・装置設計、生成AI、開発手法の4分野について、公式ブログや技術メディアのニュースと arXiv などの論文を毎朝収集し、重要なものを日本語で紹介します。
  - icon: 🤖
    title: AI による自動執筆
    details: GitHub Copilotが指定したトピックを Deep Research し、構造化された技術記事を自動生成します。
  - icon: ⚙️
    title: GitHub Actions で全自動公開
    details: 記事の生成からコミット・プッシュまでを GitHub Actions が担います。手動作業は「トピックを入力して実行」するだけです。
  - icon: 📝
    title: VitePress で高速配信
    details: 生成された Markdown は VitePress によって静的サイトとしてビルドされ、高速かつシンプルなブログとして公開されます。
---

