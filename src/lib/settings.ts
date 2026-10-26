import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { atRequestTime } from "./request-time";
import { parseSettings, settingsSchema, type SiteSettings } from "./settings-schema";

/** Reads settings once per request (deduplicated with React.cache). */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  await atRequestTime();
  const db = getDb();
  const [row] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).limit(1);
  return parseSettings(row?.data);
});

export async function saveSettings(next: SiteSettings, updatedBy: string): Promise<void> {
  const data = settingsSchema.parse(next);
  const db = getDb();
  await db
    .insert(schema.siteSettings)
    .values({ id: 1, data, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteSettings.id, set: { data, updatedBy, updatedAt: new Date() } });
}

export type { SiteSettings };
