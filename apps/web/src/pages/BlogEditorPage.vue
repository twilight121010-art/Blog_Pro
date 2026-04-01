<script setup lang="ts">
import { uploadImageFile } from "@/lib/files";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blog";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const authStore = useAuthStore();
const blogStore = useBlogStore();
const route = useRoute();
const router = useRouter();
const feedback = ref("");

const form = reactive({
  title: "",
  coverImageUrl: "",
  status: "DRAFT",
  content: "",
});

const postId = computed(() => {
  return typeof route.params.postId === "string" ? route.params.postId : null;
});

const isEditing = computed(() => postId.value !== null);
const primaryActionLabel = computed(() => {
  if (!isEditing.value) {
    return "发布文章";
  }

  return form.status === "PUBLISHED" ? "更新文章" : "发布文章";
});

const draftActionLabel = computed(() => {
  return form.status === "DRAFT" ? "保存草稿" : "转为草稿";
});

function applyEditorState() {
  const item = blogStore.editorPost;

  if (!item) {
    form.title = "";
    form.coverImageUrl = "";
    form.status = "DRAFT";
    form.content = "";
    return;
  }

  form.title = item.title;
  form.coverImageUrl = item.coverImageUrl ?? "";
  form.status = item.status;
  form.content = item.content;
}

watch(
  () => blogStore.editorPost,
  () => {
    applyEditorState();
  },
);

watch(
  () => [authStore.ready, postId.value] as const,
  async ([ready, currentPostId]) => {
    if (!ready) {
      return;
    }

    feedback.value = "";
    blogStore.clearAuthoringState();

    if (currentPostId && authStore.user) {
      try {
        await blogStore.loadEditorPost(currentPostId);
      } catch (error) {
        feedback.value = error instanceof Error ? error.message : "加载失败";
      }
      return;
    }

    applyEditorState();
  },
  {
    immediate: true,
  },
);

async function submitWithStatus(status: "DRAFT" | "PUBLISHED") {
  if (!authStore.user) {
    feedback.value = "请先登录";
    return;
  }

  feedback.value = "";

  try {
    const payload = {
      title: form.title,
      excerpt: null,
      coverImageUrl: form.coverImageUrl || null,
      visibility: "PUBLIC",
      status,
      content: form.content,
    };

    const item = isEditing.value && postId.value
      ? await blogStore.updatePost(postId.value, payload)
      : await blogStore.createPost(payload);

    await router.push(`/blog/${item.slug}`);
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "保存失败";
  }
}

async function handleCoverSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  feedback.value = "";

  try {
    const asset = await uploadImageFile(file, "covers");
    form.coverImageUrl = asset.publicUrl;
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "封面上传失败";
  } finally {
    input.value = "";
  }
}

async function handleInlineImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  feedback.value = "";

  try {
    const asset = await uploadImageFile(file, "posts");
    const snippet = `\n\n![${file.name}](${asset.publicUrl})\n`;
    form.content = `${form.content}${snippet}`.trim();
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "图片上传失败";
  } finally {
    input.value = "";
  }
}

function clearCover() {
  form.coverImageUrl = "";
}
</script>

<template>
  <section class="page-stack">
    <section v-if="!authStore.user" class="empty-card">
      <h3>请先登录</h3>
      <p>登录后即可开始写文章。</p>
      <RouterLink class="ghost-button link-button" to="/auth">前往登录</RouterLink>
    </section>

    <section v-else class="panel-surface editor-panel">
      <form class="form-stack" @submit.prevent="submitWithStatus('PUBLISHED')">
        <div class="page-title-row">
          <div>
            <h1 class="page-title-xl">{{ isEditing ? "编辑文章" : "写文章" }}</h1>
          </div>
        </div>

        <label class="form-field">
          <span>标题</span>
          <input
            v-model.trim="form.title"
            class="text-input"
            placeholder="输入标题"
            required
          />
        </label>

        <section class="cover-panel">
          <div class="cover-panel-head">
            <strong>封面</strong>
            <div class="action-row tight">
              <label class="secondary-button upload-button">
                上传封面
                <input type="file" accept="image/*" hidden @change="handleCoverSelected" />
              </label>
              <button
                v-if="form.coverImageUrl"
                class="secondary-button"
                type="button"
                @click="clearCover"
              >
                移除封面
              </button>
            </div>
          </div>

          <img
            v-if="form.coverImageUrl"
            :src="form.coverImageUrl"
            alt="文章封面"
            class="cover-preview-image"
          />
          <div v-else class="cover-preview-empty">还没有封面</div>
        </section>

        <div class="action-row tight">
          <label class="secondary-button upload-button">
            插入图片
            <input type="file" accept="image/*" hidden @change="handleInlineImageSelected" />
          </label>
        </div>

        <label class="form-field">
          <span>正文</span>
          <textarea
            v-model="form.content"
            class="textarea-input editor-input"
            rows="18"
            placeholder="开始写内容"
            required
          />
        </label>

        <div class="action-row">
          <button class="ghost-button" type="submit" :disabled="blogStore.saving">
            {{ blogStore.saving ? "保存中..." : primaryActionLabel }}
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="blogStore.saving"
            @click="submitWithStatus('DRAFT')"
          >
            {{ draftActionLabel }}
          </button>
          <RouterLink class="secondary-button link-button" to="/blog">返回</RouterLink>
        </div>

        <p v-if="feedback || blogStore.error" class="helper-copy danger-copy">
          {{ feedback || blogStore.error }}
        </p>
      </form>
    </section>
  </section>
</template>
