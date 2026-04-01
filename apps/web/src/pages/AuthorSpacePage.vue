<script setup lang="ts">
import AvatarImage from "@/components/AvatarImage.vue";
import BlogPostCard from "@/components/BlogPostCard.vue";
import { useBlogStore } from "@/stores/blog";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const blogStore = useBlogStore();

const authorId = computed(() => String(route.params.authorId ?? ""));

watch(
  authorId,
  (nextAuthorId) => {
    if (nextAuthorId) {
      void blogStore.loadAuthorSpace(nextAuthorId);
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <section class="page-stack">
    <section v-if="blogStore.loadingDetail" class="empty-card">
      <h3>正在加载作者主页</h3>
      <p>请稍候。</p>
    </section>

    <template v-else-if="blogStore.authorSpace">
      <section class="detail-hero author-hero">
        <AvatarImage
          :src="blogStore.authorSpace.user.avatarUrl"
          :name="blogStore.authorSpace.user.nickname"
          :alt="`${blogStore.authorSpace.user.nickname} 的头像`"
          size="xl"
          preview
        />

        <div class="author-hero-copy">
          <h1>{{ blogStore.authorSpace.user.nickname }}</h1>
          <p v-if="blogStore.authorSpace.user.bio" class="hero-copy">
            {{ blogStore.authorSpace.user.bio }}
          </p>

          <div class="profile-summary-row">
            <span class="portal-chip">
              <strong>地区:</strong> {{ blogStore.authorSpace.user.region || "未设置" }}
            </span>
            <span class="portal-chip">
              <strong>站点:</strong> {{ blogStore.authorSpace.user.website || "未设置" }}
            </span>
            <span class="portal-chip">
              <strong>文章:</strong> {{ blogStore.authorSpace.posts.length }} 篇
            </span>
          </div>
        </div>
      </section>

      <section v-if="blogStore.authorSpace.posts.length" class="content-grid">
        <BlogPostCard
          v-for="post in blogStore.authorSpace.posts"
          :key="post.id"
          :post="post"
        />
      </section>

      <section v-else class="empty-card">
        <h3>这个作者还没有发布文章</h3>
        <p>稍后再来看看。</p>
      </section>
    </template>

    <section v-else class="empty-card">
      <h3>作者不存在</h3>
      <p>请检查链接是否正确。</p>
    </section>

    <p v-if="blogStore.error" class="helper-copy danger-copy">
      {{ blogStore.error }}
    </p>
  </section>
</template>
