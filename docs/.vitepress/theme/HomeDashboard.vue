<template>
  <div class="home-dashboard">
    <section>
      <h2 class="home-heading">
        📅 最新のダイジェスト
        <span v-if="latestDate" class="home-heading-sub">{{ shortDate(latestDate) }} 更新</span>
      </h2>
      <p class="home-lead">毎朝 9:00（JST）ごろ、各分野のニュース・論文と注目 OSS を日本語で要約して追加しています。</p>
      <div class="digest-grid">
        <div v-for="d in digests" :key="d.cat.key" class="digest-card">
          <a :href="withBase(d.latest ? d.latest.url : `/${d.cat.key}/`)" class="digest-main">
            <span class="digest-label">{{ d.cat.icon }} {{ d.cat.label }}</span>
            <span v-if="d.latest" class="digest-date">{{ shortDate(d.latest.date) }}</span>
            <span class="digest-desc">{{ d.latest ? summary(d.latest.description) : 'まだありません' }}</span>
          </a>
          <a :href="withBase(`/${d.cat.key}/`)" class="digest-archive">過去の分を見る →</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as articles } from '../../articles.data'
import { CATEGORIES, shortDate } from '../categories'

const digests = computed(() =>
  CATEGORIES.map(cat => ({
    cat,
    latest: articles.find(a => a.category === cat.key),
  })),
)

const latestDate = computed(() =>
  digests.value.map(d => d.latest?.date ?? '').sort().pop() ?? '',
)

// 「〜を日本語で要約。」の定型部分を落として、話題だけを見せる
function summary(desc: string) {
  const i = desc.indexOf('要約。')
  const rest = i >= 0 ? desc.slice(i + 3).trim() : desc
  return rest || desc
}
</script>
