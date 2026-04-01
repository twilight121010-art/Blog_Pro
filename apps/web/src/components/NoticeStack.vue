<script setup lang="ts">
import { useNoticeStore } from "@/stores/notices";

const noticeStore = useNoticeStore();
</script>

<template>
  <teleport to="body">
    <section v-if="noticeStore.items.length" class="notice-stack" aria-live="polite" aria-atomic="true">
      <article
        v-for="item in noticeStore.items"
        :key="item.id"
        class="notice-card"
        :class="`notice-card--${item.tone}`"
      >
        <p>{{ item.message }}</p>
        <button class="notice-dismiss" type="button" @click="noticeStore.remove(item.id)">
          关闭
        </button>
      </article>
    </section>
  </teleport>
</template>

<style scoped>
.notice-stack {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 30;
  display: grid;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
}

.notice-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(31, 36, 48, 0.1);
  background: rgba(255, 250, 242, 0.96);
  box-shadow: var(--shadow-soft);
}

.notice-card p {
  margin: 0;
  line-height: 1.5;
  color: var(--ink-strong);
}

.notice-card--success {
  border-color: rgba(33, 95, 102, 0.24);
}

.notice-card--error {
  border-color: rgba(181, 77, 45, 0.24);
}

.notice-dismiss {
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
}

@media (max-width: 720px) {
  .notice-stack {
    top: 12px;
    right: 12px;
  }
}
</style>
