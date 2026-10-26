"use client";

import { useActionState, useState } from "react";
import { uploadImportAction, type UploadState } from "@/app/admin/actions/imports";
import { IconUpload } from "@/components/ui/icons";
import { PendingButton } from "./ConfirmButton";

const MAX = 4 * 1024 * 1024;

export function UploadForm() {
  const [state, action] = useActionState<UploadState, FormData>(uploadImportAction, {});
  const [clientError, setClientError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const error = clientError ?? state.error;
  return (
    <form action={action} className="space-y-4">
      {error ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-50 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-400 bg-ivory px-6 py-10 text-center transition-colors hover:border-royal">
        <IconUpload size={32} className="text-royal" />
        <span className="font-semibold text-ink">{name ?? "Choose your spreadsheet"}</span>
        <span className="text-xs text-muted">.csv, .xlsx or .xls · up to 4 MB · up to 5,000 rows</span>
        <input
          type="file"
          name="file"
          required
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="sr-only"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            setName(f?.name ?? null);
            if (f && f.size > MAX) setClientError("This file is larger than 4 MB. Split it into smaller files.");
            else if (f && !/\.(csv|xlsx|xls)$/i.test(f.name)) setClientError("Only .csv, .xlsx and .xls files are supported.");
            else setClientError(null);
          }}
        />
      </label>
      <PendingButton className="btn btn-primary w-full" pendingText="Reading file…" disabled={!!clientError}>
        Upload and map columns
      </PendingButton>
      <p className="text-xs text-muted">Uploading does not change any listing. You will see a preview and must confirm first.</p>
    </form>
  );
}
