<script setup lang="ts">
import type { BlogComment } from "@blog/shared";
import AvatarImage from "@/components/AvatarImage.vue";

defineProps<{
  comments: BlogComment[];
}>();

const emit = defineEmits<{
  remove: [commentId: string];
}>();
</script>

<template>
  <section class="comment-stack">
    <article v-for="comment in comments" :key="comment.id" class="comment-card">
      <div class="comment-head">
        <div class="comment-author-row">
          <AvatarImage
            :src="comment.author.avatarUrl"
            :name="comment.author.nickname"
            :alt="`${comment.author.nickname} 的头像`"
            size="sm"
          />
          <RouterLink class="comment-author" :to="`/authors/${comment.author.id}`">
            {{ comment.author.nickname }}
          </RouterLink>
        </div>
        <p class="comment-date">
          {{ new Date(comment.createdAt).toLocaleString("zh-CN") }}
        </p>
      </div>

      <p class="comment-content">{{ comment.content }}</p>

      <div v-if="comment.canDelete" class="action-row tight">
        <button class="danger-button" type="button" @click="emit('remove', comment.id)">
          删除评论
        </button>
      </div>
    </article>
  </section>
</template>
