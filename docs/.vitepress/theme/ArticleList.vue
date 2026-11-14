<template>
  <!-- 月ごとにまとめた日付リスト -->
  <div v-if="items.length" class="daily-list">
    <section v-for="month in months" :key="month.label">
      <h2 class="daily-month">{{ month.label }}</h2>
      <a v-for="a in month.items" :key="a.url" :href="withBase(a.url)" class="daily-row">
        <span class="daily-date">{{ shortDate(a.date) }}</span>
        <span class="daily-desc">{{ a.description || a.title }}</span>
      </a>
    </section>
  </div>

  <p v-else class="no-articles">まだ記事がありません。</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as articles } from '../../articles.data'
import { shortDate } from '../categories'

const props = defineProps<{ category: string }>()

const items = computed(() => articles.filter(a => a.category === props.category))

const months = computed(() => {
  const groups: { label: string; items: typeof articles }[] = []
  for (const a of items.value) {
    const [y, m] = a.date.split('-')
    const label = `${y}年${Number(m)}月`
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(a)
    else groups.push({ label, items: [a] })
  }
  return groups
})
</script>
