# 新版重构架构建议

## 1. 目标

新版不是单纯“把旧代码拆文件”，而是要同时完成这几件事：

- 用数据库替代 `data/store.json`
- 用真正的 Markdown 存储和渲染博客内容
- 让认证模型支持后续扩展成邮箱、手机、微信、QQ 等登录方式
- 把前端、后端、共享类型、内容文件分开
- 让博客、打卡、聊天、通知、资料这些模块彼此解耦

## 2. 推荐的总体方案

### 2.1 推荐组合

默认建议：

- 前端：`Vue 3 + Vite + TypeScript + Vue Router + Pinia`
- 后端：`Node.js + TypeScript + 模块化 API 服务`
- ORM：`Prisma`
- 数据库：开发期 `SQLite`，长期或部署期 `PostgreSQL`
- 博客正文：`Markdown 文件`
- 结构化数据：数据库
- 文件上传：本地文件系统起步，后续再切对象存储

### 2.2 为什么这样选

#### 前端

`Vue 3 + Vite` 很适合你当前这个项目阶段：

- 比继续维护原生 5000 行前端更容易拆模块
- 上手成本比很多“更重”的方案低
- 组件化、路由、状态管理都自然
- 后面接 Markdown 编辑区和多页面结构更顺

#### 后端

你现在已经需要的是“有边界的服务端”，不是简单的静态页服务器。

所以后端至少要具备这些层次：

- 路由层
- 认证层
- 服务层
- 数据访问层
- 文件存储层

哪怕不选特别重的框架，也要把这几个层次拆出来。

#### 数据库

这个项目明显适合关系型数据库。因为它本质上是：

- 用户系统
- 内容系统
- 社交系统
- 消息系统

这类系统天然适合 `SQLite / PostgreSQL` 这类关系型数据库。

#### Markdown

博客正文建议保存为真实 `.md` 文件，而不是继续存成“普通文本 + 自写解析”。

这样做有几个直接好处：

- 内容可读
- 可备份
- 可 Git 管理
- 后续迁移平台更容易

## 3. 我建议你先做哪些登录方式

### 3.1 不建议一期同时做四种

你提到的方式有：

- 电话
- 微信
- QQ
- 邮箱

一期不要全做。因为它们的复杂度完全不一样：

- 邮箱：最适合先打通账号体系
- 手机：适合真实用户登录，但要引短信验证码服务
- 微信：更适合国内用户，但接入流程和平台配置更重
- QQ：能做，但优先级通常低于手机和微信

### 3.2 默认推荐顺序

我建议按这个顺序推进：

1. `邮箱 + 密码` 或 `邮箱 + 验证码`
2. `手机 + 验证码`
3. `微信登录`
4. `QQ 登录`

如果你想做一个更偏中文用户的产品，也可以改成：

1. `手机 + 验证码`
2. `微信登录`
3. `邮箱绑定`
4. `QQ 登录`

### 3.3 我对你这个项目的一期建议

最稳的版本是：

- 一期：`邮箱登录`
- 二期：`手机登录`
- 三期：`微信登录`
- `QQ` 暂不做

原因很直接：

- 邮箱最好开发、调试和回归测试
- 手机验证码更接近真实产品，但会引入短信成本和风控
- 微信值得做，但不应该压在第一阶段
- QQ 可以通过统一身份表预留能力，后面再接

## 4. 认证模型应该怎么设计

不要再把“登录方式”写死在用户表里。正确做法是：

- `users` 表表示内部用户
- `user_identities` 表表示外部登录身份

推荐结构如下：

### 4.1 `users`

保存内部用户主档：

- `id`
- `nickname`
- `avatar_url`
- `status`
- `created_at`
- `updated_at`

### 4.2 `user_identities`

一条用户可绑定多种身份：

- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `email`
- `phone`
- `password_hash`
- `is_primary`
- `created_at`
- `updated_at`

其中 `provider` 可以是：

- `email`
- `phone`
- `wechat`
- `qq`

这样你的系统就能天然支持：

- 一个用户只用邮箱注册
- 一个用户后续再绑定手机
- 一个用户再绑定微信
- 一个用户未来解绑某种方式

### 4.3 `verification_codes`

用于邮箱或短信验证码：

- `id`
- `target`
- `scene`
- `code_hash`
- `expired_at`
- `consumed_at`
- `created_at`

### 4.4 `sessions`

保存登录会话：

- `id`
- `user_id`
- `refresh_token_hash`
- `user_agent`
- `ip`
- `expired_at`
- `created_at`

## 5. 数据库应该怎么分模块

下面这个拆法比较适合你现在的业务。

### 5.1 用户与认证

- `users`
- `user_profiles`
- `user_identities`
- `sessions`
- `verification_codes`

### 5.2 博客

- `posts`
- `post_assets`
- `post_comments`
- `post_likes`

### 5.3 打卡

- `habits`
- `habit_records`
- `habit_reminders`

### 5.4 社交

- `friend_requests`
- `friendships`

### 5.5 聊天

- `conversations`
- `messages`
- `message_reads`

### 5.6 通知

- `notifications`

### 5.7 文件

- `files`

`files` 表很重要，因为你现在已经有头像和博客图片上传。后面只要统一管理：

- 头像
- 博客图
- 聊天图片
- 其他附件

## 6. 真正的 Markdown 应该怎么做

### 6.1 不再手写 Markdown 解析器

新版不要继续沿用自写 `renderMarkdown()` 逻辑。

推荐做法：

1. 编辑器里拿到原始 Markdown 文本
2. 保存为 `.md` 文件
3. 读取时用成熟 Markdown 解析库渲染
4. 对输出 HTML 做白名单清洗

### 6.2 推荐的内容存储方式

建议目录：

```text
content/
  posts/
    <user-id>/
      2026-03-26-my-first-post.md
```

每篇文章一个 Markdown 文件，顶部使用 front matter：

```md
---
title: 我的第一篇博客
slug: my-first-post
authorId: user_xxx
summary: 这是一段摘要
cover: /uploads/posts/cover-001.webp
tags:
  - 前端
  - 学习
status: published
createdAt: 2026-03-26T10:00:00+08:00
updatedAt: 2026-03-26T10:00:00+08:00
---

# 正文标题

这里是真正的 Markdown 内容。

- 支持列表
- 支持代码块
- 支持图片
```

### 6.3 数据库和 Markdown 的边界

建议采用混合方案：

### 放在 Markdown 文件里的内容

- 文章正文
- front matter 元数据

### 放在数据库里的内容

- 作者
- 评论
- 点赞
- 浏览量
- 可见性
- 发布状态
- 文章文件路径
- 封面图、附件、标签索引

如果你希望将来做“多人发文 + 搜索 + 审核 + 草稿”，最稳的方式是：

- 正文文件落盘
- 元数据索引进数据库

### 6.4 编辑器建议

一期不用先追求复杂编辑器。

建议先做：

- 左侧编辑区：`textarea` 或轻量编辑器
- 右侧预览区：真实 Markdown 渲染结果
- 自动保存草稿
- 图片上传后自动插入 Markdown 链接

这样就已经比旧版强很多，而且复杂度可控。

## 7. 推荐的新版目录结构

建议直接采用“前后端分离但同仓库”的结构：

```text
checkin-app-next/
  apps/
    web/
      src/
        app/
        components/
        modules/
          auth/
          blog/
          checkin/
          chat/
          profile/
          notification/
        router/
        stores/
        services/
        styles/
        utils/
      public/
      package.json
    api/
      src/
        main.ts
        modules/
          auth/
          user/
          blog/
          checkin/
          social/
          chat/
          notification/
          file/
        common/
          config/
          db/
          guards/
          middleware/
          utils/
      prisma/
      package.json
  packages/
    shared/
      src/
        types/
        constants/
        schemas/
  content/
    posts/
  uploads/
  docs/
  package.json
```

这个结构解决的是两个问题：

- 同一个仓库里仍然能一起开发前后端
- 各模块边界会明确很多

## 8. 前端模块该怎么拆

建议前端按“模块内聚”组织，不按“页面堆文件”组织。

例如：

### `modules/auth`

- 登录页
- 注册页
- 找回密码
- 身份绑定管理

### `modules/blog`

- 文章列表
- 文章详情
- 发布编辑器
- 评论区

### `modules/checkin`

- 打卡项列表
- 新建打卡项
- 完成记录
- 好友提醒

### `modules/chat`

- 会话列表
- 聊天窗口
- 消息输入

### `modules/profile`

- 个人资料
- 头像上传
- 地区选择

## 9. 后端模块该怎么拆

后端建议每个模块都有自己的：

- `controller` 或路由入口
- `service`
- `repository`
- `schema / dto`
- `types`

比如 `blog` 模块：

- `blog.controller.ts`
- `blog.service.ts`
- `blog.repository.ts`
- `blog.schema.ts`
- `blog-content.service.ts`

其中：

- `blog.repository` 负责数据库
- `blog-content.service` 负责 Markdown 文件读写

这样结构会很清晰。

## 10. 安全基线建议

你是要把项目从“原型”推进到“真正可维护的应用”，所以这些安全基线建议直接纳入一期：

- 密码哈希使用 `Argon2id`
- 验证码和刷新令牌只存哈希值
- 登录、验证码发送、找回密码接口加限流
- Markdown 渲染后的 HTML 做白名单清洗
- 上传文件校验 MIME、大小和扩展名
- 会话支持主动退出和多设备管理
- 记录关键认证日志

另外，旧版“密保问题/密保答案”建议直接淘汰。真实产品里这套方案不建议继续沿用。

## 11. 我给你的最终推荐

如果你现在就准备开新项目，我建议你直接按下面这个组合起步：

- 前端：`Vue 3 + Vite + TypeScript`
- 状态：`Pinia`
- 路由：`Vue Router`
- 后端：`Node.js + TypeScript + 模块化 API`
- ORM：`Prisma`
- 本地数据库：`SQLite`
- 后续部署数据库：`PostgreSQL`
- 一期登录：`邮箱`
- 二期登录：`手机`
- 三期登录：`微信`
- 博客正文：真实 `.md` 文件
- 评论、点赞、聊天、通知：数据库

## 12. 参考资料

下面这些是我用于确认技术路线时参考的官方资料：

- Vite Guide: <https://vite.dev/guide/>
- Vue Guide: <https://vuejs.org/guide/introduction.html>
- Pinia Introduction: <https://pinia.vuejs.org/introduction.html>
- Prisma Docs: <https://www.prisma.io/docs/orm/overview/introduction>
- markdown-it: <https://github.com/markdown-it/markdown-it>
- OWASP Password Storage Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>
