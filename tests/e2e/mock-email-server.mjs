// Stand-in for the Resend API during end-to-end tests. Records every email it receives.
// GET /__messages → JSON list · POST /__fail?count=N → fail the next N sends · POST /__reset
import http from "node:http";

const port = Number(process.env.MOCK_EMAIL_PORT ?? 4010);
const received = [];
let failNext = 0;

http
  .createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (req.method === "GET" && req.url === "/__messages") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(received));
      }
      if (req.method === "POST" && req.url.startsWith("/__fail")) {
        failNext = Number(new URL(req.url, "http://x").searchParams.get("count") ?? "1");
        return res.end("ok");
      }
      if (req.method === "POST" && req.url === "/__reset") {
        received.length = 0;
        failNext = 0;
        return res.end("ok");
      }
      if (req.method === "GET" && req.url === "/") return res.end("mock email server");
      if (failNext > 0) {
        failNext--;
        res.writeHead(503, { "content-type": "application/json" });
        return res.end(JSON.stringify({ message: "Simulated provider outage" }));
      }
      let body = {};
      try {
        body = JSON.parse(data);
      } catch {}
      received.push({ path: req.url, auth: req.headers.authorization, body, at: new Date().toISOString() });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: `mock_${received.length}` }));
    });
  })
  .listen(port, "127.0.0.1", () => console.log(`mock email server on ${port}`));
