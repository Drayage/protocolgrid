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

test("distance-one sight is optional while same-region and new-entry waits stay mandatory", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /const sameRegionEnemies =/);
  assert.match(page, /const watchers = source === "turn-start" \? \[\] : watchersFor\(game, agent\)/);
  assert.match(page, /mandatoryEnemy\.region === agent\.region && mandatoryEnemy\.waitDirs\.length > 0/);
  assert.match(page, /const optionalEnemies =/);
  assert.match(page, /path\.length !== 2/);
  assert.match(page, /game\.pendingContact =/);
  assert.match(page, /카드 소모 없이 교전 여부를 선택하세요/);
  assert.match(page, /!revealedWaitDirs\.includes\(mover\.region\)/);
  assert.match(page, /!enemy\.waitDirs\.includes\(pendingContactAgent\.region\)/);
  assert.match(page, /const surprisePriority = offAngle \? 1 : 0/);
  assert.match(page, /moverTradePriority - surprisePriority/);
  assert.match(page, /\(waiting \? 1 : 3\)/);
  assert.match(page, /기습 우선도/);
  assert.match(page, /양쪽 보너스 없음/);
  assert.match(page, /다른 방향 대기 · 일반 대응/);
  assert.match(page, /같은 구역에서는 대기 방향과 무관하게 대기 우선도 1/);
  assert.match(css, /\.combat-location \.off-angle-tag/);
  assert.match(css, /\.ambush-ribbon/);
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
  assert.match(page, /function aiSkillPriority/);
  assert.match(page, /const attackBreach =/);
  assert.match(page, /const attackPostplant =/);
  assert.match(page, /const defenseHold =/);
  assert.match(page, /const defenseRetake =/);
  assert.match(page, /side === "attack" && \["planting", "planted", "half", "defusing"\]\.includes\(game\.spike\.status\)/);
  assert.match(page, /definition\.id === "turret" && attackPlanPhase\(game\) !== "execute"/);
  assert.match(page, /definition\.id === "alarm" && attackPlanPhase\(game\) !== "execute"/);
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
  assert.match(page, /safeTargets = guardingDroppedSpike \|\| flanking \? targets : targets\.filter\(\(region\) => DEFENSE_OPERATING_REGIONS\.has\(region\)\)/);
  assert.match(page, /const cardsUsedByAgent = \(agent: Agent\)/);
  assert.match(page, /cardsUsedByAgent\(a\) \* 20 \+ rotationRank\(a\)/);
  assert.match(page, /function shouldAiRetreat/);
  assert.match(page, /nearbyEnemies >= nearbyAllies \+ 2/);
  assert.match(page, /defenseOverextended \|\| heavilyOutnumbered/);
  assert.match(page, /function aiRetreatDestination/);
});

test("defense AI deploys stack, balanced, mid-control, and weighted formations with role-based responses", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  for (const plan of ["stack-a", "stack-b", "balanced-212", "mid-131", "heavy-a-401", "heavy-b-401", "heavy-a-311", "heavy-b-311"]) {
    assert.match(page, new RegExp(`kind: "${plan}"`), `${plan} needs a defense plan`);
  }
  assert.match(page, /function createDefensePlan/);
  assert.match(page, /function defenseAssignedLane/);
  assert.match(page, /function defenseThreatSite/);
  assert.match(page, /function defenseShouldFlank/);
  assert.match(page, /function defensePlanWaypoints/);
  assert.match(page, /function updateDefensePlanReadout/);
  assert.match(page, /스택 유지 · 설치 후 집단 재진입/);
  assert.match(page, /Math\.floor\(laneAgents\.length \/ 2\)/);
  assert.match(page, /\.\.\.Array\(game\.defensePlan\.distribution\.A\)\.fill\(10\)/);
  assert.match(page, /className="analysis-plan defense-plan"/);
  assert.match(css, /\.analysis-plan\.defense-plan/);
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

test("attack AI rotates through direct, mid, fake, and adaptive split plans before committing", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  for (const plan of ["direct-a", "direct-b", "mid-a", "mid-b", "fake-a-b", "fake-b-a", "split-read"]) {
    assert.match(page, new RegExp(`kind: "${plan}"`), `${plan} needs an attack plan template`);
  }
  assert.match(page, /function createAttackPlan/);
  assert.match(page, /timingOffset = timingRoll - 1/);
  assert.match(page, /type AttackTempo = "fast" \| "standard" \| "slow"/);
  assert.match(page, /function attackTempoLabel/);
  assert.match(page, /type AttackFormation = "five" \| "four-one"/);
  assert.match(page, /mainMidCount: formation === "five" \? 0 : 4 - mainSiteCount/);
  assert.match(page, /function attackFormationLabel/);
  assert.match(page, /function updateAttackLurkerPlan/);
  assert.match(page, /function attackLurkerWaypoints/);
  assert.match(page, /lurkerMode = "rotate-call"/);
  assert.match(page, /lurkerMode = "deep-flank"/);
  assert.match(page, /본대 전환 콜/);
  assert.match(page, /수비 후방 깊은 우회/);
  assert.match(page, /strategicBias/);
  assert.match(page, /function attackPlanWaypoints/);
  assert.match(page, /game\.cycle < game\.attackPlan\.commitCycle - 2 \? "pressure" : "rotate"/);
  assert.match(page, /game\.attackPlan\.adapted && targetSite === "B" \? \[5, 17\] : \[2, 12\]/);
  assert.match(page, /game\.attackPlan\.adapted && targetSite === "A" \? \[5, 12\] : \[4, 17\]/);
  assert.match(page, /targetSite === "B" \? \[5, 17\] : \[2, 12\]/);
  assert.match(page, /targetSite === "A" \? \[5, 12\] : \[4, 17\]/);
  assert.match(page, /function attackPlanRushDestination/);
  assert.match(page, /game\.attackPlan\.kind === "direct-b" \|\| game\.attackPlan\.kind === "fake-b-a"[\s\S]{0,80}\? 4[\s\S]{0,40}: 5/);
  assert.match(page, /if \(game\.cycle !== 1\) return null/);
  assert.match(page, /function adaptAttackPlan/);
  assert.match(page, /const readCycle = Math\.max\(3, plan\.commitCycle - 2\)/);
  assert.match(page, /!intel\.length && game\.cycle < plan\.commitCycle - 1/);
  assert.match(page, /aPresence < bPresence \? "A" : "B"/);
  assert.match(page, /관측 수비 A \$\{aPresence\} · B \$\{bPresence\}/);
  assert.match(page, /function aiAttackDestination/);
  assert.match(page, /return !REGIONS\.find\(\(item\) => item\.id === region\)\?\.site/);
  assert.match(page, /routeDistance\(destination\) > routeDistance\(agent\.region\)/);
  assert.match(page, /game\.cycle >= 12 \|\| game\.cycle >= game\.attackPlan\.commitCycle/);
  assert.match(page, /const attackWaypoints = agent\.team === "attack" \? attackPlanWaypoints/);
  assert.match(page, /attackExecuting[\s\S]{0,220}\{ entry: 0, peek: 1/);
  assert.match(page, /공격 AI 작전 브리핑/);
  assert.match(page, /작전 선택 · \$\{game\.attackPlan\.label\}/);
  assert.match(page, /className="analysis-plan"/);
  assert.match(css, /\.analysis-plan/);
});

test("AI protects spike transport, recovers drops, and converts defense to spike denial", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function selectSpikeCarrierId/);
  assert.match(page, /agent\.name !== plan\.lurkerName/);
  assert.match(page, /roleOrder: Record<Role, number> = \{ controller: 0, initiator: 1, sentinel: 2, duelist: 3 \}/);
  assert.match(page, /game\.spike\.carrierId === agent\.id\) return attackCoreWaypoints/);
  assert.match(page, /function attackCarrierEscortAgents/);
  assert.match(page, /function aiSpikeEscortDestination/);
  assert.match(page, /const escortDestination = side === "attack" \? aiSpikeEscortDestination/);
  assert.match(page, /side === "attack" && draft\.spike\.status === "dropped"/);
  assert.match(page, /-40 \+ distance\(agent\.region, draft\.spike\.region\) \* 5/);
  assert.match(page, /draft\.spike\.status !== "dropped" && draft\.cycle <= 2/);
  assert.match(page, /spikeKnownByDefense: boolean/);
  assert.match(page, /스파이크 확보 · 인접 구역 교차 대기 · 공격팀 회수 차단/);
  assert.match(page, /a === game\.spike\.region \? -20 : 0/);
  assert.match(page, /guardingDroppedSpike/);
});

test("AI remembers visible weapon drops and prioritizes upgrades for classic users", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /interface DroppedWeapon/);
  assert.match(page, /knownBy: Side\[\]/);
  assert.match(page, /function rememberObservedDroppedWeapons/);
  assert.match(page, /function aiWeaponPickupObjective/);
  assert.match(page, /ally\.weapon === "classic" \? 24 : 0/);
  assert.match(page, /function aiPickupWeaponAtCurrentRegion/);
  assert.match(page, /if \(aiPickupWeaponAtCurrentRegion\(draft, side\)\) return/);
  assert.match(page, /const weaponDestination = aiWeaponDestination/);
  assert.match(page, /className="weapon-drop"/);
  assert.match(css, /\.effect-stack i\.weapon-drop/);
});

test("attackers configure opening waits at spawn before the first defense turn", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /"setup_attack_wait"/);
  assert.match(page, /function AttackWaitSetupScreen/);
  assert.match(page, /공격팀 본진 대기 설정/);
  assert.match(page, /agent\.region !== 1/);
  assert.match(page, /waitTargetsFor\(agent\)\.includes\(region\)/);
  assert.match(page, /function autoSetAttackOpeningWaits/);
  assert.match(page, /\[12, 17, 6, 2, 4, 5\] : \[2, 4, 5\]/);
  assert.match(page, /autoSetAttackOpeningWaits\(draft\)/);
  assert.match(page, /수비팀 첫 턴 시작/);
  assert.match(css, /\.opening-wait-line/);
  assert.match(css, /\.opening-wait-screen/);
});

test("sniper waits target exact range-two regions and respect every smoke edge", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function waitTargetsFor\(agent: Agent\)/);
  assert.match(page, /WEAPONS\[agent\.weapon\]\.type === "sniper" \? 2 : 1/);
  assert.match(page, /function queueWaitClaimEncounter/);
  assert.match(page, /scene\.retreatLockedIds = \[agent\.id\]/);
  assert.match(page, /scene\.waitClaim = \{ actorId: agent\.id, region, originRegion \}/);
  assert.match(page, /startWaitAttempt\(draft, agent, region\)/);
  assert.match(page, /enemy\.waitDirs\.includes\(mover\.region\)/);
  assert.match(page, /function isWaitPathSmokeBlocked/);
  assert.match(page, /path\.slice\(0, -1\)\.some/);
  assert.match(page, /저격 대기 구역 선택 · 거리 1~2/);
  assert.doesNotMatch(page, /enemy\.waitDirs\.includes\(path\[1\]\)/);
});

test("same-priority retreat gains temporary movement and wait claimants cannot retreat", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /moverChoice\.type === "retreat" \? 2 : 0/);
  assert.match(page, /holderChoice\.type === "retreat" \? 2 : 0/);
  assert.match(page, /scene\.moverMoveBonus \+ moverRetreatMoveBonus/);
  assert.match(page, /scene\.retreatLockedIds\.includes\(actor\.id\)/);
  assert.match(page, /대기 확보 교전 · 시도자 후퇴 불가/);
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
