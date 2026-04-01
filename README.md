# Blog

一个可直接克隆并本地运行的博客 monorepo，包含博客内容流、作者空间、评论点赞、图片上传，以及习惯打卡模块。这个目录已经从旧项目中独立出来，前后端、数据库和本地内容存储都在同一个仓库里，克隆后即可单独开发和运行。

## 你会得到什么

- 一个 `Vue 3 + Vite + TypeScript` 的前端应用
- 一个 `Node.js + TypeScript` 的 API 服务
- 一套 `Prisma + SQLite` 的本地开发数据库
- 基于 `Markdown` 的文章正文存储
- 本地上传文件存储目录
- 习惯打卡、评论、点赞、作者空间等完整业务模块

## 技术栈

- 前端：`Vue 3`、`Vite`、`TypeScript`、`Vue Router`、`Pinia`
- 后端：`Node.js`、`TypeScript`
- 数据库：`Prisma`、`SQLite`
- 内容存储：`content/posts/*.md`
- 文件上传：`uploads/`

## 克隆后快速开始

请在 `blog/` 根目录执行下面这些命令：

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:generate
npm run db:migrate
npm run dev
```

启动后默认访问地址：

- Web：`http://localhost:5173`
- API：`http://localhost:3000`

如果你已经装过依赖并初始化过数据库，后续开发通常只需要：

```bash
npm run dev
```

## 环境变量

后端默认读取 `apps/api/.env`，示例文件已经提供在 `apps/api/.env.example`：

```env
PORT=3000
DATABASE_URL="file:./dev.db"
```

默认情况下：

- API 监听 `3000` 端口
- SQLite 数据库文件位于 `apps/api/prisma/dev.db`
- 前端开发服务器通过 Vite 代理把 `/api` 和 `/uploads` 转发到 `http://localhost:3000`

如果你修改了 API 端口，记得同步调整 [apps/web/vite.config.ts](./apps/web/vite.config.ts) 里的代理目标。

## 首次使用说明

这个仓库不自带演示账号和示例文章。克隆后第一次运行时，请先自己注册一个账号。

- 注册字段：`username + nickname + password + securityQuestion + securityAnswer`
- 登录字段：`username + password`
- 用户名限制：`4-24` 位，只能包含小写字母、数字、点、下划线或短横线
- 密码限制：至少 `8` 位，且必须同时包含字母和数字
- 系统会自动生成一个内部编号 `userCode`
- 登录成功后，前端会把 token 保存在本地，并在后续请求中自动带上 `Authorization: Bearer <token>`

当前实现里，`userCode` 会显示在个人资料页，但不是登录凭据。

## 常用脚本

所有命令都在 `blog/` 根目录执行：

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
```

说明：

- `npm run dev`：同时启动前端和后端
- `npm run dev:web`：只启动前端
- `npm run dev:api`：只启动后端
- `npm run typecheck`：检查前后端 TypeScript 类型
- `npm run build`：构建前后端
- `npm run db:generate`：生成 Prisma Client
- `npm run db:migrate`：执行本地数据库迁移

## 项目结构

```text
blog/
├── apps/
│   ├── api/                 # API 服务、HTTP 路由、Prisma、业务模块
│   └── web/                 # Vue 前端应用
├── packages/
│   └── shared/              # 前后端共享类型与 API 常量
├── content/
│   └── posts/               # Markdown 文章正文
├── uploads/                 # 头像、封面图、正文图片等上传文件
├── docs/                    # 架构评估、重构说明、迁移文档
├── scripts/                 # 根目录辅助脚本
├── package.json             # workspace 根脚本
└── tsconfig.base.json       # 全局 TypeScript 基础配置
```

## 当前功能

- 账号注册、登录、会话恢复、个人资料编辑、账号删除
- 文章列表、文章详情、文章编辑、作者空间
- 评论、点赞、封面图和正文图片上传
- 习惯打卡、记录统计、提醒和社区习惯浏览
- 健康检查与系统概览接口

## 数据与文件约定

- 数据库文件默认是 `apps/api/prisma/dev.db`
- 文章正文默认保存到 `content/posts/*.md`
- 上传资源默认保存到 `uploads/`
- 文章和上传目录会在需要时由服务自动创建
- `apps/api/.env`、数据库文件、文章正文和上传资源默认都不会提交进仓库

这意味着：

- 你从 GitHub 克隆到的是代码和迁移记录，不是本地运行数据
- 你本地新建的文章、上传的图片、SQLite 数据库不会自动跟随 git 提交
- 如果你想提交演示内容，需要先调整 `.gitignore` 策略

## API 概览

### 系统接口

- `GET /api/health`
- `GET /api/bootstrap/overview`

### 认证接口

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `DELETE /api/auth/me`

### 博客接口

- `GET /api/posts`
- `GET /api/posts/mine`
- `GET /api/posts/:slug`
- `GET /api/posts/manage/:postId`
- `POST /api/posts`
- `PATCH /api/posts/manage/:postId`
- `DELETE /api/posts/manage/:postId`
- `GET /api/posts/:slug/comments`
- `POST /api/posts/:slug/comments`
- `DELETE /api/posts/:slug/comments/:commentId`
- `POST /api/posts/:slug/like`
- `DELETE /api/posts/:slug/like`
- `GET /api/authors/:authorId`

### 上传接口

- `POST /api/uploads`
- `GET /uploads/...`

### 打卡接口

- `GET /api/habits`
- `POST /api/habits`
- `GET /api/habits/overview`
- `GET /api/habits/community`
- `GET /api/habits/prompts`
- `PATCH /api/habits/:habitId`
- `DELETE /api/habits/:habitId`
- `DELETE /api/habits/:habitId/permanent`
- `GET /api/habits/:habitId/records`
- `POST /api/habits/:habitId/records`
- `DELETE /api/habits/:habitId/records/:recordId`
- `GET /api/habits/:habitId/stats`
- `POST /api/habits/:habitId/prompts`

## 进一步阅读

- [docs/README.md](./docs/README.md)：重构文档索引
- [docs/02-rebuild-architecture.md](./docs/02-rebuild-architecture.md)：如果只看一份文档，优先看这一份
