---
title: "AWS"
description: "AWS の最新ニュースと関連論文の日次まとめ"
---

<script setup>
import { data as articles } from './articles.data.ts'
</script>

# ☁️ AWS

AWS の新サービス・機能追加やアーキテクチャの話題と、クラウド関連の論文を毎朝自動で収集し、Claude が日本語で要点をまとめています。

<ArticleCards :articles="articles" />
