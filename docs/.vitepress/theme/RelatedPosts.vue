<template>
  <!-- 記事ページの末尾に、同じカテゴリの新しい記事を並べる -->
  <section v-if="items.length" class="related-posts">
    <h2 class="related-title">📚 同じカテゴリの記事（{{ category }}）</h2>
    <a v-for="p in items" :key="p.url" :href="withBase(p.url)" class="related-row">
      <span class="related-date">{{ ymd(p.date) }}</span>
      <span class="related-name">{{ p.title }}</span>
    </a>
    <a :href="withBase(`/categories?category=${encodeURIComponent(category)}`)" class="related-more">
      「{{ category }}」の記事をすべて見る →
    </a>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { usePosts } from 'vitepress-theme-teek'

const LIMIT = 5

const { frontmatter, page } = useData()
const posts = usePosts()

const category = computed(() => [frontmatter.value.categories ?? []].flat()[0] as string | undefined ?? '')

// Teek の記事データの url は "/genai/2026-11-15" の形。いまのページと比べるため .md を外してそろえる
const here = computed(() => '/' + page.value.relativePath.replace(/(index)?\.md$/, ''))

const items = computed(() => {
  if (!category.value) return []
  const list = posts.value.groupPosts?.categories?.[category.value] ?? []
  return list
    .filter((p: any) => p.url.replace(/\.html$/, '') !== here.value)
    .slice(0, LIMIT)
})

const ymd = (d: string) => String(d ?? '').slice(0, 10)
</script>

<style scoped>
.related-posts {
  margin-top: 2.5rem;
  padding: 1rem 1.1rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.related-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.related-row {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
  color: inherit;
  text-decoration: none;
}

.related-row:hover .related-name {
  color: var(--vp-c-brand-1);
}

.related-date {
  flex: 0 0 auto;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}

.related-name {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.related-more {
  display: inline-block;
  margin-top: 0.7rem;
  font-size: 0.88rem;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
</style>
