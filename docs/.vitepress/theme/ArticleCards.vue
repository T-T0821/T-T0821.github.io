<template>
  <div v-if="articles.length > 0" class="article-cards">
    <a
      v-for="article in articles"
      :key="article.url"
      :href="article.url"
      class="card"
    >
      <div class="card-body">
        <p v-if="article.frontmatter.date" class="card-date">
          {{ formatDate(article.frontmatter.date) }}
        </p>
        <h2 class="card-title">{{ article.frontmatter.title || article.url }}</h2>
        <p v-if="article.frontmatter.description" class="card-description">
          {{ article.frontmatter.description }}
        </p>
      </div>
      <div class="card-footer">
        <span v-if="article.frontmatter.category" class="card-tag">
          {{ article.frontmatter.category }}
        </span>
        <span class="card-read-more">続きを読む →</span>
      </div>
    </a>
  </div>
  <div v-else class="no-articles">
    <p>まだ記事がありません。</p>
  </div>
</template>

<script setup lang="ts">
interface Frontmatter {
  title?: string
  date?: string | Date
  description?: string
  category?: string
}

interface Article {
  url: string
  frontmatter: Frontmatter
}

defineProps<{
  articles: Article[]
}>()

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>
