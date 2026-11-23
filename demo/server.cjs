const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { GlobalTradeFinanceEngine, AppendOnlyPaymentAuditLedger } = require("../dist/index.js");

const PORT = Number(process.env.PORT || 3000);
const ledger = new AppendOnlyPaymentAuditLedger();

// Seed one realistic synthetic audit event so the demo opens with an active trail
ledger.append({
  eventId: "EVT-SEED-001",
  operationRef: "IMP-2026-EE-089",
  installmentNumber: 2,
  type: "PAY_NOW_ACTIVATED",
  actor: "treasury.desk@nordictrade.example",
  occurredAt: "2026-11-18T14:20:00.000Z",
  reason: "Favorable USD/BRL PTAX window detected (-1.8% vs weekly avg)",
});

const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.method === "POST" && req.url === "/api/simulate") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { input, basePtaxRate } = JSON.parse(body);
        const result = GlobalTradeFinanceEngine.analyzeOperation(input, Number(basePtaxRate));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/audit") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const {
          action,
          operationRef,
          installmentNumber,
          actor,
          reason,
          dueDateIso,
          referenceDateIso,
          hasShippingDocuments,
        } = JSON.parse(body);

        if (action) {
          ledger.append({
            eventId: "EVT-" + Date.now(),
            operationRef,
            installmentNumber: Number(installmentNumber),
            type: action,
            actor: actor || "treasury.desk@nordictrade.example",
            occurredAt: new Date().toISOString(),
            reason: reason || "Triggered via interactive web console",
          });
        }

        const status = ledger.projectStatus(
          operationRef,
          Number(installmentNumber),
          dueDateIso,
          referenceDateIso,
          Boolean(hasShippingDocuments)
        );
        const history = ledger.getHistory(operationRef, Number(installmentNumber));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status, history }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\nGlobalTrade FX Risk Simulator Demo running at http://127.0.0.1:${PORT}\n`);
});
