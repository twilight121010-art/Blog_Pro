import { defineStore } from "pinia";

export type NoticeTone = "info" | "success" | "error";

export interface NoticeItem {
  id: number;
  message: string;
  tone: NoticeTone;
}

let nextNoticeId = 1;

export const useNoticeStore = defineStore("notices", {
  state: () => ({
    items: [] as NoticeItem[],
  }),
  actions: {
    push(message: string, tone: NoticeTone = "info", durationMs = 3200) {
      const id = nextNoticeId++;

      this.items.push({
        id,
        message,
        tone,
      });

      window.setTimeout(() => {
        this.remove(id);
      }, durationMs);

      return id;
    },
    remove(id: number) {
      this.items = this.items.filter((item) => item.id !== id);
    },
    clear() {
      this.items = [];
    },
  },
});
