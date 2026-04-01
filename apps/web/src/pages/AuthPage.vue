<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useNoticeStore } from "@/stores/notices";
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{2,22}[a-z0-9])?$/;

const authStore = useAuthStore();
const noticeStore = useNoticeStore();
const router = useRouter();
const mode = ref<"login" | "register">("login");
const feedback = ref("");

const form = reactive({
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  securityQuestion: "",
  securityAnswer: "",
});

const passwordVisible = reactive({
  login: false,
  register: false,
  confirm: false,
});

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) {
      void router.replace("/blog");
    }
  },
  { immediate: true },
);

watch(mode, () => {
  feedback.value = "";
  form.password = "";
  form.confirmPassword = "";
  passwordVisible.login = false;
  passwordVisible.register = false;
  passwordVisible.confirm = false;
});

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function assertValidUsername(username: string) {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("用户名需为 4-24 位，只能包含字母、数字、点、下划线或短横线");
  }
}

async function handleSubmit() {
  feedback.value = "";

  try {
    const username = normalizeUsername(form.username);
    assertValidUsername(username);

    if (mode.value === "register") {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) {
        throw new Error("密码至少 8 位，且必须同时包含字母和数字");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("两次输入的密码不一致");
      }

      await authStore.register({
        username,
        password: form.password,
        nickname: form.nickname,
        securityQuestion: form.securityQuestion,
        securityAnswer: form.securityAnswer,
      });
      noticeStore.push("账号已创建并自动登录", "success");
    } else {
      await authStore.login({
        username,
        password: form.password,
      });
      noticeStore.push("登录成功", "success");
    }

    await router.push("/blog");
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "提交失败";
  }
}
</script>

<template>
  <section class="auth-screen-card panel-surface">
    <div class="auth-screen-head">
      <h1>{{ mode === "login" ? "欢迎回来" : "创建账号" }}</h1>
      <p>
        {{
          mode === "login"
            ? "使用用户名和密码登录，编号会保留在个人资料中。"
            : "注册时设置用户名，系统仍会自动分配一个内部编号。"
        }}
      </p>
    </div>

    <div class="auth-toggle">
      <button
        class="tab-button"
        :class="{ active: mode === 'login' }"
        type="button"
        @click="mode = 'login'"
      >
        登录
      </button>
      <button
        class="tab-button"
        :class="{ active: mode === 'register' }"
        type="button"
        @click="mode = 'register'"
      >
        注册
      </button>
    </div>

    <form class="form-stack" @submit.prevent="handleSubmit">
      <label class="form-field">
        <span>用户名</span>
        <input
          v-model.trim="form.username"
          class="text-input"
          type="text"
          placeholder="例如 lin.disaster"
          autocapitalize="off"
          autocomplete="username"
          minlength="4"
          maxlength="24"
          required
        />
      </label>

      <label v-if="mode === 'register'" class="form-field">
        <span>昵称</span>
        <input
          v-model.trim="form.nickname"
          class="text-input"
          type="text"
          placeholder="你希望大家怎么称呼你"
          required
        />
      </label>

      <label class="form-field">
        <span>密码</span>
        <div class="input-with-action">
          <input
            v-model="form.password"
            class="text-input"
            :type="mode === 'login' ? (passwordVisible.login ? 'text' : 'password') : (passwordVisible.register ? 'text' : 'password')"
            minlength="8"
            :pattern="mode === 'register' ? '(?=.*[A-Za-z])(?=.*\\d).{8,}' : undefined"
            :title="mode === 'register' ? '至少 8 位，并包含字母和数字' : undefined"
            :placeholder="mode === 'register' ? '至少 8 位，并包含字母和数字' : '输入密码'"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
          />
          <button
            class="field-action field-action--icon"
            type="button"
            :aria-label="mode === 'login'
              ? (passwordVisible.login ? '隐藏密码' : '显示密码')
              : (passwordVisible.register ? '隐藏密码' : '显示密码')"
            @click="mode === 'login' ? (passwordVisible.login = !passwordVisible.login) : (passwordVisible.register = !passwordVisible.register)"
          >
            <svg
              v-if="mode === 'login' ? passwordVisible.login : passwordVisible.register"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M3 4.5L19.5 21M10.6 10.7A3 3 0 0013.3 13.4M9.9 5.2A10.7 10.7 0 0112 5c5.6 0 9.5 4.5 10 5-.4.6-2.4 3-5.6 4.4M6.7 6.8C3.8 8.4 2.2 10.5 2 10.8c.5.6 4.4 5.2 10 5.2 1.6 0 3-.3 4.2-.8M14.1 9.9A3 3 0 019.9 14"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </label>

      <label v-if="mode === 'register'" class="form-field">
        <span>确认密码</span>
        <div class="input-with-action">
          <input
            v-model="form.confirmPassword"
            class="text-input"
            :type="passwordVisible.confirm ? 'text' : 'password'"
            minlength="8"
            autocomplete="new-password"
            placeholder="再次输入密码"
            required
          />
          <button
            class="field-action field-action--icon"
            type="button"
            :aria-label="passwordVisible.confirm ? '隐藏密码' : '显示密码'"
            @click="passwordVisible.confirm = !passwordVisible.confirm"
          >
            <svg v-if="passwordVisible.confirm" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 4.5L19.5 21M10.6 10.7A3 3 0 0013.3 13.4M9.9 5.2A10.7 10.7 0 0112 5c5.6 0 9.5 4.5 10 5-.4.6-2.4 3-5.6 4.4M6.7 6.8C3.8 8.4 2.2 10.5 2 10.8c.5.6 4.4 5.2 10 5.2 1.6 0 3-.3 4.2-.8M14.1 9.9A3 3 0 019.9 14"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </label>

      <label v-if="mode === 'register'" class="form-field">
        <span>密保问题</span>
        <input
          v-model.trim="form.securityQuestion"
          class="text-input"
          type="text"
          placeholder="例如：我最喜欢的城市是？"
          required
        />
      </label>

      <label v-if="mode === 'register'" class="form-field">
        <span>密保答案</span>
        <input
          v-model.trim="form.securityAnswer"
          class="text-input"
          type="text"
          placeholder="请输入答案"
          required
        />
      </label>

      <div class="action-row auth-actions">
        <button class="ghost-button" type="submit" :disabled="authStore.pending">
          {{ authStore.pending ? "提交中..." : mode === "register" ? "创建账号" : "登录" }}
        </button>
      </div>

      <p class="helper-copy">
        用户名需为 4-24 位。{{ mode === "register" ? "密码必须同时包含字母和数字，注册成功后会自动登录。" : "登录后可在个人资料页查看账号编号。" }}
      </p>

      <p v-if="feedback || authStore.error" class="helper-copy danger-copy">
        {{ feedback || authStore.error }}
      </p>
    </form>
  </section>
</template>
