<script setup lang="ts">
import type { CommunityHabit, Habit } from "@blog/shared";
import AvatarImage from "@/components/AvatarImage.vue";
import { useAuthStore } from "@/stores/auth";
import { useNoticeStore } from "@/stores/notices";
import { computed, ref, watch } from "vue";
import HabitEditForm from "../components/HabitEditForm.vue";
import HabitForm from "../components/HabitForm.vue";
import HabitListItem from "../components/HabitListItem.vue";
import HabitOverviewCards from "../components/HabitOverviewCards.vue";
import HabitRecordList from "../components/HabitRecordList.vue";
import HabitStatsCard from "../components/HabitStatsCard.vue";
import { useHabitsStore } from "../stores/habits";

const authStore = useAuthStore();
const noticeStore = useNoticeStore();
const store = useHabitsStore();

const showCreateForm = ref(false);
const editingHabit = ref<Habit | null>(null);
const expandedHabitId = ref<string | null>(null);
const actionError = ref("");
const bootstrapping = ref(false);
const promptTarget = ref<CommunityHabit | null>(null);
const promptMessage = ref("");
const promptError = ref("");
const promptPending = ref(false);

const feedbackMessage = computed(() => actionError.value || store.error);
const expandedHabit = computed(() =>
  expandedHabitId.value
    ? store.habits.find((habit) => habit.id === expandedHabitId.value) ?? null
    : null,
);
const expandedStats = computed(() =>
  expandedHabitId.value ? store.stats[expandedHabitId.value] ?? null : null,
);
const expandedRecords = computed(() =>
  expandedHabitId.value ? store.records[expandedHabitId.value] ?? [] : [],
);
const expandedStatsLoading = ref(false);
const expandedRecordsLoading = ref(false);

function resetLocalState() {
  showCreateForm.value = false;
  editingHabit.value = null;
  expandedHabitId.value = null;
  actionError.value = "";
  expandedStatsLoading.value = false;
  expandedRecordsLoading.value = false;
  bootstrapping.value = false;
  closePromptDialog();
}

function closePromptDialog() {
  promptTarget.value = null;
  promptMessage.value = "";
  promptError.value = "";
  promptPending.value = false;
}

async function loadCheckinWorkspace() {
  bootstrapping.value = true;
  actionError.value = "";
  store.reset();

  try {
    const [habits] = await Promise.all([
      store.loadHabits(),
      store.loadOverview(),
      store.loadCommunityHabits(),
      store.loadPrompts(),
    ]);
    const activeHabits = habits.filter((habit) => !habit.isArchived);

    if (activeHabits[0]) {
      expandedHabitId.value = activeHabits[0].id;
    }

    await Promise.all(
      activeHabits.map((habit) =>
        Promise.all([store.loadRecords(habit.id), store.loadStats(habit.id)]),
      ),
    );
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "加载打卡数据失败";
  } finally {
    bootstrapping.value = false;
  }
}

watch(
  () => [authStore.ready, authStore.user?.id ?? null] as const,
  ([ready, userId], previous = [false, null] as const) => {
    const [, previousUserId] = previous;

    if (!ready) {
      return;
    }

    if (!userId) {
      store.reset();
      resetLocalState();
      return;
    }

    if (userId !== previousUserId || store.habits.length === 0) {
      void loadCheckinWorkspace();
    }
  },
  { immediate: true },
);

async function refreshHabitMetrics(habitId: string) {
  if (expandedHabitId.value === habitId || store.stats[habitId]) {
    await store.loadStats(habitId);
  }
}

async function refreshPromptState() {
  await Promise.all([store.loadPrompts(), store.loadCommunityHabits()]);
}

async function toggleExpand(habitId: string) {
  if (expandedHabitId.value === habitId) {
    expandedHabitId.value = null;
    return;
  }

  expandedHabitId.value = habitId;
  expandedStatsLoading.value = true;
  expandedRecordsLoading.value = true;

  try {
    await Promise.all([
      store.loadStats(habitId).finally(() => {
        expandedStatsLoading.value = false;
      }),
      store.loadRecords(habitId).finally(() => {
        expandedRecordsLoading.value = false;
      }),
    ]);
  } catch {
    // errors are shown via store.error / actionError
  }
}

async function handleCheckin(habitId: string) {
  actionError.value = "";

  try {
    await store.checkinToday(habitId);
    await Promise.all([
      store.loadOverview(),
      refreshHabitMetrics(habitId),
      refreshPromptState(),
    ]);
    noticeStore.push("打卡成功", "success");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "打卡失败";
  }
}

async function handleUndo(habitId: string) {
  actionError.value = "";
  const records = store.records[habitId] ?? [];
  const today = store.todayString;
  const record = records.find((item) => item.recordDate === today);

  if (!record) {
    return;
  }

  try {
    await store.deleteRecord(habitId, record.id);
    await Promise.all([
      store.loadOverview(),
      refreshHabitMetrics(habitId),
      refreshPromptState(),
    ]);
    noticeStore.push("已撤销今日打卡", "info");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "撤销失败";
  }
}

async function handleCreate(input: Parameters<typeof store.createHabit>[0]) {
  actionError.value = "";

  try {
    const habit = await store.createHabit(input);
    showCreateForm.value = false;
    expandedHabitId.value = habit.id;
    await Promise.all([
      store.loadOverview(),
      store.loadRecords(habit.id),
      store.loadStats(habit.id),
      store.loadCommunityHabits(),
    ]);
    noticeStore.push("打卡项已创建", "success");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "创建失败";
  }
}

async function handleSaveEdit(input: Parameters<typeof store.updateHabit>[1]) {
  if (!editingHabit.value) {
    return;
  }

  actionError.value = "";

  try {
    await store.updateHabit(editingHabit.value.id, input);
    editingHabit.value = null;
    await store.loadCommunityHabits();
    noticeStore.push("打卡项已保存", "success");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "保存失败";
  }
}

async function handleArchive(habitId: string) {
  actionError.value = "";

  try {
    await store.archiveHabit(habitId);
    if (expandedHabitId.value === habitId) {
      expandedHabitId.value = store.activeHabits.find((habit) => habit.id !== habitId)?.id ?? null;
    }
    await Promise.all([store.loadOverview(), store.loadCommunityHabits()]);
    noticeStore.push("打卡项已归档", "info");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "归档失败";
  }
}

async function handleDeleteHabit(habitId: string) {
  const habit = store.habits.find((item) => item.id === habitId);

  if (!habit || !window.confirm(`确认删除打卡项「${habit.name}」？删除后记录和提醒会一起清空。`)) {
    return;
  }

  actionError.value = "";

  try {
    await store.permanentlyDeleteHabit(habitId);
    if (expandedHabitId.value === habitId) {
      expandedHabitId.value = store.activeHabits[0]?.id ?? null;
    }
    if (editingHabit.value?.id === habitId) {
      editingHabit.value = null;
    }
    await Promise.all([store.loadOverview(), refreshPromptState()]);
    noticeStore.push("打卡项已删除", "info");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "删除失败";
  }
}

async function handleDeleteRecord(habitId: string, recordId: string) {
  actionError.value = "";

  try {
    await store.deleteRecord(habitId, recordId);
    if (expandedHabitId.value === habitId) {
      await store.loadStats(habitId);
    }
    await Promise.all([store.loadOverview(), refreshPromptState()]);
    noticeStore.push("记录已删除", "info");
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "删除失败";
  }
}

async function submitPrompt() {
  if (!promptTarget.value) {
    return;
  }

  promptPending.value = true;
  promptError.value = "";

  try {
    await store.sendPrompt(promptTarget.value.id, {
      message: promptMessage.value || null,
    });
    closePromptDialog();
    noticeStore.push("提醒已经发出，对方下次登录会看到", "success");
  } catch (error) {
    promptError.value = error instanceof Error ? error.message : "发送提醒失败";
  } finally {
    promptPending.value = false;
  }
}
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <h2 class="page-title">习惯打卡</h2>
      <button v-if="authStore.user" class="ghost-button" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? "收起" : "+ 新建打卡项" }}
      </button>
    </header>

    <p v-if="feedbackMessage" class="action-error">{{ feedbackMessage }}</p>

    <div v-if="!authStore.ready || authStore.pending || bootstrapping" class="list-placeholder">
      正在同步打卡数据...
    </div>

    <section v-else-if="!authStore.user" class="empty-card auth-callout">
      <h3>登录后才能管理自己的打卡项</h3>
      <p>登录后就能查看记录、统计和收到别人发来的打卡提醒。</p>
      <RouterLink class="ghost-button link-button" to="/auth">
        去登录
      </RouterLink>
    </section>

    <template v-else>
      <HabitOverviewCards :overview="store.overview" :loading="store.loading" />

      <section v-if="store.prompts.length" class="prompt-panel">
        <div class="section-row">
          <div>
            <p class="habit-focus-label">收到的提醒</p>
            <h3 class="section-title">有人在催你打卡</h3>
            <p class="helper-copy">这些提醒会和你的打卡项关联，完成后状态会同步变化。</p>
          </div>
        </div>

        <ul class="prompt-list">
          <li v-for="prompt in store.prompts" :key="prompt.id" class="prompt-item">
            <div class="prompt-head">
              <div class="prompt-user">
                <AvatarImage
                  :src="prompt.sender.avatarUrl"
                  :name="prompt.sender.nickname"
                  :alt="`${prompt.sender.nickname} 的头像`"
                  size="sm"
                />
                <div class="prompt-copy">
                  <strong>{{ prompt.sender.nickname }}</strong>
                  <p class="helper-copy">
                    提醒你打卡「{{ prompt.habit.name }}」
                    <template v-if="prompt.sender.region">· {{ prompt.sender.region }}</template>
                  </p>
                </div>
              </div>
              <span class="portal-chip">{{ new Date(prompt.createdAt).toLocaleString("zh-CN") }}</span>
            </div>

            <p v-if="prompt.message" class="prompt-message">{{ prompt.message }}</p>
            <p v-else class="prompt-message">今天别忘了把这项打卡完成。</p>

            <div class="action-row tight">
              <button
                v-if="!prompt.completedToday"
                class="ghost-button prompt-action"
                type="button"
                @click="handleCheckin(prompt.habitId)"
              >
                立即打卡
              </button>
              <span v-else class="portal-chip"><strong>状态:</strong> 今天已完成</span>
            </div>
          </li>
        </ul>
      </section>

      <HabitForm v-if="showCreateForm" @submit="handleCreate" @cancel="showCreateForm = false" />

      <div v-if="store.loading" class="list-placeholder">加载中...</div>

      <div v-else-if="store.activeHabits.length === 0" class="list-placeholder">
        还没有打卡项，点击「新建打卡项」开始吧！
      </div>

      <section v-else class="page-stack">
        <section v-if="expandedHabit" class="habit-focus">
          <div class="habit-focus-head">
            <div>
              <p class="habit-focus-label">当前详情</p>
              <h3 class="habit-focus-title">
                <span v-if="expandedHabit.icon">{{ expandedHabit.icon }}</span>
                {{ expandedHabit.name }}
              </h3>
              <p v-if="expandedHabit.description" class="helper-copy">
                {{ expandedHabit.description }}
              </p>
            </div>
            <div class="habit-focus-meta">
              <span class="portal-chip"><strong>频率:</strong> {{ expandedHabit.cadence }}</span>
              <span class="portal-chip"><strong>目标:</strong> {{ expandedHabit.targetCountPerDay }} 次</span>
              <span class="portal-chip">
                <strong>更新:</strong>
                {{ new Date(expandedHabit.updatedAt).toLocaleDateString("zh-CN") }}
              </span>
            </div>
          </div>

          <div class="detail-grid">
            <div>
              <h4 class="detail-section-title">统计</h4>
              <HabitStatsCard :stats="expandedStats" :loading="expandedStatsLoading" />
            </div>

            <div>
              <h4 class="detail-section-title">最近记录</h4>
              <HabitRecordList
                :records="expandedRecords"
                :loading="expandedRecordsLoading"
                @delete="handleDeleteRecord(expandedHabit.id, $event)"
              />
            </div>
          </div>
        </section>

        <ul class="habit-list">
          <li v-for="habit in store.activeHabits" :key="habit.id" class="habit-list-entry">
            <HabitEditForm
              v-if="editingHabit?.id === habit.id"
              :habit="habit"
              @save="handleSaveEdit"
              @cancel="editingHabit = null"
            />

            <template v-else>
              <HabitListItem
                :habit="habit"
                :checked-today="store.completedTodayIds.has(habit.id)"
                :current-streak="store.stats[habit.id]?.currentStreak"
                @checkin="handleCheckin"
                @undo="handleUndo"
                @edit="editingHabit = $event"
                @archive="handleArchive"
                @remove="handleDeleteHabit"
              />

              <button
                class="expand-button"
                :class="{ 'expand-button--open': expandedHabitId === habit.id }"
                @click="toggleExpand(habit.id)"
              >
                {{ expandedHabitId === habit.id ? "收起详情" : "查看详情" }}
              </button>
            </template>
          </li>
        </ul>
      </section>

      <section v-if="store.communityHabits.length" class="community-panel">
        <div class="section-row">
          <div>
            <p class="habit-focus-label">大家的打卡</p>
            <h3 class="section-title">可以提醒别人记得完成今天的计划</h3>
            <p class="helper-copy">这里会展示其他用户的活跃打卡项，你可以给对方发一条提醒。</p>
          </div>
        </div>

        <ul class="community-list">
          <li
            v-for="habit in store.communityHabits"
            :key="habit.id"
            class="community-card"
            :style="{ '--community-color': habit.color ?? '#215f66' }"
          >
            <div class="community-top">
              <div class="prompt-user">
                <AvatarImage
                  :src="habit.owner.avatarUrl"
                  :name="habit.owner.nickname"
                  :alt="`${habit.owner.nickname} 的头像`"
                  size="sm"
                />
                <div class="prompt-copy">
                  <strong>{{ habit.owner.nickname }}</strong>
                  <p class="helper-copy">
                    @{{ habit.owner.username }}
                    <template v-if="habit.owner.region">· {{ habit.owner.region }}</template>
                  </p>
                </div>
              </div>
              <span class="portal-chip">
                <strong>状态:</strong> {{ habit.completedToday ? "今天已完成" : "今天未完成" }}
              </span>
            </div>

            <div class="community-main">
              <h4>
                <span v-if="habit.icon">{{ habit.icon }}</span>
                {{ habit.name }}
              </h4>
              <p v-if="habit.description" class="helper-copy">{{ habit.description }}</p>
              <div class="habit-focus-meta">
                <span class="portal-chip"><strong>频率:</strong> {{ habit.cadence }}</span>
                <span class="portal-chip"><strong>目标:</strong> {{ habit.targetCountPerDay }} 次</span>
              </div>
            </div>

            <div class="action-row tight">
              <button
                class="ghost-button prompt-action"
                type="button"
                :disabled="habit.completedToday"
                @click="promptTarget = habit"
              >
                {{ habit.completedToday ? "对方已完成" : "提醒对方" }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <details v-if="store.archivedHabits.length" class="archived-section">
        <summary class="archived-summary">已归档（{{ store.archivedHabits.length }}）</summary>
        <ul class="habit-list habit-list--archived">
          <li v-for="habit in store.archivedHabits" :key="habit.id" class="habit-list-entry">
            <div class="archived-item">
              <span v-if="habit.icon" class="archived-icon">{{ habit.icon }}</span>
              <span class="archived-name">{{ habit.name }}</span>
              <span class="archived-badge">已归档</span>
            </div>
          </li>
        </ul>
      </details>
    </template>

    <div v-if="promptTarget" class="prompt-modal-backdrop" @click.self="closePromptDialog">
      <section class="prompt-modal panel-surface" role="dialog" aria-modal="true">
        <p class="habit-focus-label">发送提醒</p>
        <h3 class="section-title">提醒 {{ promptTarget.owner.nickname }}</h3>
        <p class="helper-copy">对方下次登录打卡页时，会看到这条提醒。</p>

        <label class="form-field">
          <span>提醒留言</span>
          <textarea
            v-model.trim="promptMessage"
            class="textarea-input"
            rows="4"
            maxlength="240"
            placeholder="例如：今天别忘了完成这项计划。"
          />
        </label>

        <p v-if="promptError" class="helper-copy danger-copy">{{ promptError }}</p>

        <div class="action-row">
          <button class="secondary-button" type="button" @click="closePromptDialog">
            取消
          </button>
          <button class="ghost-button" type="button" :disabled="promptPending" @click="submitPrompt">
            {{ promptPending ? "发送中..." : "发送提醒" }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 20px;
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title,
.section-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink-strong);
}

.section-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.action-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-red) 10%, transparent);
  color: var(--accent-red);
  font-size: 0.88rem;
}

.list-placeholder {
  color: var(--ink-muted);
  font-size: 0.92rem;
  padding: 16px 0;
}

.auth-callout {
  display: grid;
  gap: 12px;
}

.habit-focus,
.prompt-panel,
.community-panel {
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  background: var(--bg-panel-strong);
}

.prompt-panel {
  border-color: rgba(214, 164, 73, 0.22);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(252, 246, 230, 0.96)),
    var(--bg-panel-strong);
}

.community-panel {
  border-color: rgba(33, 95, 102, 0.16);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(241, 248, 247, 0.96)),
    var(--bg-panel-strong);
}

.habit-focus-head {
  display: grid;
  gap: 14px;
}

.habit-focus-label {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-teal);
}

.habit-focus-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
}

.habit-focus-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-section-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-muted);
  letter-spacing: 0.04em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.habit-list,
.prompt-list,
.community-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.habit-list-entry {
  display: grid;
  gap: 4px;
}

.expand-button {
  background: transparent;
  border: 0;
  color: var(--ink-muted);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 8px;
  text-align: left;
  transition: color 0.15s;
}

.expand-button:hover,
.expand-button--open {
  color: var(--ink-strong);
}

.prompt-item,
.community-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(31, 36, 48, 0.08);
  background: rgba(255, 255, 255, 0.82);
}

.community-card {
  border-left: 4px solid var(--community-color);
}

.prompt-head,
.community-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prompt-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prompt-copy {
  display: grid;
  gap: 4px;
}

.prompt-message {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.7;
}

.community-main {
  display: grid;
  gap: 10px;
}

.community-main h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.06rem;
}

.prompt-action {
  white-space: nowrap;
}

.archived-section {
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  padding: 12px 16px;
}

.archived-summary {
  font-size: 0.88rem;
  color: var(--ink-muted);
  cursor: pointer;
  user-select: none;
}

.habit-list--archived {
  margin-top: 12px;
}

.archived-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  opacity: 0.6;
}

.archived-icon {
  font-size: 1.1rem;
}

.archived-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--ink-muted);
}

.archived-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--line-soft);
  color: var(--ink-muted);
}

.prompt-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 24, 31, 0.42);
  backdrop-filter: blur(8px);
}

.prompt-modal {
  width: min(520px, 100%);
  padding: 24px;
}

@media (max-width: 720px) {
  .page-header,
  .section-row,
  .prompt-head,
  .community-top,
  .prompt-user {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
