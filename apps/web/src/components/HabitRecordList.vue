<script setup lang="ts">
import type { HabitRecord } from "@blog/shared";

defineProps<{
  records: HabitRecord[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "delete", recordId: string): void;
}>();

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div class="record-list">
    <div v-if="loading" class="record-placeholder">加载中...</div>
    <template v-else-if="records.length">
      <div v-for="rec in records.slice(0, 30)" :key="rec.id" class="record-row">
        <div class="record-main">
          <div class="record-head">
            <span class="record-date">{{ formatDate(rec.recordDate) }}</span>
            <span class="record-value">完成 {{ rec.value }} 次</span>
          </div>
          <span v-if="rec.note" class="record-note">{{ rec.note }}</span>
          <span class="record-time">{{ formatTime(rec.createdAt) }}</span>
        </div>
        <button
          class="delete-button"
          @click="emit('delete', rec.id)"
          title="删除记录"
        >
          ×
        </button>
      </div>
    </template>
    <div v-else class="record-placeholder">暂无记录</div>
  </div>
</template>

<style scoped>
.record-list {
  display: grid;
  gap: 4px;
}

.record-placeholder {
  color: var(--ink-muted);
  font-size: 0.88rem;
  padding: 8px 0;
}

.record-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--bg-panel);
  font-size: 0.85rem;
}

.record-main {
  flex: 1;
  display: grid;
  gap: 4px;
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.record-date {
  font-weight: 600;
  color: var(--ink-strong);
}

.record-note {
  color: var(--ink-muted);
  line-height: 1.5;
}

.record-value,
.record-time {
  color: var(--ink-muted);
  font-size: 0.78rem;
}

.delete-button {
  background: transparent;
  border: 0;
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 2px 4px;
  margin-left: auto;
  opacity: 0.4;
  transition: opacity 0.15s, color 0.15s;
}

.delete-button:hover {
  opacity: 1;
  color: var(--accent-red);
}
</style>
