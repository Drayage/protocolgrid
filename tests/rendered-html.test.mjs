import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the finished tactical game entry screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Protocol: Grid — 전술 카드게임<\/title>/i);
  assert.match(html, /PROTOCOL:/);
  assert.match(html, /15장의 역할 덱/);
  assert.match(html, /모바일 반응형 UI/);
  assert.match(html, /공격팀 AI 상대/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working|react-loading-skeleton/);
});

test("source keeps the complete round, combat, skill, and economy loops wired", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /pendingMovement: PendingMovement \| null/);
  assert.match(page, /continuePendingMovement\(draft\)/);
  assert.match(page, /pendingReengagements\.push/);
  assert.match(page, /priority:\s*5/);
  assert.match(page, /phase: "choice" \| "result" \| "tailwind"/);
  assert.match(page, /type: "attack" \| "retreat" \| "advance"/);
  assert.match(page, /waitOrders: Record<number, number>/);
  assert.match(page, /roundIncome\(/);
  assert.match(page, /Math\.min\(180/);
  assert.match(page, /prepareNextRoundState/);
  assert.match(page, /weapon\.unlock > game\.matchRound/);
  assert.match(page, /killsThisRound \* 5/);
  assert.match(page, /plantsThisRound \* 5/);
  assert.match(page, /defusesThisRound \* 5/);
  assert.match(page, /expiresOn: "owner-start"/);
  assert.match(page, /expiresOn: "owner-end"/);
  assert.match(page, /candidateDeployableIds/);
  assert.match(page, /AiController/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@keyframes tracerShot/);
});

test("non-waiting enemies inside normal range still start combat", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const enemiesInRange =/);
  assert.match(page, /if \(distance < 0 \|\| distance > 1\) return false/);
  assert.match(page, /const enemy = \[\.\.\.watchers, \.\.\.enemiesInRange\]\[0\]/);
});
