import { createRouter, createWebHistory } from "vue-router";
import AuthorSpacePage from "@/pages/AuthorSpacePage.vue";
import AuthPage from "@/pages/AuthPage.vue";
import BlogDetailPage from "@/pages/BlogDetailPage.vue";
import BlogEditorPage from "@/pages/BlogEditorPage.vue";
import BlogPage from "@/pages/BlogPage.vue";
import CheckinPage from "@/pages/CheckinPage.vue";
import ProfilePage from "@/pages/ProfilePage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/blog",
    },
    {
      path: "/architecture",
      redirect: "/blog",
    },
    {
      path: "/blog",
      name: "blog",
      component: BlogPage,
      meta: {
        title: "文章列表",
      },
    },
    {
      path: "/blog/new",
      name: "blog-new",
      component: BlogEditorPage,
      meta: {
        title: "新建文章",
      },
    },
    {
      path: "/blog/edit/:postId",
      name: "blog-edit",
      component: BlogEditorPage,
      meta: {
        title: "编辑文章",
      },
    },
    {
      path: "/blog/:slug",
      name: "blog-detail",
      component: BlogDetailPage,
      meta: {
        title: "文章详情",
      },
    },
    {
      path: "/authors/:authorId",
      name: "author-space",
      component: AuthorSpacePage,
      meta: {
        title: "作者空间",
      },
    },
    {
      path: "/auth",
      name: "auth",
      component: AuthPage,
      meta: {
        title: "登录与注册",
      },
    },
    {
      path: "/profile",
      name: "profile",
      component: ProfilePage,
      meta: {
        title: "个人资料",
      },
    },
    {
      path: "/checkin",
      name: "checkin",
      component: CheckinPage,
      meta: {
        title: "习惯打卡",
      },
    },
  ],
});

export default router;
