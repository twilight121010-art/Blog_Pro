import type {
  AuthorSpaceResponse,
  BlogAuthorSpace,
  BlogEditorPayload,
  BlogEditorState,
  BlogPostDetail,
  BlogPostSummary,
  PostDetailResponse,
  PostCommentsResponse,
  PostEditorResponse,
  PostsListResponse,
} from "@blog/shared";
import { API_ROUTES } from "@blog/shared";
import { defineStore } from "pinia";
import { apiFetch } from "@/lib/api";

interface BlogState {
  publishedPosts: BlogPostSummary[];
  myPosts: BlogPostSummary[];
  activePost: BlogPostDetail | null;
  editorPost: BlogEditorState | null;
  authorSpace: BlogAuthorSpace | null;
  loadingList: boolean;
  loadingDetail: boolean;
  saving: boolean;
  mutatingInteraction: boolean;
  error: string | null;
}

export const useBlogStore = defineStore("blog", {
  state: (): BlogState => ({
    publishedPosts: [],
    myPosts: [],
    activePost: null,
    editorPost: null,
    authorSpace: null,
    loadingList: false,
    loadingDetail: false,
    saving: false,
    mutatingInteraction: false,
    error: null,
  }),
  actions: {
    clearAuthoringState() {
      this.editorPost = null;
      this.error = null;
    },
    clearMyPosts() {
      this.myPosts = [];
    },
    async refreshCollectionsForViewer() {
      await this.loadPublishedPosts();

      try {
        await this.loadMyPosts();
      } catch {
        this.clearMyPosts();
      }
    },
    async loadPublishedPosts() {
      this.loadingList = true;
      this.error = null;

      try {
        const payload = await apiFetch<PostsListResponse>(API_ROUTES.posts);
        this.publishedPosts = payload.items;
        return payload.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load posts";
        throw error;
      } finally {
        this.loadingList = false;
      }
    },
    async loadMyPosts() {
      this.loadingList = true;
      this.error = null;

      try {
        const payload = await apiFetch<PostsListResponse>(API_ROUTES.postsMine);
        this.myPosts = payload.items;
        return payload.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load your posts";
        throw error;
      } finally {
        this.loadingList = false;
      }
    },
    async loadPost(slug: string) {
      this.loadingDetail = true;
      this.error = null;

      try {
        const payload = await apiFetch<PostDetailResponse>(`${API_ROUTES.posts}/${slug}`);
        this.activePost = payload.item;
        return payload.item;
      } catch (error) {
        this.activePost = null;
        this.error = error instanceof Error ? error.message : "Failed to load the post";
        throw error;
      } finally {
        this.loadingDetail = false;
      }
    },
    async loadEditorPost(postId: string) {
      this.loadingDetail = true;
      this.error = null;

      try {
        const payload = await apiFetch<PostEditorResponse>(
          `${API_ROUTES.posts}/manage/${postId}`,
        );
        this.editorPost = payload.item;
        return payload.item;
      } catch (error) {
        this.editorPost = null;
        this.error = error instanceof Error ? error.message : "Failed to load the editor state";
        throw error;
      } finally {
        this.loadingDetail = false;
      }
    },
    async createPost(payload: BlogEditorPayload) {
      this.saving = true;
      this.error = null;

      try {
        const response = await apiFetch<PostDetailResponse>(API_ROUTES.posts, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        await this.refreshCollectionsForViewer();
        this.activePost = response.item;
        return response.item;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to create the post";
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async updatePost(postId: string, payload: Partial<BlogEditorPayload>) {
      this.saving = true;
      this.error = null;

      try {
        const response = await apiFetch<PostDetailResponse>(
          `${API_ROUTES.posts}/manage/${postId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );

        await this.refreshCollectionsForViewer();
        this.activePost = response.item;
        this.editorPost = response.item;
        return response.item;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to update the post";
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async archivePost(postId: string) {
      this.saving = true;
      this.error = null;

      try {
        await apiFetch<void>(`${API_ROUTES.posts}/manage/${postId}`, {
          method: "DELETE",
        });

        await this.refreshCollectionsForViewer();
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to archive the post";
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async loadAuthorSpace(authorId: string) {
      this.loadingDetail = true;
      this.error = null;

      try {
        const payload = await apiFetch<AuthorSpaceResponse>(`/api/authors/${authorId}`);
        this.authorSpace = payload.item;
        return payload.item;
      } catch (error) {
        this.authorSpace = null;
        this.error = error instanceof Error ? error.message : "Failed to load author space";
        throw error;
      } finally {
        this.loadingDetail = false;
      }
    },
    async createComment(slug: string, content: string) {
      this.mutatingInteraction = true;
      this.error = null;

      try {
        const payload = await apiFetch<PostCommentsResponse>(
          `${API_ROUTES.posts}/${slug}/comments`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
        );

        if (this.activePost?.slug === slug) {
          this.activePost = {
            ...this.activePost,
            comments: payload.items,
            commentCount: payload.items.length,
          };
        }

        await this.refreshCollectionsForViewer();
        return payload.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to create the comment";
        throw error;
      } finally {
        this.mutatingInteraction = false;
      }
    },
    async deleteComment(slug: string, commentId: string) {
      this.mutatingInteraction = true;
      this.error = null;

      try {
        const payload = await apiFetch<PostCommentsResponse>(
          `${API_ROUTES.posts}/${slug}/comments/${commentId}`,
          {
            method: "DELETE",
          },
        );

        if (this.activePost?.slug === slug) {
          this.activePost = {
            ...this.activePost,
            comments: payload.items,
            commentCount: payload.items.length,
          };
        }

        await this.refreshCollectionsForViewer();
        return payload.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to delete the comment";
        throw error;
      } finally {
        this.mutatingInteraction = false;
      }
    },
    async likePost(slug: string) {
      this.mutatingInteraction = true;
      this.error = null;

      try {
        const payload = await apiFetch<{ liked: boolean; likeCount: number }>(
          `${API_ROUTES.posts}/${slug}/like`,
          {
            method: "POST",
          },
        );

        if (this.activePost?.slug === slug) {
          this.activePost = {
            ...this.activePost,
            likedByViewer: payload.liked,
            likeCount: payload.likeCount,
          };
        }

        await this.refreshCollectionsForViewer();
        return payload;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to like the post";
        throw error;
      } finally {
        this.mutatingInteraction = false;
      }
    },
    async unlikePost(slug: string) {
      this.mutatingInteraction = true;
      this.error = null;

      try {
        const payload = await apiFetch<{ liked: boolean; likeCount: number }>(
          `${API_ROUTES.posts}/${slug}/like`,
          {
            method: "DELETE",
          },
        );

        if (this.activePost?.slug === slug) {
          this.activePost = {
            ...this.activePost,
            likedByViewer: payload.liked,
            likeCount: payload.likeCount,
          };
        }

        await this.refreshCollectionsForViewer();
        return payload;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to unlike the post";
        throw error;
      } finally {
        this.mutatingInteraction = false;
      }
    },
  },
});
