<script setup lang="ts">
import AvatarImage from "@/components/AvatarImage.vue";
import { useAuthStore } from "@/stores/auth";
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

const authStore = useAuthStore();
const route = useRoute();

const isAuthRoute = computed(() => route.name === "auth");
const isWritingRoute = computed(() => route.name === "blog-new" || route.name === "blog-edit");

onMounted(() => {
  void authStore.restoreSession();
});

async function handleLogout() {
  await authStore.logout();
}
</script>

<template>
  <div v-if="isAuthRoute" class="auth-shell">
    <header class="auth-shell-head">
      <RouterLink class="brand-link" to="/blog">Blog</RouterLink>
    </header>
    <main class="auth-shell-main">
      <RouterView />
    </main>
  </div>

  <div v-else class="app-shell app-shell--product">
    <header class="topbar panel-surface">
      <RouterLink class="brand-link" to="/blog">Blog</RouterLink>

      <nav class="topbar-nav">
        <RouterLink class="topbar-link" to="/blog">文章</RouterLink>
        <RouterLink class="topbar-link" to="/checkin">打卡</RouterLink>
        <RouterLink v-if="authStore.user" class="topbar-link" to="/blog/new">
          {{ isWritingRoute ? "编辑中" : "写文章" }}
        </RouterLink>
      </nav>

      <div v-if="authStore.user" class="topbar-user">
        <RouterLink class="user-pill" to="/profile">
          <AvatarImage
            :src="authStore.user.avatarUrl"
            :name="authStore.user.nickname"
            :alt="`${authStore.user.nickname} 的头像`"
            size="sm"
          />
          <span>{{ authStore.user.nickname }} @{{ authStore.user.username }}</span>
        </RouterLink>
        <button class="secondary-button" type="button" @click="handleLogout">
          退出
        </button>
      </div>

      <div v-else class="topbar-user">
        <RouterLink class="ghost-button link-button" to="/auth">登录 / 注册</RouterLink>
      </div>
    </header>

    <main class="content-shell">
      <RouterView />
    </main>
  </div>
</template>
