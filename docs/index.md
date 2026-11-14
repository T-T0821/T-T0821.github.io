---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "AI Tech Blog"
  text: "毎朝届く技術ダイジェスト"
  tagline: 注目の OSS と、生成AI・AWS・PLC/装置設計・開発手法のニュースや論文を、AI が日本語でまとめています。
  actions:
    - theme: brand
      text: 今日のトレンド OSS
      link: /trending/
    - theme: alt
      text: 生成AIの動向
      link: /genai/
---

<HomeDashboard />

<details class="home-about">
<summary>このサイトの仕組み</summary>

- **毎日のダイジェスト**：毎朝 9:00（JST）ごろ、Trendshift のランキングや各分野の公式ブログ・技術メディア・arXiv などから情報を集め、Claude が日本語で要約して自動でコミットしています。
- **Deep Research 記事**：指定したトピックを GitHub Copilot CLI の Deep Research で調べ、GitHub Actions から記事として公開しています。
- サイトは VitePress で静的に生成し、GitHub Pages で配信しています。ソースは [GitHub](https://github.com/T-T0821/T-T0821.github.io) にあります。

</details>
