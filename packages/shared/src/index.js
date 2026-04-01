export const API_ROUTES = {
  health: "/api/health",
  bootstrapOverview: "/api/bootstrap/overview",
  authRegister: "/api/auth/register",
  authLogin: "/api/auth/login",
  authLogout: "/api/auth/logout",
  authMe: "/api/auth/me",
  posts: "/api/posts",
  postsMine: "/api/posts/mine",
  uploads: "/api/uploads",
  authors: "/api/authors",
  habits: "/api/habits",
  habitsOverview: "/api/habits/overview",
  habitsCommunity: "/api/habits/community",
  habitsPrompts: "/api/habits/prompts",
};

export const POST_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"];
export const POST_VISIBILITY = ["PUBLIC", "FOLLOWERS", "PRIVATE"];
