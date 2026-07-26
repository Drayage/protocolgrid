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
  assert.match(html, /AI vs AI 분석/);
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
  assert.match(page, /const viewerSide = spectatorMode \? actorSide : aiSide \? otherSide\(aiSide\) : actorSide/);
  assert.match(page, /const allowLastKnown = spectatorMode \? false : !aiSide \|\| actorSide === viewerSide/);
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

test("AI versus AI spectator mode auto-prepares both teams and records tactical analysis", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /type PlayMode = "hotseat" \| "vs-ai" \| "ai-vs-ai"/);
  assert.match(page, /AI vs AI 관전/);
  assert.match(page, /function prepareAiVsAiRound/);
  assert.match(page, /sides=\{controlledAiSides\}/);
  assert.match(page, /paused=\{spectatorMode && spectatorPaused\}/);
  assert.match(page, /한 단계/);
  assert.match(page, /if \(props\.game\.winner && !scene\) return/);
  assert.match(page, /!scene\.canMoverAttack[\s\S]{0,220}props\.onCombatRetreat/);
  assert.match(page, /interface GameAnalytics/);
  assert.match(page, /function recordShot/);
  assert.match(page, /실시간 전술 분석/);
  assert.match(page, /실제 교전·행동 데이터 기준/);
  assert.match(page, /스파이크 최종 해체 완료/);
  assert.match(css, /\.spectator-controls/);
  assert.match(css, /\.match-analysis/);
  assert.match(css, /\.spectator-victory/);
});

test("AI spends extra actions on agent skills and records every autonomous use", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function tryUseAiSkill\(game: GameState, side: Side\)/);
  assert.match(page, /if \(tryUseAiSkill\(draft, side\)\) return/);
  assert.match(page, /function aiEnemyIntel/);
  assert.match(page, /function aiSmokeEdge/);
  assert.match(page, /game\.analytics\[agent\.team\]\.skillsUsed \+= 1/);
  assert.match(page, /스파이캠으로 \$\{cameraTarget\.name\} 탐지/);
  assert.match(page, /const skillReserve = Math\.min/);
  assert.match(page, /const skillRounds =/);
  for (const skillId of ["tailwind", "updraft", "gear", "paint", "blast", "curve", "hot", "relay", "flash", "aftershock", "trip", "turret", "camera", "alarm", "recon", "shock", "smoke", "dark", "stim", "shadow"]) {
    assert.match(page, new RegExp(`definition\\.id === "${skillId}"`), `${skillId} needs an AI decision branch`);
  }
});

test("defense AI holds the site perimeter, spreads cards, and retreats when heavily outnumbered", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const DEFENSE_OPERATING_REGIONS = new Set/);
  assert.match(page, /function aiDefenseDestination/);
  assert.match(page, /safeTargets = targets\.filter\(\(region\) => DEFENSE_OPERATING_REGIONS\.has\(region\)\)/);
  assert.match(page, /const cardsUsedByAgent = \(agent: Agent\)/);
  assert.match(page, /\.sort\(\(a, b\) => cardsUsedByAgent\(a\) - cardsUsedByAgent\(b\)\)/);
  assert.match(page, /function shouldAiRetreat/);
  assert.match(page, /nearbyEnemies >= nearbyAllies \+ 2/);
  assert.match(page, /defenseOverextended \|\| heavilyOutnumbered/);
  assert.match(page, /function aiRetreatDestination/);
});

test("trade bonuses can be created and consumed by either side of a continuing encounter", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /holderAimBonus: number/);
  assert.match(page, /trade\.enemyId === mover\.id && trade\.team === enemy\.team/);
  assert.match(page, /holderTradePriority/);
  assert.match(page, /scene\.holderAimBonus/);
  assert.match(page, /if \(attacker\) \{\s*addTrade\(game, \{ enemyId: attacker\.id, team: defender\.team/);
  assert.doesNotMatch(page, /defender\.team === game\.turnSide/);
  assert.match(page, /TRADE · AIM \+1 · 우선도 향상/);
  assert.match(css, /\.trade-ribbon/);
});

test("sniper waits target exact range-two regions and respect every smoke edge", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function waitTargetsFor\(agent: Agent\)/);
  assert.match(page, /WEAPONS\[agent\.weapon\]\.type === "sniper" \? 2 : 1/);
  assert.match(page, /enemy\.waitDirs\.includes\(mover\.region\)/);
  assert.match(page, /function isWaitPathSmokeBlocked/);
  assert.match(page, /path\.slice\(0, -1\)\.some/);
  assert.match(page, /저격 대기 구역 선택 · 거리 1~2/);
  assert.doesNotMatch(page, /enemy\.waitDirs\.includes\(path\[1\]\)/);
});

test("turret attacks use the combat scene and weapon cards explain every modifier", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /kind: "agent" \| "turret"/);
  assert.match(page, /function queueTurretEncounter/);
  assert.match(page, /const performTurretShot/);
  assert.match(page, /포탑 우선도 2 · 자동 1회 공격/);
  assert.match(page, /에임 D5와 대상 무빙 주사위를 굴립니다/);
  assert.match(page, /function weaponRuleSummary/);
  assert.match(page, /상시 에임 \+\$\{weapon\.aim\}/);
  assert.match(page, /상시 무빙 \+\$\{weapon\.move\}/);
  assert.match(page, /대기 사격 에임 \+1/);
  assert.match(page, /거리 0 에임 \+2 · 피해 \+1/);
  assert.match(css, /\.turret-avatar, \.turret-portrait/);
  assert.match(css, /\.weapon-rule-copy/);
});
