<script setup lang="ts">
import { ref, watch } from "vue";
import type { Habit, HabitUpdateInput } from "@blog/shared";

const props = defineProps<{ habit: Habit }>();

const emit = defineEmits<{
  (e: "save", input: HabitUpdateInput): void;
  (e: "cancel"): void;
}>();

const name = ref(props.habit.name);
const description = ref(props.habit.description ?? "");
const color = ref(props.habit.color ?? "#215f66");
const icon = ref(props.habit.icon ?? "");
const error = ref("");

watch(
  () => props.habit,
  (h) => {
    name.value = h.name;
    description.value = h.description ?? "";
    color.value = h.color ?? "#215f66";
    icon.value = h.icon ?? "";
    error.value = "";
  },
);

function submit() {
  if (!name.value.trim()) {
    error.value = "名称不能为空";
    return;
  }

  error.value = "";
  emit("save", {
    name: name.value.trim(),
    description: description.value.trim() || null,
    color: color.value || null,
    icon: icon.value.trim() || null,
  });
}
</script>

<template>
  <form class="edit-form" @submit.prevent="submit">
    <div class="form-row">
      <label class="form-label">名称 *</label>
      <input v-model="name" class="form-input" type="text" autocomplete="off" />
    </div>
    <div class="form-row">
      <label class="form-label">描述</label>
      <input v-model="description" class="form-input" type="text" placeholder="可选" />
    </div>
    <div class="form-row form-row-inline">
      <div>
        <label class="form-label">颜色</label>
        <input v-model="color" class="form-color" type="color" />
      </div>
      <div>
        <label class="form-label">图标</label>
        <input v-model="icon" class="form-input form-input-sm" type="text" maxlength="4" />
      </div>
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>
    <div class="form-actions">
      <button class="ghost-button" type="submit">保存</button>
      <button class="link-button" type="button" @click="emit('cancel')">取消</button>
    </div>
  </form>
</template>

<style scoped>
.edit-form {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  background: var(--bg-panel-strong);
}

.form-row {
  display: grid;
  gap: 5px;
}

.form-row-inline {
  grid-template-columns: 1fr 1fr;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-muted);
}

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: white;
  color: var(--ink-strong);
  width: 100%;
}

.form-input-sm {
  max-width: 80px;
}

.form-color {
  width: 48px;
  height: 34px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
}

.form-error {
  margin: 0;
  color: var(--accent-red);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.link-button {
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 0.88rem;
}

.link-button:hover {
  color: var(--ink-strong);
}
</style>
