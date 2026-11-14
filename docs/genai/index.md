---
title: "生成AI"
description: "生成AIの最新ニュースと注目論文の日次まとめ"
---

<script setup>
import { data as articles } from './articles.data.ts'
</script>

# 🧠 生成AI

生成AI・LLM・AIエージェントの新モデルや新機能と、Hugging Face で注目された論文を毎朝自動で収集し、Claude が日本語で要点をまとめています。

<ArticleCards :articles="articles" />
