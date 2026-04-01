<script setup lang="ts">
import { ref } from "vue";
import type { HabitCreateInput } from "@blog/shared";

const emit = defineEmits<{
  (e: "submit", input: HabitCreateInput): void;
  (e: "cancel"): void;
}>();

const name = ref("");
const description = ref("");
const color = ref("#215f66");
const icon = ref("");
const error = ref("");

function submit() {
  if (!name.value.trim()) {
    error.value = "打卡项名称不能为空";
    return;
  }

  error.value = "";
  emit("submit", {
    name: name.value.trim(),
    description: description.value.trim() || null,
    color: color.value || null,
    icon: icon.value.trim() || null,
  });
  name.value = "";
  description.value = "";
  color.value = "#215f66";
  icon.value = "";
}
</script>

<template>
  <form class="habit-form" @submit.prevent="submit">
    <div class="form-row">
      <label class="form-label" for="habit-name">名称 *</label>
      <input
        id="habit-name"
        v-model="name"
        class="form-input"
        type="text"
        placeholder="例：每日阅读 30 分钟"
        autocomplete="off"
      />
    </div>

    <div class="form-row">
      <label class="form-label" for="habit-desc">描述</label>
      <input
        id="habit-desc"
        v-model="description"
        class="form-input"
        type="text"
        placeholder="可选"
      />
    </div>

    <div class="form-row form-row-inline">
      <div>
        <label class="form-label" for="habit-color">颜色</label>
        <input id="habit-color" v-model="color" class="form-color" type="color" />
      </div>
      <div>
        <label class="form-label" for="habit-icon">图标（emoji）</label>
        <input
          id="habit-icon"
          v-model="icon"
          class="form-input form-input-sm"
          type="text"
          maxlength="4"
          placeholder="📚"
        />
      </div>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button class="ghost-button" type="submit">创建</button>
      <button class="link-button" type="button" @click="emit('cancel')">取消</button>
    </div>
  </form>
</template>

<style scoped>
.habit-form {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: var(--bg-panel-strong);
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  gap: 6px;
}

.form-row-inline {
  grid-template-columns: 1fr 1fr;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-muted);
  letter-spacing: 0.04em;
}

.form-input {
  padding: 10px 14px;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: white;
  color: var(--ink-strong);
  width: 100%;
}

.form-input-sm {
  max-width: 80px;
}

.form-color {
  width: 48px;
  height: 36px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
}

.form-error {
  margin: 0;
  color: var(--accent-red);
  font-size: 0.88rem;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.link-button {
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 0.9rem;
}

.link-button:hover {
  color: var(--ink-strong);
}
</style>
