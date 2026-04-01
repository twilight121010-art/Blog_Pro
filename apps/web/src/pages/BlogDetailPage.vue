<script setup lang="ts">
import AvatarImage from "@/components/AvatarImage.vue";
import BlogCommentList from "@/components/BlogCommentList.vue";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blog";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const blogStore = useBlogStore();
const authStore = useAuthStore();
const commentDraft = ref("");
const feedback = ref("");

const slug = computed(() => String(route.params.slug ?? ""));

watch(
  () => [slug.value, authStore.user?.id] as const,
  ([nextSlug]) => {
    if (nextSlug) {
      void blogStore.loadPost(nextSlug);
    }
  },
  {
    immediate: true,
  },
);

async function handleToggleLike() {
  if (!blogStore.activePost) {
    return;
  }

  if (!authStore.user) {
    feedback.value = "请先登录";
    return;
  }

  feedback.value = "";

  if (blogStore.activePost.likedByViewer) {
    await blogStore.unlikePost(blogStore.activePost.slug);
    return;
  }

  await blogStore.likePost(blogStore.activePost.slug);
}

async function handleCommentSubmit() {
  if (!blogStore.activePost) {
    return;
  }

  if (!authStore.user) {
    feedback.value = "请先登录";
    return;
  }

  feedback.value = "";
  await blogStore.createComment(blogStore.activePost.slug, commentDraft.value);
  commentDraft.value = "";
}

async function handleCommentDelete(commentId: string) {
  if (!blogStore.activePost) {
    return;
  }

  feedback.value = "";
  await blogStore.deleteComment(blogStore.activePost.slug, commentId);
}
</script>

<template>
  <section class="page-stack">
    <section v-if="blogStore.loadingDetail" class="empty-card">
      <h3>文章加载中</h3>
      <p>请稍候。</p>
    </section>

    <section v-else-if="blogStore.activePost" class="page-stack">
      <article class="detail-hero detail-hero--article">
        <div class="article-author-row">
          <RouterLink class="article-author-link" :to="`/authors/${blogStore.activePost.author.id}`">
            <AvatarImage
              :src="blogStore.activePost.author.avatarUrl"
              :name="blogStore.activePost.author.nickname"
              :alt="`${blogStore.activePost.author.nickname} 的头像`"
              size="md"
            />
            <span>{{ blogStore.activePost.author.nickname }}</span>
          </RouterLink>
          <span class="detail-meta">
            {{ new Date(blogStore.activePost.publishedAt || blogStore.activePost.createdAt).toLocaleDateString("zh-CN") }}
          </span>
        </div>

        <h1>{{ blogStore.activePost.title }}</h1>

        <p v-if="blogStore.activePost.excerpt" class="hero-copy">
          {{ blogStore.activePost.excerpt }}
        </p>

        <img
          v-if="blogStore.activePost.coverImageUrl"
          :src="blogStore.activePost.coverImageUrl"
          :alt="blogStore.activePost.title"
          class="detail-cover-image"
        />

        <div class="article-toolbar">
          <span class="detail-meta">{{ blogStore.activePost.commentCount }} 评论</span>
          <span class="detail-meta">{{ blogStore.activePost.likeCount }} 点赞</span>
          <button class="secondary-button" type="button" @click="handleToggleLike">
            {{ blogStore.activePost.likedByViewer ? "取消点赞" : "点赞" }}
          </button>
          <RouterLink
            v-if="blogStore.activePost.canEdit"
            class="secondary-button link-button"
            :to="`/blog/edit/${blogStore.activePost.id}`"
          >
            编辑
          </RouterLink>
        </div>
      </article>

      <article class="markdown-body" v-html="blogStore.activePost.renderedHtml" />

      <section class="panel-surface auth-panel">
        <div class="section-head compact">
          <div>
            <h2>评论</h2>
          </div>
        </div>

        <form class="form-stack" @submit.prevent="handleCommentSubmit">
          <label class="form-field">
            <span>写评论</span>
            <textarea
              v-model.trim="commentDraft"
              class="textarea-input"
              rows="4"
              placeholder="写下你的看法"
            />
          </label>

          <div class="action-row">
            <button class="ghost-button" type="submit" :disabled="blogStore.mutatingInteraction">
              {{ blogStore.mutatingInteraction ? "提交中..." : "发表评论" }}
            </button>
          </div>
        </form>

        <BlogCommentList
          v-if="blogStore.activePost.comments.length"
          :comments="blogStore.activePost.comments"
          @remove="handleCommentDelete"
        />

        <p v-else class="helper-copy">还没有评论。</p>
      </section>
    </section>

    <section v-else class="empty-card">
      <h3>文章不存在</h3>
      <p>这篇文章可能已经删除，或者暂时不可见。</p>
    </section>

    <p v-if="feedback || blogStore.error" class="helper-copy danger-copy">
      {{ feedback || blogStore.error }}
    </p>
  </section>
</template>
