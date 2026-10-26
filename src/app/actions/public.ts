"use server";

import { submitContactMessage, submitSellerEnquiry, submitShowingRequest, type FormState } from "@/lib/enquiries";
import { rateLimit } from "@/lib/forms/rate-limit";
import { hashIp } from "@/lib/security/crypto";
import { requestMeta } from "@/lib/security/request";
import { estimateValue, type ValuationInput, type ValuationResult } from "@/lib/valuation";

/* Public form handlers. All validation, spam checks and rate limits run server-side in lib/enquiries. */

export async function scheduleShowingAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    return await submitShowingRequest(data, await requestMeta());
  } catch (e) {
    console.error("[showing] submission failed", e);
    return { status: "error", message: "Sorry, something went wrong on our side. Please try again or email us directly." };
  }
}

export async function sellerEnquiryAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    let snapshot: unknown = undefined;
    const raw = data.get("valuation_snapshot");
    if (typeof raw === "string" && raw.length > 0 && raw.length < 2000) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        // Only keep known numeric/text keys from the estimate shown to the owner.
        snapshot = {
          low: Number(parsed.low) || null,
          high: Number(parsed.high) || null,
          basis: typeof parsed.basis === "string" ? parsed.basis.slice(0, 120) : null,
        };
      } catch {
        snapshot = undefined;
      }
    }
    return await submitSellerEnquiry(data, await requestMeta(), snapshot);
  } catch (e) {
    console.error("[seller] submission failed", e);
    return { status: "error", message: "Sorry, something went wrong on our side. Please try again or email us directly." };
  }
}

export async function contactAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    return await submitContactMessage(data, await requestMeta());
  } catch (e) {
    console.error("[contact] submission failed", e);
    return { status: "error", message: "Sorry, something went wrong on our side. Please try again or email us directly." };
  }
}

export async function valuationAction(input: ValuationInput): Promise<ValuationResult> {
  const meta = await requestMeta();
  const rl = await rateLimit(`valuation:${hashIp(meta.ip) ?? "unknown"}`, 60, 3600);
  if (!rl.ok) return { ok: false, error: "Too many calculations from your connection. Please try again later." };
  try {
    return await estimateValue(input);
  } catch (e) {
    console.error("[valuation] failed", e);
    return { ok: false, error: "Sorry, the calculator is unavailable right now. Please try again." };
  }
}
