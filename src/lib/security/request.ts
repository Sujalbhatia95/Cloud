import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

export type RequestMeta = { ip: string | null; userAgent: string | null };

export function metaFromHeaders(h: Headers): RequestMeta {
  let ip: string | null = null;
  if (env.trustProxyHeaders) {
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
  }
  const ua = h.get("user-agent");
  return { ip, userAgent: ua ? ua.slice(0, 300) : null };
}

export async function requestMeta(): Promise<RequestMeta> {
  return metaFromHeaders(await headers());
}
