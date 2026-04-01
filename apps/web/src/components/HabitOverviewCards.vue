<script setup lang="ts">
import type { HabitsOverview } from "@blog/shared";

defineProps<{ overview: HabitsOverview | null; loading: boolean }>();
</script>

<template>
  <section class="habit-overview-grid">
    <div v-if="loading" class="overview-placeholder">加载中...</div>
    <template v-else-if="overview">
      <div class="status-card">
        <strong>{{ overview.totalHabits }}</strong>
        <p>总打卡项</p>
      </div>
      <div class="status-card">
        <strong>{{ overview.activeHabits }}</strong>
        <p>活跃项目</p>
      </div>
      <div class="status-card">
        <strong>{{ overview.todayCompleted }}</strong>
        <p>今日完成</p>
      </div>
      <div class="status-card">
        <strong>{{ overview.last7DaysCompleted }}</strong>
        <p>近 7 天</p>
      </div>
      <div class="status-card">
        <strong>{{ overview.last30DaysCompleted }}</strong>
        <p>近 30 天</p>
      </div>
    </template>
    <div v-else class="overview-placeholder">暂无数据</div>
  </section>
</template>

<style scoped>
.habit-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.overview-placeholder {
  grid-column: 1 / -1;
  color: var(--ink-muted);
  font-size: 0.9rem;
}
</style>
