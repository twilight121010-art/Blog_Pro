export interface SessionUser {
  id: string;
  username: string;
  userCode: string;
  nickname: string;
  avatarUrl: string | null;
  status: string;
  bio: string | null;
  region: string | null;
  website: string | null;
}

export interface AuthSessionResponse {
  token: string;
  user: SessionUser;
}

export interface AuthProfileUpdateInput {
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  region: string | null;
  website: string | null;
}

export interface BlogPostAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  visibility: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  likeCount: number;
  likedByViewer: boolean;
  author: BlogPostAuthor;
}

export interface BlogComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
  author: BlogPostAuthor;
}

export interface BlogPostDetail extends BlogPostSummary {
  content: string;
  renderedHtml: string;
  canEdit: boolean;
  comments: BlogComment[];
}

export interface BlogEditorPayload {
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  visibility?: string;
  status?: string;
  content: string;
}

export interface BlogEditorState extends BlogPostDetail {}

export interface BlogAuthorSpace {
  user: SessionUser;
  posts: BlogPostSummary[];
}

export interface PostsListResponse {
  items: BlogPostSummary[];
}

export interface PostDetailResponse {
  item: BlogPostDetail;
}

export interface PostEditorResponse {
  item: BlogEditorState;
}

export interface PostCommentsResponse {
  items: BlogComment[];
}

export interface AuthorSpaceResponse {
  item: BlogAuthorSpace;
}

export interface FileUploadResponse {
  item: {
    id: string;
    publicUrl: string;
    category: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  service: "api";
  time: string;
  database: {
    provider: "sqlite";
    status: "connected" | "error";
  };
  modules: string[];
}

export interface BootstrapOverviewResponse {
  status: "ok" | "error";
  time: string;
  database: {
    provider: "sqlite";
    status: "connected" | "error";
  };
  entities: {
    users: number;
    profiles: number;
    identities: number;
    sessions: number;
    posts: number;
    comments: number;
    likes: number;
    files: number;
  };
  contentRoot: string;
  uploadsRoot: string;
  modules: string[];
}

export declare const API_ROUTES: {
  readonly health: "/api/health";
  readonly bootstrapOverview: "/api/bootstrap/overview";
  readonly authRegister: "/api/auth/register";
  readonly authLogin: "/api/auth/login";
  readonly authLogout: "/api/auth/logout";
  readonly authMe: "/api/auth/me";
  readonly posts: "/api/posts";
  readonly postsMine: "/api/posts/mine";
  readonly uploads: "/api/uploads";
  readonly authors: "/api/authors";
  readonly habits: "/api/habits";
  readonly habitsOverview: "/api/habits/overview";
  readonly habitsCommunity: "/api/habits/community";
  readonly habitsPrompts: "/api/habits/prompts";
};

// ─── Habits ────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  cadence: string;
  targetCountPerDay: number;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitPersonSummary {
  id: string;
  username: string;
  userCode: string;
  nickname: string;
  avatarUrl: string | null;
  region: string | null;
}

export interface CommunityHabit {
  id: string;
  owner: HabitPersonSummary;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  cadence: string;
  targetCountPerDay: number;
  completedToday: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitPrompt {
  id: string;
  habitId: string;
  message: string | null;
  createdAt: string;
  readAt: string | null;
  completedToday: boolean;
  habit: {
    id: string;
    name: string;
    icon: string | null;
  };
  sender: HabitPersonSummary;
}

export interface HabitPromptCreateInput {
  message?: string | null;
}

export interface HabitRecord {
  id: string;
  habitId: string;
  userId: string;
  recordDate: string;
  value: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitStats {
  habitId: string;
  totalCount: number;
  last7Days: number;
  last30Days: number;
  currentStreak: number;
  longestStreak: number;
}

export interface HabitsOverview {
  totalHabits: number;
  activeHabits: number;
  todayCompleted: number;
  last7DaysCompleted: number;
  last30DaysCompleted: number;
}

export interface HabitCreateInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  cadence?: string;
  targetCountPerDay?: number;
  sortOrder?: number;
}

export interface HabitUpdateInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  cadence?: string;
  targetCountPerDay?: number;
  sortOrder?: number;
  isArchived?: boolean;
}

export interface HabitRecordCreateInput {
  recordDate: string;
  value?: number;
  note?: string | null;
}

export interface HabitsListResponse {
  items: Habit[];
}

export interface HabitDetailResponse {
  item: Habit;
}

export interface HabitRecordsListResponse {
  items: HabitRecord[];
}

export interface HabitStatsResponse {
  stats: HabitStats;
}

export interface HabitsOverviewResponse {
  overview: HabitsOverview;
}

export interface CommunityHabitsResponse {
  items: CommunityHabit[];
}

export interface HabitPromptsResponse {
  items: HabitPrompt[];
}
export declare const POST_STATUS: readonly string[];
export declare const POST_VISIBILITY: readonly string[];
