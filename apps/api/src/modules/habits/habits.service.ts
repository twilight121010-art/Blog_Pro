import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import type {
  CommunityHabit,
  Habit,
  HabitCreateInput,
  HabitPersonSummary,
  HabitPrompt,
  HabitPromptCreateInput,
  HabitRecord,
  HabitRecordCreateInput,
  HabitStats,
  HabitsOverview,
  HabitUpdateInput,
} from "@blog/shared";

// ─── Habits CRUD ──────────────────────────────────────────────────────────────

export async function listHabits(userId: string): Promise<Habit[]> {
  const rows = await prisma.habit.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toHabit);
}

export async function createHabit(
  userId: string,
  input: HabitCreateInput,
): Promise<Habit> {
  if (!input.name?.trim()) {
    throw new HttpError(400, "name is required");
  }

  const row = await prisma.habit.create({
    data: {
      userId,
      name: input.name.trim(),
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      cadence: input.cadence ?? "daily",
      targetCountPerDay: input.targetCountPerDay ?? 1,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  return toHabit(row);
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: HabitUpdateInput,
): Promise<Habit> {
  const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!existing) {
    throw new HttpError(404, "habit not found");
  }

  const row = await prisma.habit.update({
    where: { id: habitId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.cadence !== undefined && { cadence: input.cadence }),
      ...(input.targetCountPerDay !== undefined && {
        targetCountPerDay: input.targetCountPerDay,
      }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
    },
  });

  return toHabit(row);
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!existing) {
    throw new HttpError(404, "habit not found");
  }

  // Soft delete: archive instead of hard delete
  await prisma.habit.update({
    where: { id: habitId },
    data: { isArchived: true },
  });
}

export async function permanentlyDeleteHabit(userId: string, habitId: string): Promise<void> {
  const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!existing) {
    throw new HttpError(404, "habit not found");
  }

  await prisma.habit.delete({
    where: {
      id: habitId,
    },
  });
}

// ─── Records ─────────────────────────────────────────────────────────────────

export async function listRecords(
  userId: string,
  habitId: string,
  options?: { limit?: number; offset?: number },
): Promise<HabitRecord[]> {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!habit) {
    throw new HttpError(404, "habit not found");
  }

  const rows = await prisma.habitRecord.findMany({
    where: { habitId },
    orderBy: { recordDate: "desc" },
    take: options?.limit ?? 90,
    skip: options?.offset ?? 0,
  });

  return rows.map(toRecord);
}

export async function createRecord(
  userId: string,
  habitId: string,
  input: HabitRecordCreateInput,
): Promise<HabitRecord> {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!habit) {
    throw new HttpError(404, "habit not found");
  }

  if (!input.recordDate) {
    throw new HttpError(400, "recordDate is required (YYYY-MM-DD)");
  }

  const row = await prisma.habitRecord.upsert({
    where: { habitId_recordDate: { habitId, recordDate: input.recordDate } },
    create: {
      habitId,
      userId,
      recordDate: input.recordDate,
      value: input.value ?? 1,
      note: input.note ?? null,
    },
    update: {
      value: input.value ?? 1,
      note: input.note ?? null,
    },
  });

  return toRecord(row);
}

export async function deleteRecord(
  userId: string,
  habitId: string,
  recordId: string,
): Promise<void> {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!habit) {
    throw new HttpError(404, "habit not found");
  }

  const record = await prisma.habitRecord.findFirst({
    where: { id: recordId, habitId },
  });

  if (!record) {
    throw new HttpError(404, "record not found");
  }

  await prisma.habitRecord.delete({ where: { id: recordId } });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getHabitStats(
  userId: string,
  habitId: string,
): Promise<HabitStats> {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });

  if (!habit) {
    throw new HttpError(404, "habit not found");
  }

  const allRecords = await prisma.habitRecord.findMany({
    where: { habitId },
    orderBy: { recordDate: "asc" },
    select: { recordDate: true },
  });

  const today = todayString();
  const d7 = offsetDate(today, -7);
  const d30 = offsetDate(today, -30);

  const totalCount = allRecords.length;
  const last7Days = allRecords.filter((r) => r.recordDate >= d7).length;
  const last30Days = allRecords.filter((r) => r.recordDate >= d30).length;

  const { currentStreak, longestStreak } = computeStreaks(
    allRecords.map((r) => r.recordDate),
    today,
  );

  return {
    habitId,
    totalCount,
    last7Days,
    last30Days,
    currentStreak,
    longestStreak,
  };
}

export async function getHabitsOverview(userId: string): Promise<HabitsOverview> {
  const [allHabits, allRecords] = await Promise.all([
    prisma.habit.findMany({ where: { userId }, select: { id: true, isArchived: true } }),
    prisma.habitRecord.findMany({
      where: { userId },
      select: { recordDate: true },
    }),
  ]);

  const today = todayString();
  const d7 = offsetDate(today, -7);
  const d30 = offsetDate(today, -30);

  return {
    totalHabits: allHabits.length,
    activeHabits: allHabits.filter((h) => !h.isArchived).length,
    todayCompleted: allRecords.filter((r) => r.recordDate === today).length,
    last7DaysCompleted: allRecords.filter((r) => r.recordDate >= d7).length,
    last30DaysCompleted: allRecords.filter((r) => r.recordDate >= d30).length,
  };
}

type HabitPersonRow = {
  id: string;
  username: string;
  userCode: string;
  nickname: string;
  avatarUrl: string | null;
  region: string | null;
};

type CommunityHabitRow = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  cadence: string;
  targetCountPerDay: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerUsername: string;
  ownerUserCode: string;
  ownerNickname: string;
  ownerAvatarUrl: string | null;
  ownerRegion: string | null;
  completedToday: number | boolean;
};

type HabitPromptRow = {
  id: string;
  habitId: string;
  message: string | null;
  createdAt: Date;
  readAt: Date | null;
  habitName: string;
  habitIcon: string | null;
  senderId: string;
  senderUsername: string;
  senderUserCode: string;
  senderNickname: string;
  senderAvatarUrl: string | null;
  senderRegion: string | null;
  completedToday: number | boolean;
};

type HabitPromptTargetRow = {
  habitId: string;
  habitName: string;
  habitOwnerId: string;
  isArchived: number | boolean;
  completedToday: number | boolean;
};

export async function listCommunityHabits(userId: string): Promise<CommunityHabit[]> {
  const today = todayString();
  const rows = await prisma.$queryRaw<CommunityHabitRow[]>`
    SELECT
      h."id" AS "id",
      h."name" AS "name",
      h."description" AS "description",
      h."color" AS "color",
      h."icon" AS "icon",
      h."cadence" AS "cadence",
      h."targetCountPerDay" AS "targetCountPerDay",
      h."createdAt" AS "createdAt",
      h."updatedAt" AS "updatedAt",
      u."id" AS "ownerId",
      u."username" AS "ownerUsername",
      u."userCode" AS "ownerUserCode",
      u."nickname" AS "ownerNickname",
      u."avatarUrl" AS "ownerAvatarUrl",
      p."region" AS "ownerRegion",
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "habit_records" AS hr
          WHERE hr."habitId" = h."id"
            AND hr."recordDate" = ${today}
        )
        THEN 1
        ELSE 0
      END AS "completedToday"
    FROM "habits" AS h
    INNER JOIN "User" AS u
      ON u."id" = h."userId"
    LEFT JOIN "UserProfile" AS p
      ON p."userId" = u."id"
    WHERE h."isArchived" = 0
      AND h."userId" <> ${userId}
    ORDER BY h."updatedAt" DESC, h."createdAt" DESC
    LIMIT 60
  `;

  return rows.map((row) => ({
    id: row.id,
    owner: toHabitPerson({
      id: row.ownerId,
      username: row.ownerUsername,
      userCode: row.ownerUserCode,
      nickname: row.ownerNickname,
      avatarUrl: row.ownerAvatarUrl,
      region: row.ownerRegion,
    }),
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    cadence: row.cadence,
    targetCountPerDay: row.targetCountPerDay,
    completedToday: isTruthySqliteValue(row.completedToday),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function listReceivedHabitPrompts(userId: string): Promise<HabitPrompt[]> {
  const today = todayString();
  const rows = await prisma.$queryRaw<HabitPromptRow[]>`
    SELECT
      hp."id" AS "id",
      hp."habitId" AS "habitId",
      hp."message" AS "message",
      hp."createdAt" AS "createdAt",
      hp."readAt" AS "readAt",
      h."name" AS "habitName",
      h."icon" AS "habitIcon",
      s."id" AS "senderId",
      s."username" AS "senderUsername",
      s."userCode" AS "senderUserCode",
      s."nickname" AS "senderNickname",
      s."avatarUrl" AS "senderAvatarUrl",
      sp."region" AS "senderRegion",
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "habit_records" AS hr
          WHERE hr."habitId" = hp."habitId"
            AND hr."recordDate" = ${today}
        )
        THEN 1
        ELSE 0
      END AS "completedToday"
    FROM "habit_prompts" AS hp
    INNER JOIN "habits" AS h
      ON h."id" = hp."habitId"
    INNER JOIN "User" AS s
      ON s."id" = hp."fromUserId"
    LEFT JOIN "UserProfile" AS sp
      ON sp."userId" = s."id"
    WHERE hp."toUserId" = ${userId}
    ORDER BY hp."createdAt" DESC
    LIMIT 20
  `;

  return rows.map((row) => ({
    id: row.id,
    habitId: row.habitId,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    completedToday: isTruthySqliteValue(row.completedToday),
    habit: {
      id: row.habitId,
      name: row.habitName,
      icon: row.habitIcon,
    },
    sender: toHabitPerson({
      id: row.senderId,
      username: row.senderUsername,
      userCode: row.senderUserCode,
      nickname: row.senderNickname,
      avatarUrl: row.senderAvatarUrl,
      region: row.senderRegion,
    }),
  }));
}

export async function createHabitPrompt(
  userId: string,
  habitId: string,
  input: HabitPromptCreateInput,
): Promise<HabitPrompt> {
  const message = input.message?.trim() || null;
  const today = todayString();
  const targetRows = await prisma.$queryRaw<HabitPromptTargetRow[]>`
    SELECT
      h."id" AS "habitId",
      h."name" AS "habitName",
      h."userId" AS "habitOwnerId",
      h."isArchived" AS "isArchived",
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "habit_records" AS hr
          WHERE hr."habitId" = h."id"
            AND hr."recordDate" = ${today}
        )
        THEN 1
        ELSE 0
      END AS "completedToday"
    FROM "habits" AS h
    WHERE h."id" = ${habitId}
    LIMIT 1
  `;

  const target = targetRows[0];

  if (!target || isTruthySqliteValue(target.isArchived)) {
    throw new HttpError(404, "habit not found");
  }

  if (target.habitOwnerId === userId) {
    throw new HttpError(400, "You cannot remind your own habit");
  }

  if (isTruthySqliteValue(target.completedToday)) {
    throw new HttpError(409, "The owner has already checked in today");
  }

  const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "habit_prompts"
    WHERE "habitId" = ${habitId}
      AND "fromUserId" = ${userId}
      AND DATE("createdAt") = DATE("now")
    LIMIT 1
  `;

  if (existingRows[0]) {
    throw new HttpError(409, "You have already sent a reminder for this habit today");
  }

  const promptId = randomUUID();
  const createdAt = new Date();

  await prisma.$executeRaw`
    INSERT INTO "habit_prompts" (
      "id",
      "habitId",
      "fromUserId",
      "toUserId",
      "message",
      "createdAt"
    )
    VALUES (
      ${promptId},
      ${habitId},
      ${userId},
      ${target.habitOwnerId},
      ${message},
      ${createdAt}
    )
  `;

  const rows = await prisma.$queryRaw<HabitPromptRow[]>`
    SELECT
      hp."id" AS "id",
      hp."habitId" AS "habitId",
      hp."message" AS "message",
      hp."createdAt" AS "createdAt",
      hp."readAt" AS "readAt",
      h."name" AS "habitName",
      h."icon" AS "habitIcon",
      s."id" AS "senderId",
      s."username" AS "senderUsername",
      s."userCode" AS "senderUserCode",
      s."nickname" AS "senderNickname",
      s."avatarUrl" AS "senderAvatarUrl",
      sp."region" AS "senderRegion",
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "habit_records" AS hr
          WHERE hr."habitId" = hp."habitId"
            AND hr."recordDate" = ${today}
        )
        THEN 1
        ELSE 0
      END AS "completedToday"
    FROM "habit_prompts" AS hp
    INNER JOIN "habits" AS h
      ON h."id" = hp."habitId"
    INNER JOIN "User" AS s
      ON s."id" = hp."fromUserId"
    LEFT JOIN "UserProfile" AS sp
      ON sp."userId" = s."id"
    WHERE hp."id" = ${promptId}
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    throw new HttpError(500, "Failed to create prompt");
  }

  return {
    id: row.id,
    habitId: row.habitId,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    completedToday: isTruthySqliteValue(row.completedToday),
    habit: {
      id: row.habitId,
      name: row.habitName,
      icon: row.habitIcon,
    },
    sender: toHabitPerson({
      id: row.senderId,
      username: row.senderUsername,
      userCode: row.senderUserCode,
      nickname: row.senderNickname,
      avatarUrl: row.senderAvatarUrl,
      region: row.senderRegion,
    }),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeStreaks(
  sortedDates: string[],
  today: string,
): { currentStreak: number; longestStreak: number } {
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const unique = [...new Set(sortedDates)].sort();

  let longest = 1;
  let current = 1;

  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;

    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  // Check if current streak reaches today or yesterday
  const last = unique[unique.length - 1];
  const yesterday = offsetDate(today, -1);
  const isStreakActive = last === today || last === yesterday;

  if (!isStreakActive) {
    current = 0;
  }

  return { currentStreak: current, longestStreak: longest };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function isTruthySqliteValue(value: number | boolean) {
  return value === true || value === 1;
}

function toHabitPerson(row: HabitPersonRow): HabitPersonSummary {
  return {
    id: row.id,
    username: row.username,
    userCode: row.userCode,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    region: row.region,
  };
}

function toHabit(row: {
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
  createdAt: Date;
  updatedAt: Date;
}): Habit {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    cadence: row.cadence,
    targetCountPerDay: row.targetCountPerDay,
    sortOrder: row.sortOrder,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRecord(row: {
  id: string;
  habitId: string;
  userId: string;
  recordDate: string;
  value: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): HabitRecord {
  return {
    id: row.id,
    habitId: row.habitId,
    userId: row.userId,
    recordDate: row.recordDate,
    value: row.value,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
