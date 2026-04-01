<script setup lang="ts">
import BlogPostCard from "@/components/BlogPostCard.vue";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blog";
import { onMounted, watch } from "vue";

const authStore = useAuthStore();
const blogStore = useBlogStore();

async function reloadPage() {
  await blogStore.loadPublishedPosts();

  if (authStore.user) {
    await blogStore.loadMyPosts();
  } else {
    blogStore.clearMyPosts();
  }
}

onMounted(() => {
  void reloadPage();
});

watch(
  () => authStore.user?.id,
  () => {
    void reloadPage();
  },
);

async function handleArchive(postId: string) {
  await blogStore.archivePost(postId);
}
</script>

<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <h1 class="page-title-xl">最新文章</h1>
      </div>

      <div class="action-row tight">
        <RouterLink
          v-if="authStore.user"
          class="ghost-button link-button"
          to="/blog/new"
        >
          写文章
        </RouterLink>
        <RouterLink v-else class="secondary-button link-button" to="/auth">
          登录后写文章
        </RouterLink>
      </div>
    </div>

    <section v-if="blogStore.publishedPosts.length" class="content-grid">
      <BlogPostCard
        v-for="post in blogStore.publishedPosts"
        :key="post.id"
        :post="post"
        :show-author="true"
      />
    </section>

    <section v-else class="empty-card">
      <h3>还没有公开文章</h3>
      <p>第一篇文章发布后，这里就会出现。</p>
    </section>

    <section v-if="authStore.user" class="page-stack">
      <div class="section-head compact">
        <div>
          <h2>我的文章</h2>
        </div>
      </div>

      <section v-if="blogStore.myPosts.length" class="content-grid">
        <BlogPostCard
          v-for="post in blogStore.myPosts"
          :key="post.id"
          :post="post"
          :show-status="true"
        >
          <template #actions>
            <RouterLink class="secondary-button link-button" :to="`/blog/edit/${post.id}`">
              编辑
            </RouterLink>
            <button class="danger-button" type="button" @click="handleArchive(post.id)">
              归档
            </button>
          </template>
        </BlogPostCard>
      </section>

      <section v-else class="empty-card">
        <h3>你还没有文章</h3>
        <p>开始写下第一篇内容吧。</p>
      </section>
    </section>

    <p v-if="blogStore.error" class="helper-copy danger-copy">
      {{ blogStore.error }}
    </p>
  </section>
</template>
