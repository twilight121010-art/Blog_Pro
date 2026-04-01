<script setup lang="ts">
import type { Habit } from "@blog/shared";

const props = defineProps<{
  habit: Habit;
  checkedToday: boolean;
  currentStreak?: number;
}>();

const emit = defineEmits<{
  (e: "checkin", habitId: string): void;
  (e: "undo", habitId: string): void;
  (e: "edit", habit: Habit): void;
  (e: "archive", habitId: string): void;
  (e: "remove", habitId: string): void;
}>();
</script>

<template>
  <div class="habit-item" :style="{ '--habit-color': habit.color ?? '#215f66' }">
    <div class="habit-color-bar" />

    <div class="habit-main">
      <div class="habit-header">
        <span v-if="habit.icon" class="habit-icon">{{ habit.icon }}</span>
        <div class="habit-meta">
          <strong class="habit-name">{{ habit.name }}</strong>
          <span v-if="habit.description" class="habit-desc">{{ habit.description }}</span>
        </div>
        <div class="habit-streak" v-if="currentStreak">
          <span class="streak-count">{{ currentStreak }}</span>
          <span class="streak-label">连续</span>
        </div>
      </div>

      <div class="habit-actions">
        <button
          v-if="!checkedToday"
          class="checkin-button"
          @click="emit('checkin', habit.id)"
        >
          打卡
        </button>
        <button
          v-else
          class="checkin-button checkin-button--done"
          @click="emit('undo', habit.id)"
        >
          已完成 ✓
        </button>

        <button class="icon-button" @click="emit('edit', habit)" title="编辑">
          ✏️
        </button>
        <button class="icon-button" @click="emit('archive', habit.id)" title="归档">
          🗄
        </button>
        <button class="icon-button icon-button--danger" @click="emit('remove', habit.id)" title="删除">
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.habit-item {
  display: flex;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-panel);
}

.habit-color-bar {
  width: 5px;
  flex-shrink: 0;
  background: var(--habit-color);
}

.habit-main {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.habit-header {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.habit-icon {
  font-size: 1.4rem;
  line-height: 1;
  flex-shrink: 0;
}

.habit-meta {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.habit-name {
  font-size: 0.95rem;
  color: var(--ink-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.habit-desc {
  font-size: 0.8rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.habit-streak {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--habit-color) 12%, transparent);
}

.streak-count {
  font-size: 1rem;
  font-weight: 700;
  color: var(--habit-color);
  line-height: 1;
}

.streak-label {
  font-size: 0.65rem;
  color: var(--ink-muted);
}

.habit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkin-button {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--habit-color);
  background: transparent;
  color: var(--habit-color);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.checkin-button:hover {
  background: var(--habit-color);
  color: white;
}

.checkin-button--done {
  background: var(--habit-color);
  color: white;
}

.checkin-button--done:hover {
  background: transparent;
  color: var(--habit-color);
}

.icon-button {
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.icon-button:hover {
  opacity: 1;
}

.icon-button--danger:hover {
  color: var(--accent-red);
}
</style>
