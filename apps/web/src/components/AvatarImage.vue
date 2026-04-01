<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    name?: string | null;
    size?: "sm" | "md" | "lg" | "xl";
    preview?: boolean;
  }>(),
  {
    src: null,
    alt: "头像",
    name: "",
    size: "md",
    preview: false,
  },
);

const failed = ref(false);
const previewOpen = ref(false);

const imageSrc = computed(() => {
  if (failed.value) {
    return null;
  }

  return props.src?.trim() || null;
});

const fallbackLabel = computed(() => {
  const source = (props.name || props.alt || "用户").trim();
  return source.slice(0, 1).toUpperCase() || "用";
});

function handleError() {
  failed.value = true;
}

function openPreview() {
  if (props.preview && imageSrc.value) {
    previewOpen.value = true;
  }
}
</script>

<template>
  <div class="avatar-root">
    <button
      v-if="preview && imageSrc"
      type="button"
      class="avatar-frame avatar-button"
      :class="`avatar-frame--${size}`"
      @click="openPreview"
    >
      <img :src="imageSrc" :alt="alt" class="avatar-image" @error="handleError" />
    </button>

    <div v-else class="avatar-frame" :class="`avatar-frame--${size}`">
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="alt"
        class="avatar-image"
        @error="handleError"
      />
      <span v-else class="avatar-fallback">{{ fallbackLabel }}</span>
    </div>

    <Teleport to="body">
      <div
        v-if="previewOpen && imageSrc"
        class="avatar-lightbox"
        @click.self="previewOpen = false"
      >
        <button
          type="button"
          class="avatar-lightbox-close"
          @click="previewOpen = false"
        >
          关闭
        </button>
        <img :src="imageSrc" :alt="alt" class="avatar-lightbox-image" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.avatar-root {
  display: inline-flex;
}

.avatar-frame {
  display: inline-grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(214, 164, 73, 0.22), rgba(33, 95, 102, 0.2));
  color: var(--ink-strong);
  border: 1px solid rgba(31, 36, 48, 0.1);
  flex-shrink: 0;
}

.avatar-frame--sm {
  width: 36px;
  height: 36px;
}

.avatar-frame--md {
  width: 48px;
  height: 48px;
}

.avatar-frame--lg {
  width: 72px;
  height: 72px;
}

.avatar-frame--xl {
  width: 132px;
  height: 132px;
}

.avatar-button {
  padding: 0;
  cursor: zoom-in;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-fallback {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.avatar-frame--sm .avatar-fallback {
  font-size: 0.82rem;
}

.avatar-frame--md .avatar-fallback {
  font-size: 0.95rem;
}

.avatar-frame--lg .avatar-fallback {
  font-size: 1.1rem;
}

.avatar-frame--xl .avatar-fallback {
  font-size: 1.6rem;
}

.avatar-lightbox {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 24, 31, 0.72);
  backdrop-filter: blur(10px);
}

.avatar-lightbox-image {
  max-width: min(560px, calc(100vw - 48px));
  max-height: calc(100vh - 96px);
  border-radius: 24px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.35);
}

.avatar-lightbox-close {
  position: absolute;
  top: 24px;
  right: 24px;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink-strong);
  cursor: pointer;
}
</style>
