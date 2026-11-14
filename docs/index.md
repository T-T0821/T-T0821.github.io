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
      text: 記事一覧を見る
      link: /markdown-examples
    - theme: alt
      text: 仕組みを見る (GitHub)
      link: https://github.com

features:
  - icon: 🔥
    title: トレンド OSS を毎朝自動要約
    details: GitHub Trending や Trendshift で直近24時間に注目を集めた OSS を毎朝 9:00 に収集し、Claude が日本語で技術的な要点をまとめます。
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

