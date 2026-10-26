"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { AuthError, audit, requireAction } from "@/lib/auth/guards";
import { cancelBatch, commitBatch, createBatch, ImportError, loadOpenBatch, previewBatch, switchSheet } from "@/lib/import/commit";
import { sanitiseMapping } from "@/lib/import/mapping";
import { ImportFileError, MAX_FILE_BYTES } from "@/lib/import/parse-file";

export type UploadState = { error?: string };

export async function uploadImportAction(_prev: UploadState, data: FormData): Promise<UploadState> {
  let user;
  try {
    user = await requireAction("imports");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Not allowed." };
  }
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .csv, .xlsx or .xls file to upload." };
  if (file.size > MAX_FILE_BYTES) return { error: `The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB. Split it into smaller files.` };
  let id: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const res = await createBatch(getDb(), { name: file.name, data: buf }, user);
    id = res.id;
    await audit(user, "import.uploaded", "import_batch", id, { filename: file.name, size: file.size, profile: res.profile });
  } catch (e) {
    if (e instanceof ImportFileError || e instanceof ImportError) return { error: e.message };
    console.error("[import] upload failed", e);
    return { error: "The file could not be read. Save it again from Excel or Google Sheets and retry." };
  }
  redirect(`/admin/imports/${id}`);
}

export async function switchSheetAction(data: FormData) {
  await requireAction("imports");
  const id = String(data.get("id") ?? "");
  const sheet = String(data.get("sheet") ?? "");
  try {
    await switchSheet(getDb(), id, sheet);
  } catch (e) {
    redirect(`/admin/imports/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not switch sheet")}`);
  }
  redirect(`/admin/imports/${id}?notice=${encodeURIComponent(`Now reading sheet "${sheet}".`)}`);
}

export async function previewImportAction(data: FormData) {
  const user = await requireAction("imports");
  const id = String(data.get("id") ?? "");
  const db = getDb();
  let message: string;
  try {
    const batch = await loadOpenBatch(db, id);
    const rawMapping: Record<string, unknown> = {};
    for (const [k, v] of data.entries()) {
      if (k.startsWith("map_") && typeof v === "string" && v !== "") rawMapping[k.slice(4)] = Number(v);
    }
    const mapping = sanitiseMapping(rawMapping, batch.headers.length);
    const profileName = String(data.get("profile_name") ?? "").trim();
    const a = await previewBatch(db, id, mapping, { saveProfileAs: profileName || null });
    await audit(user, "import.previewed", "import_batch", id, { ...a.summary });
    message = `Preview ready: ${a.summary.added} to add, ${a.summary.updated} to update, ${a.summary.unchanged} unchanged, ${a.summary.skipped} skipped, ${a.summary.rejected} rejected. Nothing has been changed yet.`;
  } catch (e) {
    redirect(`/admin/imports/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "Preview failed")}`);
  }
  redirect(`/admin/imports/${id}?notice=${encodeURIComponent(message)}#preview`);
}

export async function commitImportAction(data: FormData) {
  const user = await requireAction("imports");
  const id = String(data.get("id") ?? "");
  if (data.get("confirm") !== "on") redirect(`/admin/imports/${id}?error=${encodeURIComponent("Tick the confirmation box to import.")}#preview`);
  const strict = data.get("strict") === "on";
  const result = await commitBatch(getDb(), id, user, { strict });
  if (!result.ok) {
    await audit(user, "import.failed", "import_batch", id, { error: result.error });
    redirect(`/admin/imports/${id}?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/", "layout");
  const s = result.analysis.summary;
  redirect(
    `/admin/imports/${id}?notice=${encodeURIComponent(`Import complete: ${s.added} added, ${s.updated} updated, ${s.unchanged} unchanged, ${s.skipped} skipped, ${s.rejected} rejected. Changes are live on the website.`)}`,
  );
}

export async function cancelImportAction(data: FormData) {
  const user = await requireAction("imports");
  const id = String(data.get("id") ?? "");
  await cancelBatch(getDb(), id);
  await audit(user, "import.cancelled", "import_batch", id);
  redirect(`/admin/imports?notice=${encodeURIComponent("Import cancelled. No listings were changed.")}`);
}
