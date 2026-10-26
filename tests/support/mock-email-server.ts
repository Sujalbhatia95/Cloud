import http from "node:http";
import type { AddressInfo } from "node:net";

export type CapturedEmail = { path: string; auth: string | undefined; body: Record<string, unknown> };

/** Minimal stand-in for the Resend / SendGrid HTTP APIs, used to verify outgoing notifications. */
export async function startMockEmailServer() {
  const received: CapturedEmail[] = [];
  let failNext = 0;
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (req.method === "GET" && req.url === "/__messages") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(received));
        return;
      }
      if (req.method === "POST" && req.url?.startsWith("/__fail")) {
        failNext = Number(new URL(req.url, "http://x").searchParams.get("count") ?? "1");
        res.end("ok");
        return;
      }
      if (req.method === "POST" && req.url === "/__reset") {
        received.length = 0;
        failNext = 0;
        res.end("ok");
        return;
      }
      if (failNext > 0) {
        failNext--;
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "Simulated provider outage" }));
        return;
      }
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(data);
      } catch {
        /* ignore */
      }
      received.push({ path: req.url ?? "", auth: req.headers.authorization, body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: `mock_${received.length}` }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    received,
    failNext: (n: number) => (failNext = n),
    reset: () => {
      received.length = 0;
      failNext = 0;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
