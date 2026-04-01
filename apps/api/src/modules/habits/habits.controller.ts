import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson, sendNoContent, sendError } from "../../http/response.js";
import { readJsonBody } from "../../http/request.js";
import { HttpError } from "../../lib/http-error.js";
import { requireSessionContext } from "../auth/auth.service.js";
import {
  listHabits,
  listCommunityHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  permanentlyDeleteHabit,
  listRecords,
  createRecord,
  deleteRecord,
  getHabitStats,
  getHabitsOverview,
  listReceivedHabitPrompts,
  createHabitPrompt,
} from "./habits.service.js";
import type {
  HabitCreateInput,
  HabitPromptCreateInput,
  HabitUpdateInput,
  HabitRecordCreateInput,
} from "@blog/shared";

async function handle(
  response: ServerResponse,
  fn: () => Promise<unknown>,
  successStatusCode = 200,
): Promise<void> {
  try {
    const result = await fn();
    if (result === null || result === undefined) {
      sendNoContent(response);
    } else {
      sendJson(response, successStatusCode, result);
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      sendError(response, 400, "Invalid JSON body");
      return;
    }

    if (err instanceof HttpError) {
      sendError(response, err.statusCode, err.message);
    } else {
      console.error("[habits]", err);
      sendError(response, 500, "internal server error");
    }
  }
}

// GET /api/habits/overview
export async function handleHabitsOverview(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const overview = await getHabitsOverview(session.userId);
    return { overview };
  });
}

// GET /api/habits
export async function handleListHabits(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const items = await listHabits(session.userId);
    return { items };
  });
}

// GET /api/habits/community
export async function handleListCommunityHabits(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const items = await listCommunityHabits(session.userId);
    return { items };
  });
}

// GET /api/habits/prompts
export async function handleListHabitPrompts(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const items = await listReceivedHabitPrompts(session.userId);
    return { items };
  });
}

// POST /api/habits
export async function handleCreateHabit(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const input = await readJsonBody<HabitCreateInput>(req);
    const item = await createHabit(session.userId, input);
    return { item };
  }, 201);
}

// PATCH /api/habits/:habitId
export async function handleUpdateHabit(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const input = await readJsonBody<HabitUpdateInput>(req);
    const item = await updateHabit(session.userId, habitId, input);
    return { item };
  });
}

// DELETE /api/habits/:habitId
export async function handleDeleteHabit(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    await deleteHabit(session.userId, habitId);
    return null;
  });
}

// DELETE /api/habits/:habitId/permanent
export async function handlePermanentDeleteHabit(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    await permanentlyDeleteHabit(session.userId, habitId);
    return null;
  });
}

// GET /api/habits/:habitId/records
export async function handleListRecords(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const items = await listRecords(session.userId, habitId);
    return { items };
  });
}

// POST /api/habits/:habitId/records
export async function handleCreateRecord(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const input = await readJsonBody<HabitRecordCreateInput>(req);
    const item = await createRecord(session.userId, habitId, input);
    return { item };
  }, 201);
}

// POST /api/habits/:habitId/prompts
export async function handleCreateHabitPrompt(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const input = await readJsonBody<HabitPromptCreateInput>(req);
    const item = await createHabitPrompt(session.userId, habitId, input);
    return { item };
  }, 201);
}

// DELETE /api/habits/:habitId/records/:recordId
export async function handleDeleteRecord(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
  recordId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    await deleteRecord(session.userId, habitId, recordId);
    return null;
  });
}

// GET /api/habits/:habitId/stats
export async function handleHabitStats(
  req: IncomingMessage,
  res: ServerResponse,
  habitId: string,
): Promise<void> {
  await handle(res, async () => {
    const session = await requireSessionContext(req);
    const stats = await getHabitStats(session.userId, habitId);
    return { stats };
  });
}
