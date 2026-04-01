<script setup lang="ts">
import type { HealthCheckResponse } from "@blog/shared";

defineProps<{
  health: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
}>();
</script>

<template>
  <aside class="panel-surface status-panel">
    <div class="section-head compact">
      <div>
        <p class="eyebrow">API Probe</p>
        <h2>运行状态</h2>
      </div>
    </div>

    <div v-if="loading" class="status-card">
      <p class="status-label">健康检查</p>
      <strong>检测中...</strong>
      <p>正在请求 `/api/health`。</p>
    </div>

    <div v-else-if="error" class="status-card danger">
      <p class="status-label">健康检查</p>
      <strong>未连通</strong>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="health" class="status-stack">
      <div class="status-card">
        <p class="status-label">API</p>
        <strong>{{ health.status === "ok" ? "正常" : "异常" }}</strong>
        <p>{{ health.time }}</p>
      </div>

      <div class="status-card">
        <p class="status-label">Database</p>
        <strong>{{ health.database.status }}</strong>
        <p>{{ health.database.provider }}</p>
      </div>

      <div class="status-card">
        <p class="status-label">Modules</p>
        <strong>{{ health.modules.length }} 个已注册</strong>
        <p>{{ health.modules.join(" / ") }}</p>
      </div>
    </div>

    <div v-else class="status-card">
      <p class="status-label">健康检查</p>
      <strong>等待首次探测</strong>
      <p>启动 API 后这里会显示数据库和服务状态。</p>
    </div>
  </aside>
</template>
