---
title: "Trending OSS"
description: "毎朝自動収集している、直近24時間で注目を集めた OSS の日本語まとめ"
---

<script setup>
import { data as articles } from './articles.data.ts'
</script>

# 🔥 Trending OSS

GitHub Trending や [Trendshift](https://trendshift.io/) などから、直近24時間でスターが急増・注目されている OSS を毎朝 9:00（JST）ごろに自動収集し、Claude が日本語で技術的な要点をまとめています。

<ArticleCards :articles="articles" />
