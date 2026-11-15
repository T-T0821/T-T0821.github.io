<template>
  <!-- 右上のベルから開くお知らせ。更新のタイミングと最新号への近道を出す -->
  <div class="notice-content">
    <p>毎週日曜の朝 9:00（JST）ごろ、各分野のニュース・論文と注目 OSS の週刊ダイジェストを追加しています。</p>
    <p v-if="latestDate" class="notice-latest">最新号: {{ shortDate(latestDate) }}</p>
    <ul>
      <li v-for="d in digests" :key="d.cat.key">
        <a :href="withBase(d.latest ? d.latest.url : `/${d.cat.key}/`)">{{ d.cat.icon }} {{ d.cat.label }}</a>
      </li>
    </ul>
    <p class="notice-rss">
      <a :href="withBase('/feed.rss')">RSS で購読する</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as articles } from '../../articles.data'
import { CATEGORIES, shortDate } from '../categories'

const digests = computed(() => CATEGORIES.map(cat => ({ cat, latest: articles.find(a => a.category === cat.key) })))
const latestDate = computed(() => digests.value.map(d => d.latest?.date ?? '').sort().pop() ?? '')
</script>

<style scoped>
.notice-content {
  padding: 0.25rem 0.5rem 0.5rem;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

.notice-content p {
  margin: 0.4rem 0;
}

.notice-latest {
  font-weight: 700;
}

.notice-content ul {
  margin: 0.2rem 0 0.4rem;
  padding-left: 1.2em;
  list-style: disc;
}

.notice-content a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.notice-rss {
  font-size: 0.85rem;
}
</style>
