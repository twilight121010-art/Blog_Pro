<script setup lang="ts">
import type { HabitStats } from "@blog/shared";

defineProps<{ stats: HabitStats | null; loading: boolean }>();
</script>

<template>
  <div class="stats-card">
    <div v-if="loading" class="stats-placeholder">加载中...</div>
    <template v-else-if="stats">
      <div class="stat-row">
        <span class="stat-label">当前连续</span>
        <strong class="stat-value">{{ stats.currentStreak }} 天</strong>
      </div>
      <div class="stat-row">
        <span class="stat-label">最长连续</span>
        <strong class="stat-value">{{ stats.longestStreak }} 天</strong>
      </div>
      <div class="stat-row">
        <span class="stat-label">近 7 天</span>
        <strong class="stat-value">{{ stats.last7Days }}</strong>
      </div>
      <div class="stat-row">
        <span class="stat-label">近 30 天</span>
        <strong class="stat-value">{{ stats.last30Days }}</strong>
      </div>
      <div class="stat-row">
        <span class="stat-label">累计打卡</span>
        <strong class="stat-value">{{ stats.totalCount }}</strong>
      </div>
    </template>
    <div v-else class="stats-placeholder">暂无统计</div>
  </div>
</template>

<style scoped>
.stats-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  background: var(--bg-panel);
}

.stats-placeholder {
  color: var(--ink-muted);
  font-size: 0.88rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 0.84rem;
  color: var(--ink-muted);
}

.stat-value {
  font-size: 0.95rem;
  color: var(--ink-strong);
}
</style>
