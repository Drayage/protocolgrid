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
  const [page, css, spriteAtlas] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/protocol-sprite-atlas.png", import.meta.url)),
  ]);

  assert.match(page, /pendingMovement: PendingMovement \| null/);
  assert.match(page, /continuePendingMovement\(draft\)/);
  assert.match(page, /pendingReengagements\.push/);
  assert.match(page, /priority:\s*5/);
  assert.match(page, /phase: "encounter" \| "choice" \| "result" \| "tailwind"/);
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
  assert.match(page, /combat-turn-banner/);
  assert.match(page, /현재 전장 현황/);
  assert.match(page, /이번 팀 턴에 확인된 정보가 계속 표시됩니다/);
  assert.match(page, /setupBulkBuyWeapon/);
  assert.match(page, /setupBulkBuyArmor/);
  assert.match(page, /setupBuyAllSkills/);
  assert.match(page, /function observedRegions/);
  assert.match(page, /lastKnown \? "last-known"/);
  assert.match(page, /draft\.revealedEnemyIds = \[\]/);
  assert.match(page, /enemyMemories: EnemyMemory\[\]/);
  assert.match(page, /function rememberEnemy\([\s\S]*game\.revealedEnemyIds\.push\(enemy\.id\)/);
  assert.doesNotMatch(page, /function rememberEnemy\([\s\S]{0,700}\bmover\.team/);
  assert.match(page, /currentlyKnown && isChanneling\(game, agent\)/);
  assert.doesNotMatch(page, /\bisProgressing\(/);
  assert.match(page, /rememberEnemy\(draft, draft\.turnSide, enemyToRemember\)/);
  assert.match(page, /memory\?\.waitDirs \?\? agent\.waitDirs/);
  assert.match(page, /draft\.enemyMemories = \[\]/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@keyframes tracerShot/);
  assert.match(css, /\.combat-intel-grid/);
  assert.match(css, /\.unit-token\.hostile\.last-known/);
  assert.match(css, /protocol-sprite-atlas\.png/);
  assert.match(css, /background-size: var\(--sprite-size-x\) var\(--sprite-size-y\)/);
  assert.doesNotMatch(css, /background-size: 500% 600%/);
  assert.match(css, /grid-template-columns: 20px 55px minmax\(0, 1fr\) auto/);
  assert.match(page, /agentArtClass/);
  assert.match(page, /skillArtClass/);
  assert.match(page, /function waitConeViews/);
  assert.match(page, /교전 중 전장 현황/);
  assert.match(page, /ENEMY CONTACT/);
  assert.match(page, /lastSkillFx: SkillFx \| null/);
  assert.match(page, /enemy\.region === region \|\| enemy\.waitDirs\.includes\(region\)/);
  assert.match(page, /weapon\.price - WEAPONS\[agent\.weapon\]\.price/);
  assert.match(page, /pendingContact: PendingContact \| null/);
  assert.match(page, /VISUAL CONTACT \/\/ 거리 1/);
  assert.match(page, /queueNextTurnStartContact/);
  assert.match(page, /game\.targeting\.origin !== undefined/);
  assert.match(page, /state\.origin === undefined/);
  assert.match(css, /\.wait-cone/);
  assert.match(css, /\.combat-mini-map/);
  assert.match(css, /\.map-coordinate-layer/);
  assert.match(css, /width: min\(100cqw, 100cqh\)/);
  assert.match(css, /\.map-board:has\(\.targeting-banner\) \.map-coordinate-layer/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /@keyframes skillProjectile/);
  assert.ok(spriteAtlas.byteLength > 100_000);
});

test("distance-one sight is optional while same-region and waiting contacts stay mandatory", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const sameRegionEnemies =/);
  assert.match(page, /mandatoryEnemy\.region === agent\.region && mandatoryEnemy\.waitDirs\.length > 0/);
  assert.match(page, /const optionalEnemies =/);
  assert.match(page, /path\.length !== 2/);
  assert.match(page, /game\.pendingContact =/);
  assert.match(page, /카드 소모 없이 교전 여부를 선택하세요/);
});

test("AI turns keep the human viewer perspective and hide stale enemy intel", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /interface VisibilityContext/);
  assert.match(page, /const viewerSide = aiSide \? otherSide\(aiSide\) : actorSide/);
  assert.match(page, /const allowLastKnown = !aiSide \|\| actorSide === viewerSide/);
  assert.match(page, /function observedRegions\(game: GameState, observer: Side\)/);
  assert.match(page, /if \(!context\.allowLastKnown\) return visible/);
  assert.match(page, /const viewerTeam = game\.teams\[viewerSide\]/);
  assert.match(page, /const viewerLog = useMemo/);
  assert.match(page, /hiddenAgentNames\.some\(\(name\) => entry\.includes\(name\)\)/);
  assert.match(page, /상대 작전 진행 중/);
  assert.match(page, /game\.lastSkillFx\.owner === viewerSide \|\| observed\.has\(game\.lastSkillFx\.targetRegion\)/);
  assert.match(css, /combat-modal > \.combat-actions, \.combat-modal > \.combat-continue \{ order: 5/);
  assert.match(css, /combat-modal > \.combat-map-overview \{ order: 8/);
  assert.match(page, /combatTurnRef\.current/);
  assert.match(page, /target\?\.scrollIntoView/);
});
