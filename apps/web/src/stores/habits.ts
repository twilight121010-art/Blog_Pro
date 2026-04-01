import { defineStore } from "pinia";
import type {
  CommunityHabit,
  Habit,
  HabitCreateInput,
  HabitDetailResponse,
  HabitPrompt,
  HabitPromptCreateInput,
  HabitPromptsResponse,
  HabitRecord,
  HabitRecordCreateInput,
  HabitRecordsListResponse,
  HabitStats,
  HabitStatsResponse,
  CommunityHabitsResponse,
  HabitsListResponse,
  HabitsOverview,
  HabitsOverviewResponse,
  HabitUpdateInput,
} from "@blog/shared";
import { API_ROUTES } from "@blog/shared";
import { apiFetch } from "@/lib/api";

interface HabitsState {
  habits: Habit[];
  communityHabits: CommunityHabit[];
  prompts: HabitPrompt[];
  records: Record<string, HabitRecord[]>;
  stats: Record<string, HabitStats>;
  overview: HabitsOverview | null;
  loading: boolean;
  error: string | null;
}

export const useHabitsStore = defineStore("habits", {
  state: (): HabitsState => ({
    habits: [],
    communityHabits: [],
    prompts: [],
    records: {},
    stats: {},
    overview: null,
    loading: false,
    error: null,
  }),

  getters: {
    activeHabits: (state) => state.habits.filter((habit) => !habit.isArchived),
    archivedHabits: (state) => state.habits.filter((habit) => habit.isArchived),
    todayString: () => new Date().toISOString().slice(0, 10),
    completedTodayIds(state): Set<string> {
      const today = new Date().toISOString().slice(0, 10);
      const ids = new Set<string>();

      for (const [habitId, records] of Object.entries(state.records)) {
        if (records.some((record) => record.recordDate === today)) {
          ids.add(habitId);
        }
      }

      return ids;
    },
  },

  actions: {
    reset() {
      this.habits = [];
      this.communityHabits = [];
      this.prompts = [];
      this.records = {};
      this.stats = {};
      this.overview = null;
      this.loading = false;
      this.error = null;
    },

    async loadHabits() {
      this.loading = true;
      this.error = null;

      try {
        const data = await apiFetch<HabitsListResponse>(API_ROUTES.habits);
        this.habits = data.items;
        return data.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Unknown habits error";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadCommunityHabits() {
      this.error = null;

      try {
        const data = await apiFetch<CommunityHabitsResponse>(API_ROUTES.habitsCommunity);
        this.communityHabits = data.items;
        return data.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load community habits";
        throw error;
      }
    },

    async createHabit(input: HabitCreateInput) {
      this.error = null;

      try {
        const data = await apiFetch<HabitDetailResponse>(API_ROUTES.habits, {
          method: "POST",
          body: JSON.stringify(input),
        });

        this.habits.push(data.item);
        return data.item;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to create the habit";
        throw error;
      }
    },

    async updateHabit(habitId: string, input: HabitUpdateInput) {
      this.error = null;

      try {
        const data = await apiFetch<HabitDetailResponse>(
          `${API_ROUTES.habits}/${habitId}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        );

        const index = this.habits.findIndex((habit) => habit.id === habitId);
        if (index >= 0) {
          this.habits[index] = data.item;
        }

        return data.item;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to update the habit";
        throw error;
      }
    },

    async archiveHabit(habitId: string) {
      this.error = null;

      try {
        await apiFetch<void>(`${API_ROUTES.habits}/${habitId}`, {
          method: "DELETE",
        });

        const index = this.habits.findIndex((habit) => habit.id === habitId);
        if (index >= 0) {
          this.habits[index].isArchived = true;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to archive the habit";
        throw error;
      }
    },

    async permanentlyDeleteHabit(habitId: string) {
      this.error = null;

      try {
        await apiFetch<void>(`${API_ROUTES.habits}/${habitId}/permanent`, {
          method: "DELETE",
        });

        this.habits = this.habits.filter((habit) => habit.id !== habitId);
        delete this.records[habitId];
        delete this.stats[habitId];
        this.prompts = this.prompts.filter((prompt) => prompt.habitId !== habitId);
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to delete the habit";
        throw error;
      }
    },

    async loadRecords(habitId: string) {
      this.error = null;

      try {
        const data = await apiFetch<HabitRecordsListResponse>(
          `${API_ROUTES.habits}/${habitId}/records`,
        );

        this.records[habitId] = data.items;
        return data.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load habit records";
        throw error;
      }
    },

    async checkinToday(habitId: string) {
      this.error = null;
      const today = new Date().toISOString().slice(0, 10);
      const input: HabitRecordCreateInput = { recordDate: today };

      try {
        const data = await apiFetch<{ item: HabitRecord }>(
          `${API_ROUTES.habits}/${habitId}/records`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        );

        if (!this.records[habitId]) {
          this.records[habitId] = [];
        }

        const index = this.records[habitId].findIndex(
          (record) => record.id === data.item.id,
        );

        if (index >= 0) {
          this.records[habitId][index] = data.item;
        } else {
          this.records[habitId].unshift(data.item);
        }

        return data.item;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to create the record";
        throw error;
      }
    },

    async deleteRecord(habitId: string, recordId: string) {
      this.error = null;

      try {
        await apiFetch<void>(`${API_ROUTES.habits}/${habitId}/records/${recordId}`, {
          method: "DELETE",
        });

        if (this.records[habitId]) {
          this.records[habitId] = this.records[habitId].filter(
            (record) => record.id !== recordId,
          );
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to delete the record";
        throw error;
      }
    },

    async loadStats(habitId: string) {
      this.error = null;

      try {
        const data = await apiFetch<HabitStatsResponse>(
          `${API_ROUTES.habits}/${habitId}/stats`,
        );

        this.stats[habitId] = data.stats;
        return data.stats;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load habit stats";
        throw error;
      }
    },

    async loadOverview() {
      this.error = null;

      try {
        const data = await apiFetch<HabitsOverviewResponse>(API_ROUTES.habitsOverview);
        this.overview = data.overview;
        return data.overview;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load habits overview";
        throw error;
      }
    },

    async loadPrompts() {
      this.error = null;

      try {
        const data = await apiFetch<HabitPromptsResponse>(API_ROUTES.habitsPrompts);
        this.prompts = data.items;
        return data.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to load habit prompts";
        throw error;
      }
    },

    async sendPrompt(habitId: string, input: HabitPromptCreateInput) {
      this.error = null;

      try {
        const data = await apiFetch<{ item: HabitPrompt }>(
          `${API_ROUTES.habits}/${habitId}/prompts`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        );

        return data.item;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to send habit prompt";
        throw error;
      }
    },
  },
});
