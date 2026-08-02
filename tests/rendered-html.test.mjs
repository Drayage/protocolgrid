import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function builtHtml() {
  return readFile(new URL("../dist/index.html", import.meta.url), "utf8");
}

test("static Pages build renders the finished tactical game entry screen", async () => {
  const html = `${await builtHtml()}\n${await readFile(new URL("../app/page.tsx", import.meta.url), "utf8")}`;
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
  assert.match(css, /--sprite-atlas-image/);
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
  assert.match(page, /function buyPhaseWeaponDifference/);
  assert.match(page, /buyBaselineWeapon: WeaponId/);
  assert.match(page, /보존 총기 판매 불가/);
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
  assert.match(page, /거리 0 자동 교전에서는 공격 가능한 양쪽 요원이 첫 공격을 마쳐야 이탈할 수 있습니다/);
  assert.match(css, /\.combat-location \.off-angle-tag/);
  assert.match(css, /\.combat-modifier-strip \.modifier-ambush/);
});

test("AI turns keep the human viewer perspective and hide stale enemy intel", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /interface VisibilityContext/);
  assert.match(page, /const viewerSide = spectatorMode \? actorSide : playMode === "vs-ai" \? humanSide : actorSide/);
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
  assert.match(page, /combatScrollFrameRef\.current = window\.requestAnimationFrame\(animate\)/);
});

test("human versus AI supports either side and mirrors setup after a side swap", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /const \[humanSide, setHumanSide\] = useState<Side>\("defense"\)/);
  assert.match(page, /const aiSide: Side \| null = playMode === "vs-ai" \? otherSide\(humanSide\) : null/);
  assert.match(page, /내 진영 선택/);
  assert.match(page, /공격팀 플레이/);
  assert.match(page, /수비팀 플레이/);
  assert.match(page, /function prepareAiDefenseForHumanAttack/);
  assert.match(page, /else if \(aiSide === "defense"\) prepareAiDefenseForHumanAttack\(next\)/);
  assert.match(page, /aiSide === "defense" \? "buy_attack" : "buy_defense"/);
  assert.match(page, /const nextHumanSide = playMode === "vs-ai" && swapSides \? otherSide\(humanSide\) : humanSide/);
  assert.match(page, /else if \(nextAiSide === "defense"\) prepareAiDefenseForHumanAttack\(draft\)/);
  assert.match(page, /humanSide=\{humanSide\} onHumanSide=\{setHumanSide\}/);
  assert.match(css, /\.human-side-picker/);
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
  assert.match(page, /const skillReserve = baselinePriority/);
  assert.match(page, /Math\.min\(team\.funds, game\.matchRound === 1 \? 3/);
  assert.match(page, /const skillRounds =/);
  for (const skillId of ["tailwind", "updraft", "gear", "paint", "blast", "curve", "hot", "relay", "flash", "aftershock", "trip", "turret", "camera", "alarm", "recon", "shock", "smoke", "dark", "stim", "shadow"]) {
    assert.match(page, new RegExp(`definition\\.id === "${skillId}"`), `${skillId} needs an AI decision branch`);
  }
});

test("extra actions belong to one card while AI weighs immediate objectives, setup utility, and known holds", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function clearTeamExtraActions\(game: GameState, side: Side\)/);
  assert.match(page, /function commitCardForPreAction\(game: GameState, card: ActionCard, agent: Agent\)/);
  assert.doesNotMatch(page, /extraActions \+= 1/);
  assert.match(page, /clearTeamExtraActions\(game, agent\.team\)[\s\S]{0,120}agent\.extraActions = 1/);
  assert.match(page, /clearTeamExtraActions\(draft, endingSide\)/);
  assert.match(page, /function aiPreCardActionPlan/);
  assert.match(page, /function aiShouldReserveCardExtraForDestination/);
  assert.match(page, /kind: "weapon"/);
  assert.match(page, /kind: "spike"/);
  assert.match(page, /tryUseAiSkill\(simulation, side\)/);
  assert.match(page, /tryPrepareAiPreCardAction\(draft, side\)/);
  assert.match(page, /const resolvingCommittedAiCard/);
  assert.match(page, /committedAiCard \? \[committedAiCard\]/);
  assert.match(page, /function aiKnownWaitEntryAssessment/);
  assert.match(page, /function aiMovementDestinationAcceptable/);
  assert.match(page, /const retreatEntry = aiKnownWaitEntryAssessment\(game, actor, retreatRegion, true\)/);
  assert.match(page, /retreatDestinationIsViable/);
  assert.match(page, /현재 카드 추가행동/);
  assert.match(page, /다음 카드나 턴으로 이월되지 않습니다/);
});

test("Phoenix holds healing fire while Omen teleports only into a covered empty angle", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function aiPhoenixShouldHoldOwnFire/);
  assert.match(page, /agent\.hp < AGENT_MAX_HP/);
  assert.match(page, /holdingOwnFireForHealing = aiPhoenixShouldHoldOwnFire/);
  assert.match(page, /!holdingPlantSite && !holdingOwnFireForHealing/);
  assert.match(page, /const canHoldForHealing = agent\.hp < AGENT_MAX_HP && !aiRetreatReentryIsUrgent/);
  assert.match(page, /function aiShadowStepDestination/);
  assert.match(page, /const exposedEnemies = exactIntel\.filter/);
  assert.match(page, /const activeHolds = exactIntel\.filter/);
  assert.match(page, /if \(occupied \|\| exposedEnemies\.length \|\| activeHolds\.length\) return null/);
  assert.match(page, /progress \* 6 \+ smokeCover \* 5 \+ support \* 2/);
  assert.match(page, /const destination = aiShadowStepDestination\(game, agent, objective, intel\)/);
  assert.doesNotMatch(page, /const enemyA = exactIntel\.some\(\(item\) => item\.region === a\) \? -4 : 0/);
});

test("AI compares real combat odds and lets an isolated shotgun close distance through retreat", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /let killOutcomes = 0/);
  assert.match(page, /killChance: percentage\(killOutcomes\)/);
  assert.match(page, /function aiCombatOdds/);
  assert.match(page, /function calculateShotOutcomeProbabilities/);
  assert.match(page, /function aiCombatDuelOdds/);
  assert.match(page, /exchange < 64/);
  assert.match(page, /if \(actorDurability <= 0 && opponentDurability <= 0\) mutualDeath \+= probability/);
  assert.match(page, /const duelOdds = aiCombatDuelOdds/);
  assert.match(page, /const combatWinChance = duelOdds\.opponentFirstDeath \+ duelOdds\.mutualDeath \* \.5/);
  assert.match(page, /const combatLossChance = duelOdds\.actorFirstDeath \+ duelOdds\.mutualDeath \* \.5/);
  assert.match(page, /function aiShotgunApproachRegion/);
  assert.match(page, /WEAPONS\[actor\.weapon\]\.type !== "shotgun" \|\| scene\.range !== 1/);
  assert.match(page, /nearbyExactEnemies\.length !== 1/);
  assert.match(page, /const retreatAimDelta = actor\.status\.aimPenalty > 0 \? 0 : -1/);
  assert.match(page, /const retreatMoveDelta = Math\.min\(-1, actor\.status\.moveBonus\) - actor\.status\.moveBonus/);
  assert.match(page, /const closeSurvival = Math\.max\(0, 100 - closeReturnFire\.killChance\)/);
  assert.match(page, /closeValue >= currentValue \+ 8 \? opponent\.region : null/);
  assert.match(page, /const retreatOpportunityCost = 32/);
  assert.match(page, /attackOdds\.killChance >= 35 \? 12 : 0/);
  assert.match(page, /scene\.round > 1 \? 10 : 0/);
  assert.match(page, /function aiCombatObjectiveMustBeBroken/);
  assert.match(page, /function aiCombatTradeFollowup/);
  assert.match(page, /function aiAllyCanDisruptCombatHold/);
  assert.match(page, /function aiShortCombatFlankPlan/);
  assert.match(page, /const strongerTradeExit = retreatPlan\.tradeFollowup\.stronger/);
  assert.match(page, /const tradeRelayRetreat = strongerTradeExit/);
  assert.match(page, /const decisiveMismatch = combatLossChance >= combatWinChance \+ 18[\s\S]{0,100}dangerValue \+ operatorRetreatBias >= attackValue \+ retreatOpportunityCost/);
  assert.doesNotMatch(page, /combatDuelPreview/);
  assert.match(page, /const positionalRetreat = shouldAiRetreat/);
  assert.match(page, /returnFire\.killChance >= 35[\s\S]{0,160}combatWinChance < 42/);
  assert.match(page, /const decision = aiCombatDecision\(props\.game, scene, actor, retreatOptions\)/);
});

test("defense AI holds the site perimeter, spreads cards, and retreats when heavily outnumbered", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const DEFENSE_OPERATING_REGIONS = new Set/);
  assert.match(page, /function aiDefenseDestination/);
  assert.match(page, /safeTargets = guardingDroppedSpike \|\| flanking \|\| urgentRetake \? targets : targets\.filter\(\(region\) => DEFENSE_OPERATING_REGIONS\.has\(region\)\)/);
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
  assert.match(page, /function defenseThreatStrength/);
  assert.match(page, /function updateDefensePlanReadout/);
  assert.match(page, /1명 앵커 유지 · 본대 보강과 1명 후방 우회/);
  assert.match(page, /game\.cycle >= 3/);
  assert.match(page, /laneIndex === laneAgents\.length - 1/);
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
  assert.match(page, /moverTradePriority = 2/);
  assert.match(page, /holderTradePriority = 2/);
  assert.match(page, /scene\.holderAimBonus/);
  assert.match(page, /if \(attacker\) \{\s*addTrade\(game, \{ enemyId: attacker\.id, team: defender\.team/);
  assert.doesNotMatch(page, /defender\.team === game\.turnSide/);
  assert.match(page, /<b>TRADE<\/b><em>PRIO -\{tradePriorityBonus\}/);
  assert.match(page, /moverTradePriorityBonus: moverTradePriority/);
  assert.match(page, /function clearTradeTargetOnMovement/);
  assert.match(page, /game\.trade = game\.trade\.filter\(\(trade\) => trade\.enemyId !== agent\.id\)/);
  assert.match(page, /clearTradeTargetOnMovement\(game, agent, from, agent\.region\)/);
  assert.match(page, /clearTradeTargetOnMovement\(draft, agent, from, region\)/);
  assert.match(css, /\.combat-modifier-strip \.modifier-trade/);
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
  assert.match(page, /function attackSiteSituation/);
  assert.match(page, /const occupiedSite =/);
  assert.match(page, /alternativeDanger \+ 5 < currentDanger/);
  assert.match(page, /현장 재판독 A \$\{aPresence\}\/위험/);
  assert.match(page, /function aiAttackDestination/);
  assert.match(page, /return site === game\.attackPlan\.targetSite && game\.cycle >= 2 && attackEntryIsOpen\(game, site\)/);
  assert.match(page, /knownThreatScoreAtRegion\(game, "attack", a\)/);
  assert.match(page, /routeDistance\(destination\) > routeDistance\(agent\.region\)/);
  assert.match(page, /const FORCED_EXECUTE_CYCLE = PRE_PLANT_CYCLE_LIMIT - 2/);
  assert.match(page, /game\.cycle >= FORCED_EXECUTE_CYCLE \|\| game\.cycle >= game\.attackPlan\.commitCycle/);
  assert.match(page, /kind: "direct-a"[\s\S]{0,100}commitCycle: 3/);
  assert.match(page, /kind: "mid-b"[\s\S]{0,100}commitCycle: 5/);
  assert.match(page, /kind: "fake-a-b"[\s\S]{0,100}commitCycle: 6/);
  assert.match(page, /Math\.max\(2, Math\.min\(FORCED_EXECUTE_CYCLE - 2/);
  assert.match(page, /const waypoints = attackPlanWaypoints\(game, agent\)/);
  assert.match(page, /attackExecuting[\s\S]{0,220}\{ entry: 0, peek: 1/);
  assert.match(page, /공격 AI 작전 브리핑/);
  assert.match(page, /작전 선택 · \$\{game\.attackPlan\.label\}/);
  assert.match(page, /className="analysis-plan"/);
  assert.match(css, /\.analysis-plan/);
});

test("mid-round AI replans, plants secured sites, and uses utility for entry and retake lanes", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const SITE_REGIONS:/);
  assert.match(page, /const ATTACK_ENTRY_EDGES:/);
  assert.match(page, /const DEFENDER_BACK_EDGES:/);
  assert.match(page, /function aiPlantAssessment/);
  assert.match(page, /plantAssessment\?\.shouldPlant/);
  assert.match(page, /사이트 설치 판단 · 주변 아군/);
  assert.match(page, /const sameRegionThreats = visibleThreats\.filter/);
  assert.match(page, /bodyguards\.length >= visibleThreats\.length/);
  assert.match(page, /const forced = attackForcedPlantMode\(game\)/);
  assert.match(page, /const plantingReserveCarrierId =/);
  assert.match(page, /const reservedPlantCarrierId =/);
  assert.match(page, /function aiEntryUtilityRegion/);
  assert.match(page, /entryRegion = aiEntryUtilityRegion\(game, agent, currentAndAdjacent\)/);
  assert.match(page, /definition\.id === "flash" \? aiEntryUtilityRegion/);
  assert.match(page, /edgeMatches\(edge, DEFENDER_BACK_EDGES\[targetSite\]\)/);
  assert.match(page, /edgeMatches\(edge, ATTACK_ENTRY_EDGES\[targetSite\]\)/);
  assert.match(page, /mainBodyDistance > 2 && !knownHold/);
  assert.match(page, /side === "defense" && !spikeActive && !defenseThreatSite\(game\)/);
  assert.match(page, /attackSiteSituation\(draft, draft\.attackPlan\.targetSite\)\.alliesOnSite\.length > 0/);
});

test("attack AI abandons scouting and forces site clear, carrier entry, plant, and cover with two cycles left", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function attackForcedPlantMode/);
  assert.match(page, /game\.cycle >= FORCED_EXECUTE_CYCLE/);
  assert.match(page, /function enforceAttackForcedPlantPlan/);
  assert.match(page, /game\.attackPlan\.formation = "five"/);
  assert.match(page, /사이트 강제 실행 · 사이트 정리 → 운반자 진입 → 즉시 설치 → 설치 보호/);
  assert.match(page, /enforceAttackForcedPlantPlan\(draft\)/);
  assert.match(page, /!\(side === "attack" && attackForcedPlantMode\(draft\)\) && aiPickupWeaponAtCurrentRegion/);
  assert.match(page, /sameRegionEnemy && queueCurrentEncounter\(draft, carrier, 3, true, 0, true, "turn-start"\)/);
  assert.match(page, /if \(siteContested && agent\.role === "duelist"/);
  assert.match(page, /if \(agent\.id === carrier\?\.id\) return -100/);
  assert.match(page, /const weaponDestination = forcedPlant \|\| operatorBreach \? null : aiWeaponDestination/);
  assert.match(page, /\(forcedPlant && draft\.spike\.status === "carried"\) \|\| operatorBreach/);
});

test("AI protects spike transport, recovers drops, and converts defense to spike denial", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function selectSpikeCarrierId/);
  assert.match(page, /agent\.name !== plan\.lurkerName/);
  assert.match(page, /roleOrder: Record<Role, number> = \{ controller: 0, initiator: 1, sentinel: 2, duelist: 3 \}/);
  assert.match(page, /game\.spike\.carrierId === agent\.id\) return attackCoreWaypoints/);
  assert.match(page, /function attackCarrierProtectionActive/);
  assert.match(page, /game\.teams\.attack\.agents\.filter\(\(ally\) => ally\.alive\)\.length >= 3/);
  assert.match(page, /&& !attackForcedPlantMode\(game\)/);
  assert.match(page, /function attackCarrierHasPioneer/);
  assert.match(page, /function aiCarrierAdvanceSupportPenalty/);
  assert.match(page, /const uncoveredSteps = path\.filter/);
  assert.match(page, /uncoveredSteps \* 38 \+ destinationPenalty/);
  assert.match(page, /const carrierSupportA = aiCarrierAdvanceSupportPenalty/);
  assert.match(page, /function attackCarrierEscortAgents/);
  assert.match(page, /function aiSpikeEscortDestination/);
  assert.match(page, /const escortDestination = side === "attack" \? aiSpikeEscortDestination/);
  assert.match(page, /side === "attack" && draft\.spike\.status === "dropped"/);
  assert.match(page, /-40 \+ distance\(agent\.region, draft\.spike\.region\) \* 5/);
  assert.match(page, /draft\.spike\.status !== "dropped" && draft\.cycle <= 2/);
  assert.match(page, /const protectCarrier = draft\.teams\.attack\.agents\.filter\(\(agent\) => agent\.alive\)\.length >= 3/);
  assert.match(page, /protectCarrier \? Number\(a\.id === draft\.spike\.carrierId\)/);
  assert.match(page, /if \(attackCarrierProtectionActive\(draft, agent\)\)/);
  assert.match(page, /return hasPioneer \? preparedMovement \? -20 : 6 : 38/);
  assert.match(page, /spikeKnownByDefense: boolean/);
  assert.match(page, /스파이크 확보 · 인접 구역 교차 대기 · 공격팀 회수 차단/);
  assert.match(page, /if \(region === game\.spike\.region\) score \+= 170/);
  assert.match(page, /guardingDroppedSpike/);
  assert.match(page, /if \(!agent\.alive \|\| agent\.extraActions < 1 \|\| isChanneling\(game, agent\)\) return false/);
  assert.match(page, /item\.alive && item\.extraActions > 0 && !isChanneling\(game, item\)/);
  assert.match(page, /canUseCard\(card, agent\) && !holdingPlantSite && !holdingOwnFireForHealing/);
  assert.match(page, /agent\.alive && !isChanneling\(draft, agent\)/);
});

test("AI remembers visible weapon drops and prioritizes upgrades for classic users", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /interface DroppedWeapon/);
  assert.match(page, /knownBy: Side\[\]/);
  assert.match(page, /function rememberObservedDroppedWeapons/);
  assert.match(page, /function aiClassicCanDelayObjectiveForWeapon/);
  assert.match(page, /const maxDetourDistance = aliveCount <= 2 \? 2 : 1/);
  assert.match(page, /const PRE_PLANT_CYCLE_LIMIT = 12/);
  assert.match(page, /const SPIKE_EXPLOSION_ROUNDS = 6/);
  assert.match(page, /const attackTurnsRemaining = Math\.max\(0, PRE_PLANT_CYCLE_LIMIT \+ 1 - game\.cycle\)/);
  assert.match(page, /game\.spike\.status === "planted" \? 5 : game\.spike\.status === "half" \? 4 : 3/);
  assert.match(page, /function aiWeaponPickupClaimScore/);
  assert.match(page, /function aiWeaponPickupObjective/);
  assert.match(page, /agent\.weapon === "classic" \? 80 : 0/);
  assert.match(page, /agent\.weapon === "classic" \? 4 : 7/);
  assert.match(page, /game\.spike\.carrierId === agent\.id/);
  assert.match(page, /function aiPickupWeaponAtCurrentRegion/);
  assert.match(page, /!\(side === "attack" && attackForcedPlantMode\(draft\)\) && aiPickupWeaponAtCurrentRegion\(draft, side\)/);
  assert.match(page, /&& !aiCurrentWeaponPickup\(draft, agent\)/);
  assert.match(page, /const weaponDestination = forcedPlant \|\| operatorBreach \? null : aiWeaponDestination/);
  assert.match(page, /const classicWeaponClaimants = forcedPlant \? \[\] : team\.agents\.filter/);
  assert.match(page, /if \(weaponObjective && agent\.weapon === "classic"\) return -48/);
  assert.match(page, /const priorityDestination = agent\.weapon === "classic"/);
  assert.match(page, /className="weapon-drop"/);
  assert.match(css, /\.effect-stack i\.weapon-drop/);
  assert.match(css, /\.weapon-art\.compact \{[\s\S]{0,80}width: 24px/);
  assert.match(css, /\.effect-stack i\.weapon-drop \{[\s\S]{0,100}width: 27px/);
});

test("losing AI uses recovery packages, hard eco escorts, and keeps the original income model", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /previousWeapons: Record<Side, WeaponId\[\]>/);
  assert.match(page, /function recoveryPackageCost/);
  assert.match(page, /const losingTeam = team\.lossStreak > 0/);
  assert.match(page, /const baselinePriority = losingTeam \|\| game\.matchRound > 1/);
  assert.match(page, /team\.funds < fullRecoveryCost/);
  assert.match(page, /recoveryCoreAgents\(team\)/);
  assert.match(page, /셰리프\+대형 방어구 2명 · 클래식\+소형 방어구 3명/);
  assert.match(page, /승리 유지/);
  assert.match(page, /전원 셰리프 이상 \+ 대형 방어구 \+ 모든 스킬 확보 후 잔액 투자/);
  assert.match(page, /셰리프 → 대형 방어구 → 스킬 순으로 최소 패키지 우선 구매/);
  assert.match(page, /const armorTarget: Agent\["armorType"\] = baselinePriority \? "heavy"/);
  assert.match(page, /team\.agents\.reduce\(\(total, agent\) => total \+ remainingSkillBuyCost\(agent\), 0\)/);
  assert.match(page, /function aiRecoveryEscortLeader/);
  assert.match(page, /function isAiRecoveryFrontlineLeader/);
  assert.match(page, /function aiRecoveryEscortDestination/);
  assert.match(page, /if \(isAiRecoveryFrontlineLeader\(draft, agent\)\) return -24/);
  assert.match(page, /if \(aiRecoveryEscortLeader\(draft, agent\)\) return 16/);
  assert.match(page, /const recoveryFrontliners = team\.agents\.filter/);
  assert.match(page, /const aFrontlinePlayable = recoveryFrontliners\.some/);
  assert.match(page, /Number\(a\.weapon === "classic"\) - Number\(b\.weapon === "classic"\)/);
  assert.match(page, /safePriorityDestination \?\? recoveryEscortDestination/);
  assert.match(page, /game\.previousWeapons\[otherSide\(side\)\]/);
  assert.match(page, /operator: \{[\s\S]{0,180}price: 38/);
  assert.match(page, /won \? 65 : nextLossStreak >= 3 \? 55/);
  assert.match(page, /team\.killsThisRound \* 5/);
});

test("AI preserves unused action cards when holding is tactically stronger than moving", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /aiTurnComplete: boolean/);
  assert.match(page, /function aiHoldPositionDecision/);
  assert.match(page, /if \(immediateContact\) return null/);
  assert.match(page, /phase === "execute"/);
  assert.match(page, /game\.cycle < game\.attackPlan\.commitCycle/);
  assert.match(page, /현재 수비 배치와 대기 각이 안정적이므로 위치를 유지합니다/);
  assert.match(page, /설치 후 후방 사격 위치에서 스파이크와 재진입 통로를 교차 대기합니다/);
  assert.match(page, /최종 해체 요원을 보호하며 위치를 유지합니다/);
  assert.match(page, /draft\.aiTurnComplete = true/);
  assert.match(page, /props\.game\.actionsUsed >= 3 \|\| props\.game\.aiTurnComplete/);
  assert.match(page, /남은 행동카드는 사용하지 않습니다/);
});

test("map movement follows the graph while attack AI avoids rear holds and mistimed utility", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /interface MovementFx/);
  assert.match(page, /function showMovementFx\(game: GameState, agent: Agent, path: number\[\]\)/);
  assert.match(page, /movement\.path\.slice\(0, movement\.nextIndex\)/);
  assert.match(page, /className="movement-route-line"/);
  assert.match(page, /className=\{`movement-runner/);
  assert.match(css, /@keyframes mapUnitTravel/);
  assert.match(css, /@keyframes movementRoutePulse/);
  assert.match(page, /const options = rawOptions\.filter/);
  assert.match(page, /function aiStrategicWaitScore/);
  assert.match(page, /cameFrom && approachScore < 45/);
  assert.doesNotMatch(page, /preferred !== undefined && legalTargets\.includes\(preferred\) \? preferred : legalTargets\[0\]/);
  assert.match(page, /function attackAiSkillWindowOpen/);
  assert.match(page, /function aiHasFollowupMovementCard/);
  assert.match(page, /needsFollowupTeamAction && game\.actionsUsed >= 3/);
  assert.match(page, /agent\.status\.moveRangeBonus > 0 \|\| agent\.status\.highGear/);
});

test("AI identifies known Operators and avoids unsupported head-on lanes", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function knownOperatorThreatAtRegion/);
  assert.match(page, /weapon\?: WeaponId/);
  assert.match(page, /weapon: tacticalMemory\.weapon \?\? enemy\.weapon/);
  assert.match(page, /weapon: enemy\.weapon,[\s\S]{0,80}observedTeamTurn/);
  assert.match(page, /enemy\.weapon !== "operator" \|\| enemy\.confidence < 0\.35/);
  assert.match(page, /waitingOnRegion[\s\S]{0,180}enemy\.exact \? 52 : 38/);
  assert.match(page, /function aiOperatorRoutePenalty/);
  assert.match(page, /nearbyAllies >= 2 \? 0\.55/);
  assert.match(page, /urgentObjective \? 0\.35 : 1/);
  assert.match(page, /knownOperatorThreatAtRegion\(game, agent\.team, region\)/);
  assert.match(page, /const operatorPressure = operators\.reduce/);
  assert.match(page, /operatorPressure/);
  assert.match(page, /attackPlanRushDestination[\s\S]{0,700}aiOperatorRoutePenalty/);
  assert.match(page, /function aiAttackDestination[\s\S]{0,2600}const operatorA = aiOperatorRoutePenalty/);
  assert.match(page, /function aiDefenseDestination[\s\S]{0,3200}const operatorA = aiOperatorRoutePenalty/);
  assert.match(page, /const operatorHeadOn = opponent\.weapon === "operator"/);
  assert.match(page, /const operatorRetreatBias = operatorHeadOn && !objectiveCommit \? 24 : 0/);
  assert.match(page, /returnFire\.killChance >= 60[\s\S]{0,80}attackOdds\.killChance < 35/);
  assert.match(page, /retreatDestinationIsViable && \(operatorDisengage \|\| tradeRelayRetreat \|\| tacticalResetRetreat \|\| genericRetreat\)/);
});

test("AI rotates away from a known Operator but commits a coordinated breach when every site is held", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /type OperatorResponseMode = "none" \| "avoid" \| "breach"/);
  assert.match(page, /operatorCommitUntilCycle: number/);
  assert.match(page, /function operatorSiteAssessment/);
  assert.match(page, /const safeAlternative = current\.holds\.length > 0[\s\S]{0,220}alternative\.holds\.length === 0/);
  assert.match(page, /plan\.targetSite = otherSite;[\s\S]{0,120}plan\.operatorMode = "avoid"/);
  assert.match(page, /const bothSitesHeld = assessments\.A\.holds\.length > 0 && assessments\.B\.holds\.length > 0/);
  assert.match(page, /plan\.operatorMode = "breach"/);
  assert.match(page, /operatorCommitUntilCycle = Math\.min\(PRE_PLANT_CYCLE_LIMIT, Math\.max\(game\.cycle \+ 2, plan\.commitCycle\)\)/);
  assert.match(page, /formation = "five"/);
  assert.match(page, /refreshAttackOperatorResponse\(draft\)/);
  assert.match(page, /const coordinatedBreach = agent\.team === "attack"/);
  assert.match(page, /const unsupportedBreachPenalty = coordinatedBreach/);
  assert.match(page, /function shortestAiMovementPath/);
  assert.match(page, /moveAgent\(draft, agent, tacticalDestination, card\.kind, shortestAiMovementPath/);
  assert.match(page, /attackOperatorBreachActive\(game, opponent\.id\)/);
  assert.match(page, /operatorSiteAssessment\(game, game\.attackPlan\.targetSite\)\.holds/);
  assert.match(page, /game\.attackPlan\.operatorTargetIds/);
});

test("combat retreat closes the result scene before replaying movement on the tactical map", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /postMovementFx\?: MovementFx\[\]/);
  assert.match(page, /postCombatMovementFxQueue: MovementFx\[\]/);
  assert.match(page, /scene\.postMovementFx\.push\(retreatMovementFx\)/);
  assert.match(page, /draft\.combatQueue\.shift\(\);[\s\S]*draft\.postCombatMovementFxQueue\.push/);
  assert.match(page, /const combatScene = combatIntermission \? null : game\.combatQueue\[0\]/);
  assert.match(page, /mapBoardRef\.current\?\.scrollIntoView/);
  assert.match(page, /props\.game\.postCombatMovementFxQueue\?\.length/);
  assert.match(page, /COMBAT RETREAT/);
  assert.match(css, /\.post-combat-move-banner/);
});

test("AI remembers a conceded entry and only re-enters after regrouping or utility", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /interface AiRetreatMemory/);
  assert.match(page, /avoidedRegion: from/);
  assert.match(page, /expiresTeamTurn: draft\.teamTurns\[agent\.team\] \+ 2/);
  assert.match(page, /function aiTargetsAfterRetreatMemory/);
  assert.match(page, /!path\.slice\(1\)\.includes\(memory\.avoidedRegion\)/);
  assert.match(page, /hasBreachUtility \|\| support\.length > blockers\.length/);
  assert.match(page, /memory\.plan === "flank" && memory\.flankRegion !== undefined/);
  assert.match(page, /function aiTradeRelayMemoryForAgent/);
  assert.match(page, /function aiTradeFollowupDestination/);
  assert.match(page, /if \(aiTradeRelayMemoryForAgent\(draft, agent\)\) return -140/);
  assert.match(page, /const safePriorityDestination = tradeDestination \?\? recoveryDecision\?\.destination/);
  assert.match(page, /if \(aiRetreatReentryIsUrgent\(game, agent\)\) return false/);
  assert.match(page, /shouldAiRetreat\(game, actor, retreatRegion\)/);
});

test("defense retake deadline forces a paired trade entry before two-stage defuse expires", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function defenseRetakeMustAdvance/);
  assert.match(page, /const DEFENSE_RETAKE_SITE_ENTRY_TARGET = 4/);
  assert.match(page, /const DEFENSE_RETAKE_FORCE_ENTRY_BUFFER = 3/);
  assert.match(page, /function defenseRetakeSiteDistance/);
  assert.match(page, /function defenseRetakeCombatBuffer/);
  assert.match(page, /siteEntryTurns \+ DEFENSE_RETAKE_SITE_ENTRY_TARGET \+ combatBuffer/);
  assert.match(page, /function defenseRetakeForceEntry/);
  assert.match(page, /siteEntryTurns \+ DEFENSE_RETAKE_FORCE_ENTRY_BUFFER \+ defenseRetakeCombatBuffer/);
  assert.match(page, /const interactionTurns = game\.spike\.status === "planted" \? 2 : 1/);
  assert.match(page, /spikeTravelTurns \+ interactionTurns \+ combatBuffer/);
  assert.match(page, /function defenseRetakePair/);
  assert.match(page, /function defenseRetakeEntryScore/);
  assert.match(page, /agent\.weapon === "operator"[\s\S]{0,40}\? -120/);
  assert.match(page, /const nonSniperEntries = alive\.filter/);
  assert.match(page, /game\.spike\.explosion >= defenseRetakeSiteDistance\(game, agent\) \+ interactionTurns/);
  assert.match(page, /alive\.length < 2/);
  assert.match(page, /distance\(a\.region, leader\.region\)/);
  assert.match(page, /pairSeparated && agent\.id === pair\.leader\.id && !urgentRetake/);
  assert.match(page, /distance\(a, pair\.leader\.region\) \* 8/);
  assert.match(page, /const trailingSniper = urgentRetake/);
  assert.match(page, /const sniperMustTrail = WEAPONS\[agent\.weapon\]\.type === "sniper"/);
  assert.match(page, /separated && agent\.id === retakePair\.escort\.id/);
  assert.match(page, /forceEntry \? -280 : -180/);
  assert.match(page, /\$\{DEFENSE_RETAKE_SITE_ENTRY_TARGET\}턴 전 사이트 진입 목표/);
  assert.match(page, /\$\{DEFENSE_RETAKE_FORCE_ENTRY_BUFFER\}턴 전 강제 돌파/);
});

test("urgent retakes keep zero-detour weapon upgrades without sacrificing defuse time", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function defenseRetakeWeaponPickupIsSafe/);
  assert.match(page, /if \(item\.region === agent\.region\) return true/);
  assert.match(page, /if \(travelThroughWeapon > directTravel\) return false/);
  assert.match(page, /return slackAfterPickup >= 1/);
  assert.match(page, /activeDefenseRetake && aiPickupWeaponAtCurrentRegion\(draft, side\)/);
  assert.match(page, /defenseRetakeWeaponPickupIsSafe\(game, agent, item\)/);
});

test("Omen keeps every active dark smoke until its normal expiry", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /sourceSkill: definition\.id/);
  assert.match(page, /sourceSkill: "dark"/);
  assert.doesNotMatch(page, /smokes = (?:game|draft)\.smokes\.filter\(\(smoke\) => !\(smoke\.sourceAgentId === agent\.id && smoke\.sourceSkill === "dark"\)\)/);
});

test("AI commits to a strength-based recovery breach or flank across multiple turns", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function aiRecoveryBlockers/);
  assert.match(page, /function aiGuardedRecoveryObjectives/);
  assert.match(page, /function shortestRecoveryFlankPath/);
  assert.match(page, /interface AiRecoveryOrder/);
  assert.match(page, /function aiRecoveryAssaultScore/);
  assert.match(page, /function aiRecoveryOrderDestination/);
  assert.match(page, /next !== end && \(next === objectiveRegion \|\| blockedRegions\.has\(next\)\)/);
  assert.match(page, /committedUntilTeamTurn: game\.teamTurns\[agent\.team\] \+ 2/);
  assert.match(page, /assaultScore >= 0 \|\| deadlineForcesBreach \? "breach" : "flank"/);
  assert.match(page, /refreshAiRecoveryOrder\(game, agent, order\)/);
  assert.match(page, /const recoveryBlockerIds = new Set/);
  assert.match(page, /recoveryDecision\.destination === null && tradeDestination === null\) continue/);
  assert.match(page, /회수 작전 ·/);
  assert.match(page, /회수는 확인된 대기 사격 때문에 보류하고/);
});

test("AI keeps prior-turn enemy positions and waits outside the viewer-only last-known UI", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /interface AiEnemyKnowledge/);
  assert.match(page, /aiEnemyKnowledge: AiEnemyKnowledge\[\]/);
  assert.match(page, /function refreshAiEnemyKnowledge/);
  assert.match(page, /game\.aiEnemyKnowledge = \(game\.aiEnemyKnowledge \?\? \[\]\)\.filter\(\(memory\) => memory\.agentId !== defender\.id\)/);
  assert.match(page, /order\.blockerRegions = order\.blockerRegions\.filter\(\(memory\) => memory\.agentId !== defender\.id\)/);
  assert.match(page, /observedTeamTurn: game\.teamTurns\[side\]/);
  assert.match(page, /confidence: Math\.max\(0\.25, 0\.78 - age \* 0\.14\)/);
  assert.match(page, /const memoryWeight = enemy\.confidence/);
  assert.match(page, /enemy\.waitDirs\.includes\(region\)/);
  assert.match(page, /draft\.enemyMemories = \[\]/);
  assert.doesNotMatch(page, /draft\.aiEnemyKnowledge = \[\]/);
});

test("hot-reloaded games backfill newly added AI tactical state", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function ensureAiTacticalState\(game: GameState\)/);
  assert.match(page, /game\.aiEnemyKnowledge \?\?= \[\]/);
  assert.match(page, /game\.aiRecoveryOrders \?\?= \[\]/);
  assert.match(page, /const draft = structuredClone\(current\) as GameState;[\s\S]{0,100}ensureAiTacticalState\(draft\)/);
  assert.match(page, /function refreshAiEnemyKnowledge[\s\S]{0,100}ensureAiTacticalState\(game\)/);
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

test("sniper waits target exact range-two regions while non-wait attacks lose one priority step", async () => {
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
  assert.match(page, /const moverSniperNonWaitPenalty = WEAPONS\[mover\.weapon\]\.type === "sniper" \? 1 : 0/);
  assert.match(page, /const holderSniperNonWaitPenalty = WEAPONS\[enemy\.weapon\]\.type === "sniper" && !waiting \? 1 : 0/);
  assert.match(page, /moverPriority \+ moverSniperNonWaitPenalty/);
  assert.match(page, /\(waiting \? 1 : 3\) \+ holderSniperNonWaitPenalty/);
  assert.match(page, /비대기 교전 우선도 \+1\(한 단계 느림\)/);
  assert.match(page, /저격 대기 구역 선택 · 거리 1~2/);
  assert.doesNotMatch(page, /enemy\.waitDirs\.includes\(path\[1\]\)/);
});

test("same-priority retreat gains temporary movement and wait claimants cannot retreat", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /moverChoice\.type === "retreat" \? 2 : 0/);
  assert.match(page, /holderChoice\.type === "retreat" \? 2 : 0/);
  assert.match(page, /scene\.moverMoveBonus \+ moverRetreatMoveBonus/);
  assert.match(page, /combatRetreatIsLocked\(scene, actor\.id\)/);
  assert.match(page, /대기 확보 교전 · 시도자 후퇴 불가/);
});

test("voluntary range-one contacts and range-zero openings require an attack before retreat", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /openingAttackRequiredIds: string\[\]/);
  assert.match(page, /openingAttackRequiredIds: range === 0 \? \[/);
  assert.match(page, /\.\.\.\(canAttack \? \[mover\.id\] : \[\]\)/);
  assert.match(page, /scene\.range === 1 && contact\.canAttack/);
  assert.match(page, /scene\.openingAttackRequiredIds\.push\(agent\.id\)/);
  assert.match(page, /function combatRetreatIsLocked/);
  assert.match(page, /satisfyOpeningAttackRequirement\(scene, actor\.id\)/);
  assert.match(page, /첫 공격을 완료해야 이탈할 수 있습니다/);
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
  assert.match(page, /거리 0 에임 \+2 · 피해 \+\$\{SHOTGUN_CLOSE_DAMAGE_BONUS\}/);
  assert.match(css, /\.turret-avatar, \.turret-portrait/);
  assert.match(css, /\.weapon-rule-copy/);
});

test("combat UI shows applied dice, distance damage, vital slots, and distinct shot feedback", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /function appliedAimSize/);
  assert.match(page, /function appliedMoveSize/);
  assert.match(page, /function appliedDamageProfile/);
  assert.match(page, /bodyDamage: damageProfile\.body/);
  assert.match(page, /headDamage: damageProfile\.head/);
  assert.match(page, /function combatAppliedStats/);
  assert.match(page, /fighter\.shot\?\.aimSize \?\? previewAim/);
  assert.match(page, /incomingShot\?\.moveSize \?\? previewMove/);
  assert.match(page, /function CombatVitalSlots/);
  assert.match(page, /const max = kind === "hp" \? AGENT_MAX_HP : MAX_ARMOR/);
  assert.match(page, /Array\.from\(\{ length: max \}/);
  assert.match(page, /className=\{statClass\(appliedStats\.aimDelta\)\}/);
  assert.match(page, /BODY <b>\{appliedStats\.bodyDamage\}/);
  assert.match(page, /HEAD <b>\{appliedStats\.headDamage\}/);
  assert.match(page, /거리 \{combatScene\.range\}/);
  assert.match(page, /incoming-headshot/);
  assert.match(page, /missed-shot/);
  assert.match(page, /빗나감 · 피해 없음/);
  assert.match(page, /헤드샷 피해/);
  assert.match(css, /\.combat-vital-slots\.hp i\.filled/);
  assert.match(css, /\.combat-live-stats span\.buff/);
  assert.match(css, /\.combat-live-stats span\.nerf/);
  assert.match(css, /\.combat-roll\.miss/);
  assert.match(css, /\.combat-fighter\.incoming-headshot/);
  assert.match(css, /@keyframes headshotImpact/);
});

test("four health, two armor, weapons, and utility share the six-durability balance scale", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const AGENT_MAX_HP = 4/);
  assert.match(page, /const MAX_ARMOR = 2/);
  assert.match(page, /const SHOTGUN_CLOSE_DAMAGE_BONUS = 2/);
  assert.match(page, /classic: \{[^}]*body: 2, head: 3/);
  assert.match(page, /sheriff: \{[^}]*body: 3, head: 4/);
  assert.match(page, /bucky: \{[^}]*body: 3, head: 4/);
  assert.match(page, /spectre: \{[^}]*body: 3, head: 4/);
  assert.match(page, /bulldog: \{[^}]*body: 3, head: 4/);
  assert.match(page, /outlaw: \{[^}]*body: 5, head: 6, price: 20/);
  assert.match(page, /const sniperNonWaitDamagePenalty = weapon\.type === "sniper" && !waiting \? 1 : 0/);
  assert.match(page, /비대기 공격 몸통·헤드 피해 -1/);
  assert.match(page, /트레이드 상대 페널티: 교전 동안 우선도 \+1·첫 사격 대기 에임 \+1 미적용/);
  assert.match(page, /holderTradeTargetPenalty/);
  assert.match(page, /function combatShotIsWaiting[\s\S]{0,180}fighterId === scene\.holder\.id && scene\.waiting/);
  assert.match(page, /function combatShotGetsWaitAim[\s\S]{0,260}!\(scene\.holderTradeTargetPenalty && openingShot\)/);
  assert.match(page, /<b>VS TRADE<\/b><em>PRIO \+1<\/em>/);
  assert.match(page, /WAIT AIM -1/);
  assert.match(page, /weapon\.type === "sniper" && range === 0\) aim -= 2/);
  assert.match(page, /거리 0 에임 -2/);
  assert.match(page, /judge: \{[^}]*body: 4, head: 5/);
  assert.match(page, /phantom: \{[^}]*body: 4, head: 5/);
  assert.match(page, /vandal: \{[^}]*body: 4, head: 6/);
  assert.match(page, /operator: \{[^}]*body: 6, head: 8/);
  assert.match(page, /paint: 2,[\s\S]*hot: 2,[\s\S]*shock: 2,[\s\S]*aftershock: 3,[\s\S]*turret: 2/);
  assert.match(page, /hp: AGENT_MAX_HP/);
  assert.match(page, /agent\.hp = AGENT_MAX_HP/);
  assert.match(page, /Math\.min\(AGENT_MAX_HP, agent\.hp \+ 1\)/);
});

test("death selection, objective intel, and dropped weapons obey the active viewer", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /if \(game\.selectedAgentId === defender\.id\)/);
  assert.match(page, /game\.teams\[defender\.team\]\.agents\.find\(\(agent\) => agent\.alive\)\?\.id \?\? null/);
  assert.match(page, /selectedAgent\?\.team === viewerSide && selectedAgent\.alive/);
  assert.match(page, /if \(!selectedAgent\?\.alive/);
  assert.match(page, /function spikeVisibleTo\(game: GameState, viewerSide: Side, omniscient = false\)/);
  assert.match(page, /const observed = observedRegions\(game, viewerSide\)/);
  assert.match(page, /const knownWeapons = game\.droppedWeapons\.filter\(\(item\) => item\.region === region\.id && observedNow\)/);
  assert.match(page, /const hasSpike = spikeVisible &&/);
  assert.match(page, /!spikeVisible \? "정보 없음"/);
});

test("combat odds, aftershock damage, condition badges, and weapon silhouettes stay wired", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /function calculateShotOdds/);
  assert.match(page, /for \(let aimRoll = 1; aimRoll <= aim; aimRoll \+= 1\)/);
  assert.match(page, /combatAttackPreview\.hitChance/);
  assert.match(page, /combatAttackPreview\.expectedDamage/);
  assert.match(page, /applyDamage\(draft, getAgent\(draft, effect\.ownerAgentId\), agent, SKILL_DAMAGE\.aftershock, "여진 폭발"\)/);
  assert.match(page, /function AgentStatusBadges/);
  assert.match(page, /effect\.kind === "blind"/);
  assert.match(page, /effect\.kind === "concussed"/);
  assert.match(page, /function WeaponSilhouette/);
  assert.match(page, /<WeaponSilhouette weapon=\{item\.weapon\} compact \/>/);
  for (const weapon of ["classic", "sheriff", "bucky", "spectre", "bulldog", "outlaw", "judge", "phantom", "vandal", "operator"]) {
    assert.match(css, new RegExp(`\\.weapon-art-${weapon}`));
  }
  assert.match(css, /\.agent-status-badges \.status-blind/);
  assert.match(css, /\.agent-status-badges \.status-aftershock/);
  assert.match(css, /\.fight-action em/);
});

test("revised utility rules resolve tailwind before gunfire and use current sight for Sova arrows", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const openingTailwind = \[getAgent\(draft, scene\.mover\.id\), getAgent\(draft, scene\.holder\.id\)\]/);
  assert.match(page, /scene\.phase = "tailwind";[\s\S]{0,220}scene\.pendingShotActorId = null/);
  assert.match(page, /첫 총격 전에 순풍 이동 구역을 선택합니다/);
  assert.match(page, /이번 팀 턴 동안 선택 구역의 적과 그 구역을 대기 중인 적/);
  assert.match(page, /function reconArrowWatcher/);
  assert.match(page, /enemy\.alive && enemy\.waitDirs\.includes\(targetRegion\)/);
  assert.match(page, /addTrade\(draft, \{ enemyId: waitingEnemy\.id, team: agent\.team, sourceId: agent\.id \}\);[\s\S]{0,100}rememberEnemy\(draft, agent\.team, waitingEnemy\)/);
  assert.match(page, /const observedByCaster = observedRegions\(draft, agent\.team\)/);
  assert.match(page, /observedByCaster\.has\(enemy\.region\) \|\| enemy\.detected/);
  assert.match(page, /!devices\.length && enemies\.length/);
});

test("same-turn multikills animate and persist as a round highlight", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /turnKillCounts: Record<string, number>/);
  assert.match(page, /roundKillHighlights: KillHighlight\[\]/);
  assert.match(page, /const count = \(game\.turnKillCounts\[attacker\.id\] \?\? 0\) \+ 1/);
  assert.match(page, /game\.lastKillFx = killHighlight/);
  assert.match(page, /game\.roundKillHighlights\.push\(killHighlight\)/);
  assert.match(page, /draft\.turnKillCounts = \{\}/);
  assert.match(page, /function KillStreakOverlay/);
  assert.match(page, /function RoundHighlightCard/);
  assert.match(page, /multiKillLabel\(highlight\.count\)/);
  assert.match(page, /highlight\.side === game\.winner/);
  assert.match(page, /highlight\.count >= 4/);
  assert.match(page, /roundHighlight \? <RoundHighlightCard highlight=\{roundHighlight\} \/> : <RoundObjectiveHighlightCard/);
  assert.match(css, /\.multikill-fx/);
  assert.match(css, /\.round-highlight/);
  assert.match(css, /@keyframes multikillReveal/);
  assert.match(css, /@keyframes killPipPop/);
});

test("weapon silhouettes, highlight portraits, and four-heart combat vitals remain compact", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /backgroundImage: `url\("\$\{import\.meta\.env\.BASE_URL\}weapon-icons\/\$\{weapon\}\.png"\)`/);
  assert.match(css, /Base-shop icon masks: exact weapon proportions/);
  assert.match(css, /filter: brightness\(0\) saturate\(100%\)/);
  assert.match(css, /\.weapon-art-operator \{ width: 108px; height: 30px/);
  assert.match(css, /\.weapon-art-classic \{ width: 54px; height: 34px/);
  assert.match(css, /\.weapon-art\.compact \{[\s\S]{0,120}width: 24px/);
  assert.match(css, /\.highlight-portrait \{[^}]*width: 116px; height: 116px; aspect-ratio: 1/);
  assert.match(css, /\.highlight-portrait\.victim \{ width: 72px; height: 72px/);
  assert.match(css, /\.combat-vital-display \{ display: grid; grid-template-columns: 1fr/);
  assert.match(css, /\.combat-vital-display > span \{[^}]*overflow: hidden/);
  assert.match(css, /\.combat-vital-slots i \{[^}]*font-size: 11px/);
});

test("round-end accolades use distinct ace, clutch, team ace, flawless, and thrifty rules", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /roundKillVictims: Record<string, string\[\]>/);
  assert.match(page, /roundDeaths: string\[\]/);
  assert.match(page, /clutchCandidate: ClutchCandidate \| null/);
  assert.match(page, /roundStartingEquipment: Record<Side, number>/);
  assert.match(page, /const THRIFTY_CREDIT_GAP = 12500/);
  assert.match(page, /if \(!game\.roundDeaths\.includes\(defender\.id\)\) game\.roundDeaths\.push\(defender\.id\)/);
  assert.match(page, /if \(game\.clutchCandidate\) return/);
  assert.match(page, /survivors\.length === 1 && enemies\.length >= 2/);
  assert.match(page, /enemyIds\.every\(\(enemyId\) => victims\.has\(enemyId\)\)/);
  assert.match(page, /clutch\?\.side === winner/);
  assert.match(page, /winningTeam\.agents\.every\(\(agent\) => \(game\.roundKillVictims\[agent\.id\]\?\.length \?\? 0\) > 0\)/);
  assert.match(page, /winningTeam\.agents\.every\(\(agent\) => !game\.roundDeaths\.includes\(agent\.id\)\) && losingTeam\.agents\.every\(\(agent\) => !agent\.alive\)/);
  assert.match(page, /equipmentGap >= THRIFTY_CREDIT_GAP/);
  assert.match(page, /captureRoundStartingEquipment\(draft\)/);
  assert.match(page, /function RoundAccoladeSplash/);
  assert.match(page, /<RoundAccoladeSplash accolades=\{accolades\} \/>/);
  assert.match(css, /\.round-accolade-splash/);
  assert.match(css, /\.accolade-stack/);
  assert.match(css, /@keyframes accoladeReveal/);
});

test("procedural tactical audio covers combat, utility, objectives, and mobile controls", async () => {
  const [page, audio, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game-audio.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /configureTacticalAudio/);
  assert.match(page, /playTacticalSound\(\{ type: "encounter", pan:/);
  assert.match(page, /type: "shot", weapon: fighter\.weapon/);
  assert.match(page, /type: "skill", skillId: skillFx\.skillId/);
  assert.match(page, /type: "spike", status: game\.spike\.status/);
  assert.match(page, /type: "kill", count: killFx\.count/);
  assert.match(page, /type: "round", winner: game\.winner/);
  assert.match(page, /protocol-grid-sound-volume/);
  assert.match(page, /protocol-grid-audio-profile/);
  assert.match(page, /audioPanForRegion/);
  assert.match(page, /HEADSET/);
  assert.match(page, /SPEAKER/);
  assert.match(audio, /createDynamicsCompressor/);
  assert.match(audio, /createStereoPanner/);
  assert.match(audio, /type TacticalAudioProfile = "headset" \| "speakers"/);
  assert.match(audio, /createOscillator/);
  assert.match(audio, /createBufferSource/);
  assert.match(audio, /function shotSound/);
  assert.match(audio, /Each gun keeps a learnable three-beat identity/);
  assert.match(audio, /const WEAPON_VOICES/);
  assert.match(audio, /function mechanicalClick/);
  assert.match(audio, /function electricArc/);
  assert.match(audio, /function servoMotion/);
  assert.match(audio, /function noiseSweep/);
  assert.match(audio, /case "tailwind":/);
  assert.match(audio, /case "paint":/);
  assert.match(audio, /case "turret":/);
  assert.match(audio, /case "recon":/);
  assert.match(audio, /case "aftershock":/);
  assert.match(audio, /case "shadow":/);
  assert.match(audio, /function skillSound/);
  assert.match(audio, /function spikeSound/);
  assert.match(audio, /const killNotes = \[146\.83, 174\.61, 220, 293\.66\]/);
  assert.match(audio, /Impact -> lift -> open-fifth resolution/);
  assert.match(css, /\.sound-popover/);
  assert.match(css, /\.audio-profile-switch/);
  assert.match(css, /width: min\(260px, calc\(100vw - 16px\)\)/);
});

test("AI preserves movement intent and aims holds at predicted approach lanes", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /interface AiMovementHistory/);
  assert.match(page, /aiMovementHistories: AiMovementHistory\[\]/);
  assert.match(page, /function aiMovementObjectiveKey/);
  assert.match(page, /expiresTeamTurn: game\.teamTurns\[agent\.team\] \+ 2/);
  assert.match(page, /if \(target === priorRegion\) return 120/);
  assert.match(page, /recordAiMovementHistory\(game, agent, origin\)/);
  assert.match(page, /function aiEnemyApproachScore/);
  assert.match(page, /route\.at\(-2\) === region/);
  assert.match(page, /cameFrom && approachScore < 45/);
  assert.match(page, /if \(aiWaitShouldBePreserved\(draft, agent\)\) return 92/);
  assert.match(page, /aiRecentMovementPenalty\(game, agent, a\)/);
});

test("postplant AI backs off, watches the objective, and rejects inward idle holds", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function postplantRetakeRoutes/);
  assert.match(page, /function postplantBodyExposure/);
  assert.match(page, /function postplantLaneWaitScore/);
  assert.match(page, /function attackPostplantWaypoints/);
  assert.match(page, /SITE_REGIONS\[site\]\.includes\(a\) \? 1 : 0/);
  assert.match(page, /candidates\.includes\(agent\.region\) && agent\.waitDirs\.some/);
  assert.match(page, /if \(agent && attackPlanPhase\(game\) === "postplant"/);
  assert.match(page, /if \(region === spikeRegion\) score \+= bodyExposure === 0 \? 72 : -58/);
  assert.match(page, /const coveringPlantedSpike = agent\.team === "attack"/);
  assert.match(page, /function aiPostplantHoldIsUseful/);
  assert.match(page, /retakeLaneCoverage\.length >= Math\.min\(1, alive\.length\)/);
  assert.match(page, /설치 후 후방 사격 위치에서 스파이크와 재진입 통로를 교차 대기합니다/);
});

test("combat presentation holds automatic actions above, reveals final AI results, and stages retreat after the outro", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /const combatResultRef = useRef<HTMLDivElement \| null>/);
  assert.match(page, /const combatActionRef = useRef<HTMLDivElement \| null>/);
  assert.match(page, /const resultDelay = currentCombatHasShot \? 780 : 180/);
  assert.match(page, /const autoObservedCombat = spectatorMode/);
  assert.match(page, /const finalCombatResult = currentCombatPhase === "result" && !!currentCombatScene\?\.resolved/);
  assert.match(page, /const pinAutomaticOverview = autoObservedCombat && !finalCombatResult/);
  assert.match(page, /pinAutomaticOverview[\s\S]{0,80}\? combatTurnRef\.current/);
  assert.match(page, /const delay = pinAutomaticOverview[\s\S]{0,50}\? 0/);
  assert.match(page, /currentCombatPhase === "result" \? 720 : isActionPhase \? 360 : 260/);
  assert.match(page, /isActionPhase[\s\S]{0,100}combatActionRef\.current/);
  assert.match(page, /const eased = 1 - Math\.pow\(1 - progress, 3\)/);
  assert.match(page, /scene\.phase = "outro"/);
  assert.match(page, /<CombatOutroController/);
  assert.match(page, /postCombatMovementFxQueue\.push\(\.\.\.scene\.postMovementFx\)/);
  assert.match(page, /<CombatTransitionScene scene=\{combatScene\}/);
  assert.match(page, /const combatApproachActive = !!currentCombatId/);
  assert.match(page, /presentationLocked=\{combatApproachActive \|\| combatIntroActive/);
  assert.match(page, /combatScene && !combatApproachActive/);
  assert.match(page, /className=\{`transition-wait-cone/);
  assert.match(page, /scene\.offAngle \? "AMBUSH" : "CONTACT"/);
  assert.match(page, /scene\.offAngle \? "HOLD AWAY"/);
  assert.match(page, /const contactSource = scene\.waiting \? holderVisual : moverVisual/);
  assert.match(page, /const directedContactStyle = \(from:/);
  assert.match(page, /left: `\$\{from\.x\}%`/);
  assert.match(page, /top: `\$\{from\.y\}%`/);
  assert.match(page, /style=\{directedContactStyle\(contactSource, contactTarget\)\}/);
  assert.match(css, /contactArrowReach \{ 0%,18% \{ opacity: 1; clip-path: polygon\(0 43%,44% 43%,44% 0,50% 50%/);
  assert.match(page, /className="transition-retreat-arrow"/);
  assert.match(page, /retreatedIds\?: string\[\]/);
  assert.match(page, /fighter\.hpAfter <= 0[\s\S]{0,80}\? "dead"/);
  assert.match(page, /scene\.retreatedIds\?\.includes\(fighter\.id\)[\s\S]{0,50}\? "retreating"/);
  assert.match(page, /className=\{`combat-weapon-readout \$\{isMover \? "faces-right" : "faces-left"\}`\}/);
  assert.match(page, /<h3>\{fighter\.name\}<\/h3>\{fighter\.kind === "turret" && <p>/);
  assert.match(css, /@keyframes contactCameraIn/);
  assert.match(css, /@keyframes contactCameraOut/);
  assert.match(css, /@keyframes contactCameraIn \{[\s\S]{0,180}scale\(1\.78\)/);
  assert.doesNotMatch(css, /@keyframes contactCameraIn \{[^}]*filter:/);
  assert.match(css, /\.combat-transition-viewport \{[^}]*container-type: size/);
  assert.match(css, /\.combat-transition-plane \{[^}]*width: min\(100cqw,100cqh\); height: min\(100cqw,100cqh\)/);
  assert.match(css, /\.transition-wait-cone/);
  assert.doesNotMatch(css, /\.transition-wait-cone \{[^}]*margin-top:/);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.transition-wait-cone \{ height: 28px; \}/);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.transition-wait-origin \{ width: 46px; height: 46px;/);
  assert.match(css, /\.contact-focus-pulse\.ambush/);
  assert.match(css, /@keyframes holdConeTrigger/);
  assert.match(css, /transition-contact-token\.dead/);
  assert.match(css, /transition-contact-token\.retreating/);
  assert.match(css, /combat-weapon-readout\.faces-right \.weapon-art \{ transform: scaleX\(-1\)/);
  assert.match(page, /ref=\{combatResultRef\}/);
  assert.match(page, /ref=\{combatActionRef\} className="combat-actions"/);
  assert.doesNotMatch(page, /\[currentCombatPhase, currentCombatResult\]/);
});

test("AI evaluates optional distance-one combat before accepting contact", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /interface AiOptionalContactAssessment/);
  assert.match(page, /function assessAiOptionalContact/);
  assert.match(page, /const simulation = structuredClone\(game\) as GameState/);
  assert.match(page, /const duel = aiCombatDuelOdds\(simulation, scene, first, second\)/);
  assert.match(page, /winChance - lossChance/);
  assert.match(page, /const urgentObjective = aiRetreatReentryIsUrgent\(game, actor\)/);
  assert.match(page, /const assessment = chooseAiOptionalContact\(draft, contact\)/);
  assert.match(page, /acceptPendingContact\(draft, assessment\.enemyId\)/);
  assert.match(page, /AI 요원.*거리 1 교전 조건을 계산하고 교전을 보류합니다/);
});
