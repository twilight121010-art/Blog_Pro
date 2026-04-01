<script setup lang="ts">
import type { BlogPostSummary } from "@blog/shared";
import AvatarImage from "@/components/AvatarImage.vue";
import { computed } from "vue";

const props = defineProps<{
  post: BlogPostSummary;
  showStatus?: boolean;
  showAuthor?: boolean;
}>();

const publishedLabel = computed(() => {
  return props.post.publishedAt
    ? new Date(props.post.publishedAt).toLocaleDateString("zh-CN")
    : "未发布";
});
</script>

<template>
  <article class="post-card">
    <RouterLink
      v-if="post.coverImageUrl"
      class="post-card-cover"
      :to="`/blog/${post.slug}`"
    >
      <img :src="post.coverImageUrl" :alt="post.title" class="post-card-cover-image" />
    </RouterLink>

    <div class="post-card-topline">
      <span v-if="showStatus" class="status-pill">{{ post.status }}</span>
      <span class="post-card-date">{{ publishedLabel }}</span>
    </div>

    <RouterLink class="post-card-title" :to="`/blog/${post.slug}`">
      {{ post.title }}
    </RouterLink>

    <p v-if="post.excerpt" class="post-card-copy">{{ post.excerpt }}</p>

    <div class="post-card-footer">
      <RouterLink
        v-if="showAuthor"
        class="post-card-author link-inline"
        :to="`/authors/${post.author.id}`"
      >
        <AvatarImage
          :src="post.author.avatarUrl"
          :name="post.author.nickname"
          :alt="`${post.author.nickname} 的头像`"
          size="sm"
        />
        <span>{{ post.author.nickname }}</span>
      </RouterLink>
      <p v-else class="post-card-meta">{{ post.status === "PUBLISHED" ? "已发布" : "草稿" }}</p>

      <div class="post-card-stats">
        <p class="post-card-meta">{{ post.commentCount }} 评论</p>
        <p class="post-card-meta">{{ post.likeCount }} 点赞</p>
      </div>
    </div>

    <div v-if="$slots.actions" class="action-row tight">
      <slot name="actions" />
    </div>
  </article>
</template>
