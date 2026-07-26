"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Side = "attack" | "defense";
type Role = "duelist" | "initiator" | "controller" | "sentinel";
type CardKind = "basic" | "peek" | "entry" | "follow" | "control";
type PlayMode = "hotseat" | "vs-ai" | "ai-vs-ai";
type WeaponId =
  | "classic"
  | "sheriff"
  | "bucky"
  | "spectre"
  | "bulldog"
  | "outlaw"
  | "judge"
  | "phantom"
  | "vandal"
  | "operator";

type SkillTarget = "self" | "adjacent" | "range2" | "any";

interface Region {
  id: number;
  name: string;
  x: number;
  y: number;
  site?: "A" | "B";
}

interface Weapon {
  id: WeaponId;
  name: string;
  type: "normal" | "shotgun" | "sniper";
  body: number;
  head: number;
  price: number;
  aim: number;
  move: number;
  unlock: number;
}

interface SkillDefinition {
  id: string;
  name: string;
  price: string;
  target: SkillTarget;
  description: string;
}

interface AgentTemplate {
  name: string;
  role: Role;
  skills: SkillDefinition[];
}

interface AgentStatus {
  aimPenalty: number;
  priorityPenalty: number;
  moveBonus: number;
  moveRangeBonus: number;
  evadeReady: boolean;
  vulnerable: boolean;
  ignoreGround: boolean;
  highGear: boolean;
}

interface Agent {
  id: string;
  name: string;
  role: Role;
  team: Side;
  region: number;
  hp: number;
  armor: number;
  armorType: "none" | "light" | "regen" | "heavy";
  armorDamaged: boolean;
  alive: boolean;
  weapon: WeaponId;
  extraActions: number;
  waitDirs: number[];
  waitStamp: number;
  waitOrders: Record<number, number>;
  detected: boolean;
  skills: Record<string, number>;
  status: AgentStatus;
}

interface ActionCard {
  id: string;
  kind: CardKind;
  source: string;
  used: boolean;
  committedAgentId?: string;
}

interface TeamState {
  side: Side;
  agents: Agent[];
  deck: ActionCard[];
  hand: ActionCard[];
  discard: ActionCard[];
  funds: number;
  rushUsed: boolean;
  cover: boolean;
  buyLocked: boolean;
  buyStartFunds: number;
  score: number;
  lossStreak: number;
  killsThisRound: number;
  plantsThisRound: number;
  defusesThisRound: number;
}

interface SpikeState {
  status: "carried" | "dropped" | "planting" | "planted" | "half" | "defusing" | "defused" | "exploded";
  carrierId: string | null;
  region: number | null;
  actorId: string | null;
  startCycle: number | null;
  installedCycle: number | null;
  halfCycle: number | null;
  explosion: number;
}

interface Deployable {
  id: string;
  kind: "trip" | "camera" | "turret" | "alarm";
  owner: Side;
  region: number;
  to?: number;
  ownerAgentId?: string;
}

interface ZoneEffect {
  id: string;
  owner: Side;
  ownerAgentId?: string;
  region: number;
  expiresOwnerTurn: number;
  expiresOn: "owner-start" | "owner-end";
}

interface SmokeEffect {
  key: string;
  owner: Side;
  expiresOwnerTurn: number;
  expiresOn: "owner-end";
  sourceAgentId: string;
  sourceSkill: "smoke" | "dark";
}

interface TimedStatusEffect {
  id: string;
  owner: Side;
  targetId: string;
  aimPenalty?: number;
  priorityPenalty?: number;
  consumeOnAttack?: boolean;
}

interface EnemyMemory {
  observer: Side;
  agentId: string;
  region: number;
  waitDirs: number[];
}

interface VisibilityContext {
  actorSide: Side;
  viewerSide: Side;
  allowLastKnown: boolean;
  omniscient?: boolean;
}

interface SkillFx {
  id: string;
  skillId: string;
  label: string;
  owner: Side;
  fromRegion: number;
  targetRegion: number;
  kind: "throw" | "burst" | "scan" | "smoke" | "deploy" | "teleport" | "self";
}

interface PendingMovement {
  agentId: string;
  path: number[];
  nextIndex: number;
  target: number;
  kind: CardKind | "shadow" | "special" | "forced";
  noMidAttack: boolean;
}

interface PendingReengagement {
  agentId: string;
  priority: number;
  canAttack: boolean;
  moveBonus: number;
}

interface PendingContact {
  agentId: string;
  enemyIds: string[];
  priority: number;
  canAttack: boolean;
  moveBonus: number;
  source: "turn-start" | "movement" | "reengagement";
}

interface GroupMovement {
  agentIds: string[];
  nextIndex: number;
  target: number;
  special: "rush" | "cover";
}

interface AftershockEffect {
  id: string;
  owner: Side;
  ownerAgentId: string;
  region: number;
  targetIds: string[];
  readyOnTurn: number;
}

interface TargetingState {
  kind: "skill" | "control" | "special";
  agentId?: string;
  skillId?: string;
  cardId?: string;
  selected?: number[];
  special?: "rush" | "cover";
  origin?: number;
  candidateAgentIds?: string[];
  candidateDeployableIds?: string[];
  targetAgentId?: string;
}

interface TradeState {
  enemyId: string;
  team: Side;
  sourceId: string;
}

interface CombatFighterView {
  id: string;
  name: string;
  kind: "agent" | "turret";
  team: Side;
  role: Role;
  weapon: WeaponId;
  region: number;
  priority: number;
  hpBefore: number;
  hpAfter: number;
  armorBefore: number;
  armorAfter: number;
  shot: ShotResult | null;
}

interface CombatChoice {
  type: "attack" | "retreat" | "advance";
  retreatRegion?: number;
}

interface CombatScene {
  id: string;
  kind: "agent" | "turret";
  deviceId?: string;
  mover: CombatFighterView;
  holder: CombatFighterView;
  range: number;
  waiting: boolean;
  simultaneous: boolean;
  actorId: string;
  firstActorId: string;
  secondActorId: string;
  pendingNextActorId: string | null;
  round: number;
  phase: "encounter" | "choice" | "result" | "tailwind";
  resolved: boolean;
  choices: Record<string, CombatChoice>;
  canMoverAttack: boolean;
  moverAimBonus: number;
  moverMoveBonus: number;
  moverPriorityBase: number;
  moverRetreated: boolean;
  moverAdvanced: boolean;
  evaded: boolean;
  result: string;
  waitDirections: number[];
  tailwindActorId: string | null;
  pendingShotActorId: string | null;
}

interface TeamAnalytics {
  shots: number;
  hits: number;
  headshots: number;
  damage: number;
  kills: number;
  retreats: number;
  cardsUsed: number;
  skillsUsed: number;
}

interface AnalyticsEvent {
  id: string;
  cycle: number;
  side: Side;
  type: "combat" | "card" | "skill" | "objective";
  label: string;
}

interface GameAnalytics {
  attack: TeamAnalytics;
  defense: TeamAnalytics;
  timeline: AnalyticsEvent[];
}

interface GameState {
  matchRound: number;
  cycle: number;
  turnSerial: number;
  teamTurns: Record<Side, number>;
  turnSide: Side;
  actionsUsed: number;
  selectedAgentId: string | null;
  selectedCardId: string | null;
  pendingWait: string | null;
  targeting: TargetingState | null;
  teams: Record<Side, TeamState>;
  spike: SpikeState;
  droppedWeapons: { id: string; region: number; weapon: WeaponId }[];
  deployables: Deployable[];
  fires: ZoneEffect[];
  stims: ZoneEffect[];
  smokes: SmokeEffect[];
  statusEffects: TimedStatusEffect[];
  aftershocks: AftershockEffect[];
  trade: TradeState[];
  combatQueue: CombatScene[];
  pendingMovement: PendingMovement | null;
  pendingReengagements: PendingReengagement[];
  pendingContact: PendingContact | null;
  turnStartContactQueue: string[];
  groupMovement: GroupMovement | null;
  revealedEnemyIds: string[];
  enemyMemories: EnemyMemory[];
  lastSkillFx: SkillFx | null;
  waitCounter: number;
  log: string[];
  winner: Side | null;
  winReason: string | null;
  roundRewardsApplied: boolean;
  analytics: GameAnalytics;
}

const SIDE_LABEL: Record<Side, string> = { attack: "공격팀", defense: "수비팀" };
const ROLE_LABEL: Record<Role, string> = {
  duelist: "타격대",
  initiator: "척후대",
  controller: "전략가",
  sentinel: "감시자",
};

const emptyTeamAnalytics = (): TeamAnalytics => ({
  shots: 0,
  hits: 0,
  headshots: 0,
  damage: 0,
  kills: 0,
  retreats: 0,
  cardsUsed: 0,
  skillsUsed: 0,
});

const createAnalytics = (): GameAnalytics => ({
  attack: emptyTeamAnalytics(),
  defense: emptyTeamAnalytics(),
  timeline: [],
});

const REGIONS: Region[] = [
  { id: 1, name: "공격팀 시작 지점", x: 49.5, y: 90 },
  { id: 2, name: "하단 좌측 분기", x: 24.5, y: 75 },
  { id: 3, name: "폐쇄 구역", x: 8, y: 78 },
  { id: 4, name: "하단 우측 분기", x: 75.5, y: 76 },
  { id: 5, name: "중앙 하부", x: 49, y: 65 },
  { id: 6, name: "중앙 상부", x: 49, y: 49 },
  { id: 7, name: "수비팀 시작 지점", x: 49.5, y: 11 },
  { id: 8, name: "왼쪽 긴 진입로", x: 34, y: 47 },
  { id: 9, name: "왼쪽 사이트 입구", x: 23, y: 47, site: "A" },
  { id: 10, name: "왼쪽 사이트 전방", x: 19, y: 31, site: "A" },
  { id: 11, name: "왼쪽 사이트 후방", x: 8.5, y: 39, site: "A" },
  { id: 12, name: "왼쪽 수비 연결로", x: 16, y: 58 },
  { id: 13, name: "오른쪽 긴 진입로", x: 67.5, y: 50 },
  { id: 14, name: "오른쪽 사이트 입구", x: 80, y: 40, site: "B" },
  { id: 15, name: "오른쪽 사이트 전방", x: 84, y: 25, site: "B" },
  { id: 16, name: "오른쪽 사이트 후방", x: 94, y: 36, site: "B" },
  { id: 17, name: "오른쪽 수비 연결로", x: 84, y: 61 },
];

const EDGES: [number, number][] = [
  [1, 2], [1, 4], [1, 5], [2, 5], [2, 12], [4, 5], [4, 17], [5, 6], [5, 17],
  [6, 8], [6, 13], [7, 10], [7, 13], [8, 9], [8, 10], [9, 10], [9, 12], [10, 11],
  [11, 12], [13, 14], [13, 15], [13, 17], [14, 15], [14, 16], [14, 17], [15, 16],
];

const GRAPH = new Map<number, number[]>();
for (const region of REGIONS) GRAPH.set(region.id, []);
for (const [a, b] of EDGES) {
  GRAPH.get(a)?.push(b);
  GRAPH.get(b)?.push(a);
}

const WEAPONS: Record<WeaponId, Weapon> = {
  classic: { id: "classic", name: "클래식", type: "normal", body: 1, head: 2, price: 0, aim: 0, move: 0, unlock: 1 },
  sheriff: { id: "sheriff", name: "셰리프", type: "normal", body: 2, head: 3, price: 6, aim: 0, move: 0, unlock: 1 },
  bucky: { id: "bucky", name: "버키", type: "shotgun", body: 2, head: 4, price: 8, aim: 0, move: 0, unlock: 2 },
  spectre: { id: "spectre", name: "스펙터", type: "normal", body: 2, head: 3, price: 10, aim: 0, move: 1, unlock: 2 },
  bulldog: { id: "bulldog", name: "불독", type: "normal", body: 2, head: 3, price: 12, aim: 1, move: 0, unlock: 2 },
  outlaw: { id: "outlaw", name: "아웃로", type: "sniper", body: 3, head: 4, price: 14, aim: 0, move: 0, unlock: 2 },
  judge: { id: "judge", name: "저지", type: "shotgun", body: 3, head: 4, price: 16, aim: 0, move: 1, unlock: 3 },
  phantom: { id: "phantom", name: "팬텀", type: "normal", body: 2, head: 3, price: 24, aim: 1, move: 1, unlock: 3 },
  vandal: { id: "vandal", name: "밴달", type: "normal", body: 2, head: 4, price: 24, aim: 1, move: 0, unlock: 3 },
  operator: { id: "operator", name: "오퍼레이터", type: "sniper", body: 4, head: 6, price: 32, aim: 0, move: 0, unlock: 3 },
};

function weaponRuleSummary(weapon: Weapon) {
  const rules: string[] = [];
  if (weapon.aim) rules.push(`상시 에임 +${weapon.aim}`);
  if (weapon.move) rules.push(`상시 무빙 +${weapon.move}`);
  if (weapon.type === "normal") rules.push("사거리 1", "거리 0 에임 +1");
  if (weapon.type === "shotgun") rules.push("사거리 1", "거리 1 에임 -2", "거리 0 에임 +2 · 피해 +1");
  if (weapon.type === "sniper") rules.push("대기 구역 거리 2 지정", "대기 사격 에임 +1", "거리 0 에임 -1");
  return rules.join(" · ");
}

const ARMOR_PRICE: Record<Agent["armorType"], number> = { none: 0, light: 2, regen: 4, heavy: 6 };

const skill = (id: string, name: string, price: string, target: SkillTarget, description: string): SkillDefinition => ({
  id, name, price, target, description,
});

const AGENTS: Record<string, AgentTemplate> = {
  "제트": { name: "제트", role: "duelist", skills: [skill("tailwind", "순풍", "2원 · 1회", "self", "다음 최초 교전의 공격을 회피합니다."), skill("updraft", "상승 기류", "1원 · 2회", "self", "다음 이동 거리와 무빙이 1 증가합니다.")] },
  "레이즈": { name: "레이즈", role: "duelist", skills: [skill("paint", "페인트탄", "2원 · 1회", "adjacent", "인접 구역의 적 모두에게 피해 1, 설치물을 파괴합니다."), skill("blast", "폭발 팩", "1원 · 2회", "adjacent", "인접 구역으로 강제 이동하며 대기를 해제합니다.")] },
  "피닉스": { name: "피닉스", role: "duelist", skills: [skill("curve", "커브볼", "2원 · 1회", "adjacent", "선택 구역의 적과 그 구역을 대기 중인 적의 첫 공격 에임을 3 낮춥니다."), skill("hot", "뜨거운 손", "1원 · 2회", "adjacent", "구역에 다음 턴까지 피해 1의 불길을 만듭니다.")] },
  "네온": { name: "네온", role: "duelist", skills: [skill("gear", "고속 기어", "2원 · 1회", "self", "다음 이동 거리와 무빙이 1 증가합니다."), skill("relay", "릴레이 볼트", "1원 · 2회", "adjacent", "구역 적의 우선도 숫자를 1 높입니다.")] },
  "사이퍼": { name: "사이퍼", role: "sentinel", skills: [skill("trip", "함정 철선", "1원 · 2회", "adjacent", "현재 구역과 인접 구역 사이에 철선을 설치합니다."), skill("camera", "스파이캠", "2원 · 1회", "self", "현재 구역에 주변을 밝히는 카메라를 설치합니다.")] },
  "킬조이": { name: "킬조이", role: "sentinel", skills: [skill("turret", "포탑", "2원 · 1회", "adjacent", "현재 구역에서 선택 방향을 감시하는 포탑을 설치합니다."), skill("alarm", "알람봇", "1원 · 2회", "self", "현재 구역에 탐지·취약 알람봇을 설치합니다.")] },
  "소바": { name: "소바", role: "initiator", skills: [skill("recon", "정찰 화살", "2원 · 1회", "range2", "거리 2 구역과 인접 구역의 적을 탐지합니다."), skill("shock", "충격 화살", "1원 · 2회", "range2", "거리 2 구역의 적 또는 설치물에 피해 1을 줍니다.")] },
  "브리치": { name: "브리치", role: "initiator", skills: [skill("flash", "섬광 폭발", "2원 · 1회", "adjacent", "인접 구역 적의 첫 공격 에임을 3 낮춥니다."), skill("aftershock", "여진", "1원 · 2회", "adjacent", "인접 구역의 적에게 피해 2, 진행 행동을 취소합니다.")] },
  "브림스톤": { name: "브림스톤", role: "controller", skills: [skill("smoke", "공중 연막", "1원 · 2회", "range2", "목표 방향의 첫 연결을 다음 턴까지 차단합니다."), skill("stim", "전투 자극제", "2원 · 1회", "self", "현재 구역 아군의 에임과 우선도를 강화합니다.")] },
  "오멘": { name: "오멘", role: "controller", skills: [skill("dark", "어둠의 장막", "1원 · 2회", "any", "선택 구역의 첫 연결에 전역 연막을 설치합니다."), skill("shadow", "어둠의 발걸음", "2원 · 1회", "range2", "거리 2 이내로 순간이동하고 우선도 4로 교전합니다.")] },
};

const AGENT_ART_KEY: Record<string, string> = {
  "제트": "jett", "레이즈": "raze", "피닉스": "phoenix", "네온": "neon", "사이퍼": "cypher",
  "킬조이": "killjoy", "소바": "sova", "브리치": "breach", "브림스톤": "brimstone", "오멘": "omen",
};

const agentArtClass = (name: string) => `agent-art agent-art-${AGENT_ART_KEY[name] ?? "jett"}`;
const skillArtClass = (id: string) => `skill-art skill-art-${id}`;

const CARD_DATA: Record<CardKind, { name: string; tag: string; description: string }> = {
  basic: { name: "기본 행동", tag: "MOVE", description: "인접 구역 1칸 이동 · 교전 우선도 3 · 이후 한 방향 대기" },
  peek: { name: "피킹", tag: "SCOUT", description: "이번 행동 무빙 +2 · 공격하지 않고 첫 홀드를 빼낸 뒤 후퇴" },
  entry: { name: "엔트리", tag: "BREACH", description: "타격대 전용 · 최대 2칸 · 중간 공격 불가 · 도착 우선도 2" },
  follow: { name: "추종", tag: "FOLLOW", description: "척후대·전략가 전용 · 거리 2 아군 위치까지 합류" },
  control: { name: "지역 장악", tag: "HOLD ×2", description: "감시자 전용 · 현재 구역에서 인접 두 방향 동시 대기" },
};

const SPIKE_STATUS_LABEL: Record<SpikeState["status"], string> = {
  carried: "운반 중",
  dropped: "회수 필요",
  planting: "설치 진행",
  planted: "설치됨",
  half: "반 해체",
  defusing: "최종 해체",
  defused: "해체 완료",
  exploded: "폭발",
};

const MOVEMENT_LABEL: Record<PendingMovement["kind"], string> = {
  basic: "기본 이동",
  peek: "피킹",
  entry: "엔트리",
  follow: "추종",
  control: "지역 장악",
  shadow: "어둠의 발걸음",
  special: "특수 이동",
  forced: "강제 이동",
};

const ROLE_STATS: Record<Role, { aim: number; move: number }> = {
  duelist: { aim: 5, move: 2 },
  initiator: { aim: 6, move: 1 },
  controller: { aim: 6, move: 1 },
  sentinel: { aim: 6, move: 1 },
};

const roleCards = (role: Role): CardKind[] => {
  if (role === "duelist") return ["peek", "basic", "entry"];
  if (role === "sentinel") return ["basic", "basic", "control"];
  return ["basic", "basic", "follow"];
};

function seededShuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  let value = seed;
  for (let i = next.length - 1; i > 0; i -= 1) {
    value = (value * 9301 + 49297) % 233280;
    const j = Math.floor((value / 233280) * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function createAgent(name: string, team: Side): Agent {
  const template = AGENTS[name];
  const skills: Record<string, number> = {};
  template.skills.forEach((item) => { skills[item.id] = 0; });
  return {
    id: `${team}-${name}`,
    name,
    role: template.role,
    team,
    region: team === "attack" ? 1 : 7,
    hp: 2,
    armor: 0,
    armorType: "none",
    armorDamaged: false,
    alive: true,
    weapon: "classic",
    extraActions: 0,
    waitDirs: [],
    waitStamp: 0,
    waitOrders: {},
    detected: false,
    skills,
    status: { aimPenalty: 0, priorityPenalty: 0, moveBonus: 0, moveRangeBonus: 0, evadeReady: false, vulnerable: false, ignoreGround: false, highGear: false },
  };
}

function createTeam(side: Side, names: string[], seed: number): TeamState {
  const agents = names.map((name) => createAgent(name, side));
  const cards = agents.flatMap((agent) => roleCards(agent.role).map((kind, index) => ({
    id: `${side}-${agent.name}-${kind}-${index}`,
    kind,
    source: agent.name,
    used: false,
  })));
  const shuffled = seededShuffle(cards, seed);
  return {
    side,
    agents,
    hand: shuffled.slice(0, 5),
    deck: shuffled.slice(5),
    discard: [],
    funds: 25,
    rushUsed: false,
    cover: false,
    buyLocked: false,
    buyStartFunds: 25,
    score: 0,
    lossStreak: 0,
    killsThisRound: 0,
    plantsThisRound: 0,
    defusesThisRound: 0,
  };
}

function createInitialGame(
  attackNames = ["제트", "레이즈", "소바", "브리치", "브림스톤"],
  defenseNames = ["피닉스", "네온", "사이퍼", "킬조이", "오멘"],
): GameState {
  const attack = createTeam("attack", attackNames, 17);
  const defense = createTeam("defense", defenseNames, 29);
  return {
    matchRound: 1,
    cycle: 1,
    turnSerial: 1,
    teamTurns: { attack: 0, defense: 1 },
    turnSide: "defense",
    actionsUsed: 0,
    selectedAgentId: defense.agents[0].id,
    selectedCardId: null,
    pendingWait: null,
    targeting: null,
    teams: { attack, defense },
    spike: { status: "carried", carrierId: attack.agents[0].id, region: null, actorId: null, startCycle: null, installedCycle: null, halfCycle: null, explosion: 8 },
    droppedWeapons: [],
    deployables: [],
    fires: [],
    stims: [],
    smokes: [],
    statusEffects: [],
    aftershocks: [],
    trade: [],
    combatQueue: [],
    pendingMovement: null,
    pendingReengagements: [],
    pendingContact: null,
    turnStartContactQueue: [],
    groupMovement: null,
    revealedEnemyIds: [],
    enemyMemories: [],
    lastSkillFx: null,
    waitCounter: 0,
    log: ["수비팀이 먼저 행동합니다.", "작전 개시 — 손패에서 카드 3장을 사용하세요."],
    winner: null,
    winReason: null,
    roundRewardsApplied: false,
    analytics: createAnalytics(),
  };
}

function roundIncome(team: TeamState, won: boolean, matchRound: number) {
  const nextLossStreak = won ? 0 : team.lossStreak + 1;
  const resultIncome = matchRound === 1
    ? won ? 50 : 40
    : won ? 65 : nextLossStreak >= 3 ? 55 : nextLossStreak === 2 ? 50 : 45;
  const bonus = team.killsThisRound * 5 + team.plantsThisRound * 5 + team.defusesThisRound * 5;
  return { resultIncome, bonus, total: resultIncome + bonus, nextLossStreak };
}

function rebuildDeck(team: TeamState, seed: number) {
  const cards = team.agents.flatMap((agent) => roleCards(agent.role).map((kind, index) => ({
    id: `${team.side}-r-${seed}-${agent.name}-${kind}-${index}`,
    kind,
    source: agent.name,
    used: false,
  })));
  const shuffled = seededShuffle(cards, seed);
  team.hand = shuffled.slice(0, 5);
  team.deck = shuffled.slice(5);
  team.discard = [];
}

function resetAgentForRound(agent: Agent, side: Side, economyReset: boolean) {
  const survived = agent.alive;
  if (economyReset || !survived) agent.weapon = "classic";
  const preserveArmor = !economyReset && survived && agent.armorType !== "regen" && !agent.armorDamaged;
  if (!preserveArmor) {
    agent.armor = 0;
    agent.armorType = "none";
  }
  agent.armorDamaged = false;
  agent.team = side;
  agent.region = side === "attack" ? 1 : 7;
  agent.hp = 2;
  agent.alive = true;
  agent.extraActions = 0;
  clearWait(agent);
  agent.detected = false;
  Object.keys(agent.skills).forEach((skillId) => { agent.skills[skillId] = 0; });
  agent.status = { aimPenalty: 0, priorityPenalty: 0, moveBonus: 0, moveRangeBonus: 0, evadeReady: false, vulnerable: false, ignoreGround: false, highGear: false };
}

function resetTeamForRound(team: TeamState, side: Side, matchRound: number, economyReset: boolean) {
  team.side = side;
  if (economyReset) {
    team.funds = 25;
    team.lossStreak = 0;
  }
  team.agents.forEach((agent) => resetAgentForRound(agent, side, economyReset));
  team.rushUsed = false;
  team.cover = false;
  team.buyLocked = false;
  team.buyStartFunds = team.funds;
  team.killsThisRound = 0;
  team.plantsThisRound = 0;
  team.defusesThisRound = 0;
  rebuildDeck(team, matchRound * 101 + (side === "attack" ? 17 : 29));
}

function prepareNextRoundState(game: GameState, swapSides: boolean) {
  if (!game.winner) return;
  const winner = game.winner;
  const loser = otherSide(winner);
  if (!game.roundRewardsApplied) {
    const winnerIncome = roundIncome(game.teams[winner], true, game.matchRound);
    const loserIncome = roundIncome(game.teams[loser], false, game.matchRound);
    game.teams[winner].funds = Math.min(180, game.teams[winner].funds + winnerIncome.total);
    game.teams[loser].funds = Math.min(180, game.teams[loser].funds + loserIncome.total);
    game.teams[winner].score += 1;
    game.teams[winner].lossStreak = 0;
    game.teams[loser].lossStreak = loserIncome.nextLossStreak;
    game.roundRewardsApplied = true;
  }

  if (swapSides) {
    const previousAttack = game.teams.attack;
    game.teams.attack = game.teams.defense;
    game.teams.defense = previousAttack;
    game.matchRound = 1;
  } else game.matchRound += 1;

  resetTeamForRound(game.teams.attack, "attack", game.matchRound, swapSides);
  resetTeamForRound(game.teams.defense, "defense", game.matchRound, swapSides);
  game.cycle = 1;
  game.turnSerial = 1;
  game.teamTurns = { attack: 0, defense: 1 };
  game.turnSide = "defense";
  game.actionsUsed = 0;
  game.selectedAgentId = game.teams.defense.agents[0]?.id ?? null;
  game.selectedCardId = null;
  game.pendingWait = null;
  game.targeting = null;
  game.spike = { status: "carried", carrierId: game.teams.attack.agents[0]?.id ?? null, region: null, actorId: null, startCycle: null, installedCycle: null, halfCycle: null, explosion: 8 };
  game.droppedWeapons = [];
  game.deployables = [];
  game.fires = [];
  game.stims = [];
  game.smokes = [];
  game.statusEffects = [];
  game.aftershocks = [];
  game.trade = [];
  game.combatQueue = [];
  game.pendingMovement = null;
  game.pendingReengagements = [];
  game.pendingContact = null;
  game.turnStartContactQueue = [];
  game.groupMovement = null;
  game.revealedEnemyIds = [];
  game.enemyMemories = [];
  game.lastSkillFx = null;
  game.waitCounter = 0;
  game.log = [`매치 ${game.matchRound}라운드 준비. 수비팀 구매부터 시작합니다.`];
  game.winner = null;
  game.winReason = null;
  game.roundRewardsApplied = false;
  game.analytics = createAnalytics();
}

const otherSide = (side: Side): Side => side === "attack" ? "defense" : "attack";
const edgeKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).join("-");

function getAgent(game: GameState, id: string | null | undefined): Agent | null {
  if (!id) return null;
  return [...game.teams.attack.agents, ...game.teams.defense.agents].find((agent) => agent.id === id) ?? null;
}

function shortestPath(start: number, end: number): number[] {
  if (start === end) return [start];
  const queue: number[][] = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const next of GRAPH.get(last) ?? []) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === end) return nextPath;
      visited.add(next);
      queue.push(nextPath);
    }
  }
  return [];
}

const distance = (a: number, b: number) => {
  const path = shortestPath(a, b);
  return path.length ? path.length - 1 : 99;
};

function isSmokeBlocked(game: GameState, a: number, b: number) {
  return game.smokes.some((smoke) => smoke.key === edgeKey(a, b));
}

function canUseCard(card: ActionCard, agent: Agent) {
  if (!agent.alive) return false;
  if (card.kind === "entry") return agent.role === "duelist";
  if (card.kind === "follow") return agent.role === "initiator" || agent.role === "controller";
  if (card.kind === "control") return agent.role === "sentinel";
  return true;
}

function addLog(game: GameState, message: string) {
  game.log = [message, ...game.log].slice(0, 16);
}

function addAnalyticsEvent(game: GameState, side: Side, type: AnalyticsEvent["type"], label: string) {
  game.analytics.timeline = [
    { id: `analysis-${game.turnSerial}-${game.analytics.timeline.length}-${label}`, cycle: game.cycle, side, type, label },
    ...game.analytics.timeline,
  ].slice(0, 36);
}

function recordShot(game: GameState, side: Side, shot: ShotResult, label: string) {
  const stats = game.analytics[side];
  stats.shots += 1;
  if (shot.hit) stats.hits += 1;
  if (shot.head) stats.headshots += 1;
  addAnalyticsEvent(game, side, "combat", `${label} · ${shot.hit ? shot.head ? "헤드샷" : "명중" : "빗나감"}`);
}

function addTrade(game: GameState, trade: TradeState) {
  if (game.trade.some((item) => item.enemyId === trade.enemyId && item.team === trade.team)) return;
  game.trade.push(trade);
}

function rememberEnemy(game: GameState, observer: Side, enemy: Agent) {
  if (!enemy.alive || enemy.team === observer) return;
  game.enemyMemories = game.enemyMemories.filter((memory) => !(memory.observer === observer && memory.agentId === enemy.id));
  game.enemyMemories.push({ observer, agentId: enemy.id, region: enemy.region, waitDirs: [...enemy.waitDirs] });
  if (!game.revealedEnemyIds.includes(enemy.id)) game.revealedEnemyIds.push(enemy.id);
}

function clearWait(agent: Agent) {
  agent.waitDirs = [];
  agent.waitOrders = {};
}

function setWait(game: GameState, agent: Agent, directions: number[]) {
  game.waitCounter += 1;
  agent.waitDirs = [...directions];
  agent.waitStamp = game.waitCounter;
  agent.waitOrders = Object.fromEntries(directions.map((direction) => [direction, game.waitCounter]));
}

function waitTargetsFor(agent: Agent) {
  const maxRange = WEAPONS[agent.weapon].type === "sniper" ? 2 : 1;
  return REGIONS
    .filter((region) => {
      const range = distance(agent.region, region.id);
      return range >= 1 && range <= maxRange;
    })
    .map((region) => region.id);
}

function isWaitPathSmokeBlocked(game: GameState, from: number, to: number) {
  const path = shortestPath(from, to);
  return path.slice(0, -1).some((region, index) => isSmokeBlocked(game, region, path[index + 1]));
}

function roll(max: number) {
  return Math.floor(Math.random() * Math.max(1, max)) + 1;
}

function finalStats(game: GameState, agent: Agent) {
  const base = ROLE_STATS[agent.role];
  const weapon = WEAPONS[agent.weapon];
  const stimmed = game.stims.some((zone) => zone.owner === agent.team && zone.region === agent.region);
  const timed = game.statusEffects.filter((effect) => effect.targetId === agent.id);
  const timedAimPenalty = timed.reduce((sum, effect) => sum + (effect.aimPenalty ?? 0), 0);
  const timedPriorityPenalty = timed.reduce((sum, effect) => sum + (effect.priorityPenalty ?? 0), 0);
  return {
    aim: Math.max(1, base.aim + weapon.aim - agent.status.aimPenalty - timedAimPenalty + (stimmed ? 1 : 0)),
    move: Math.max(1, base.move + weapon.move + agent.status.moveBonus),
    priorityBoost: stimmed ? 1 : 0,
    priorityPenalty: agent.status.priorityPenalty + timedPriorityPenalty,
  };
}

interface ShotResult {
  hit: boolean;
  head: boolean;
  damage: number;
  aimRoll: number;
  moveRoll: number;
  aimSize: number;
  moveSize: number;
}

function makeShot(game: GameState, attacker: Agent, defender: Agent, range: number, waiting: boolean, aimBonus: number, defenderMoveBonus: number): ShotResult {
  const weapon = WEAPONS[attacker.weapon];
  const stats = finalStats(game, attacker);
  let aim = stats.aim + aimBonus + (defender.detected ? 1 : 0);
  if (weapon.type === "normal" && range === 0) aim += 1;
  if (weapon.type === "shotgun") aim += range === 0 ? 2 : -2;
  if (weapon.type === "sniper" && waiting) aim += 1;
  if (weapon.type === "sniper" && range === 0) aim -= 1;
  if (weapon.type !== "sniper" && range >= 2) aim -= 1;
  aim = Math.max(1, aim);
  const move = Math.max(1, finalStats(game, defender).move + defenderMoveBonus);
  const aimRoll = roll(aim);
  const moveRoll = roll(move);
  const value = aimRoll - moveRoll;
  const head = value >= 5;
  let damage = value <= 0 ? 0 : head ? weapon.head : weapon.body;
  if (weapon.type === "shotgun" && range === 0 && damage > 0) damage += 1;
  if (defender.status.vulnerable && damage > 0) {
    damage += 1;
    defender.status.vulnerable = false;
  }
  game.statusEffects = game.statusEffects.filter((effect) => !(effect.targetId === attacker.id && effect.consumeOnAttack));
  return { hit: value > 0, head, damage, aimRoll, moveRoll, aimSize: aim, moveSize: move };
}

function cancelProgress(game: GameState, agent: Agent) {
  if (game.spike.actorId !== agent.id) return;
  if (game.spike.status === "planting") {
    game.spike.status = "carried";
    game.spike.carrierId = agent.id;
    game.spike.region = null;
    addLog(game, `${agent.name}의 스파이크 설치가 취소됐습니다.`);
  } else if (game.spike.status === "defusing") {
    game.spike.status = "half";
    game.spike.actorId = null;
    addLog(game, `${agent.name}의 최종 해체가 취소됐습니다. 반 해체는 유지됩니다.`);
  }
}

function isChanneling(game: GameState, agent: Agent) {
  return game.spike.actorId === agent.id && (game.spike.status === "planting" || game.spike.status === "defusing");
}

function applyDamage(game: GameState, attacker: Agent | null, defender: Agent, damage: number, label: string) {
  if (damage <= 0 || !defender.alive) return;
  if (defender.status.vulnerable) {
    damage += 1;
    defender.status.vulnerable = false;
  }
  const durabilityBefore = defender.hp + defender.armor;
  const armorDamage = Math.min(defender.armor, damage);
  defender.armor -= armorDamage;
  if (armorDamage > 0) defender.armorDamaged = true;
  defender.hp -= damage - armorDamage;
  if (attacker) game.analytics[attacker.team].damage += Math.min(durabilityBefore, damage);
  addLog(game, `${label} — ${defender.name} 피해 ${damage} (체력 ${Math.max(0, defender.hp)} / 방어 ${defender.armor})`);
  if (defender.hp > 0) return;
  defender.hp = 0;
  defender.alive = false;
  clearWait(defender);
  if (game.pendingMovement?.agentId === defender.id) game.pendingMovement = null;
  if (game.pendingWait === defender.id) game.pendingWait = null;
  cancelProgress(game, defender);
  if (defender.weapon !== "classic") {
    game.droppedWeapons.push({ id: `drop-${Date.now()}-${defender.id}`, region: defender.region, weapon: defender.weapon });
  }
  if (attacker) {
    game.teams[attacker.team].killsThisRound += 1;
    game.analytics[attacker.team].kills += 1;
    addAnalyticsEvent(game, attacker.team, "combat", `${attacker.name}이 ${defender.name} 제거`);
  }
  if (game.spike.carrierId === defender.id && game.spike.status === "carried") {
    game.spike = { ...game.spike, status: "dropped", carrierId: null, region: defender.region, actorId: null };
    addLog(game, `스파이크가 ${REGIONS.find((region) => region.id === defender.region)?.name}에 떨어졌습니다.`);
  }
  addLog(game, `${defender.name} 제거.`);
  if (attacker && defender.team === game.turnSide) {
    addTrade(game, { enemyId: attacker.id, team: defender.team, sourceId: defender.id });
    addLog(game, `${attacker.name}에게 트레이드 표식이 생겼습니다.`);
  }
}

function checkWinner(game: GameState) {
  const attackAlive = game.teams.attack.agents.some((agent) => agent.alive);
  const defenseAlive = game.teams.defense.agents.some((agent) => agent.alive);
  const installed = ["planted", "half", "defusing"].includes(game.spike.status);
  if (!defenseAlive) {
    game.winner = "attack";
    game.winReason = "수비팀 전멸";
  } else if (!attackAlive && !installed) {
    game.winner = "defense";
    game.winReason = "설치 전 공격팀 전멸";
  }
}

function resolveEngagement(game: GameState, mover: Agent, enemy: Agent, moverPriority: number, canAttack: boolean, moverMoveBonus: number, waiting: boolean) {
  if (!mover.alive || !enemy.alive) return;
  const range = distance(mover.region, enemy.region);
  if (range > 0) {
    const path = shortestPath(enemy.region, mover.region);
    if (path.length > 1 && isSmokeBlocked(game, path[0], path[1]) && !enemy.detected && !mover.detected) return;
  }

  const observedEnemy = mover.team === game.turnSide ? enemy : mover;
  rememberEnemy(game, game.turnSide, observedEnemy);
  const revealedWaitDirs = [...enemy.waitDirs];
  const moverBefore = { hp: mover.hp, armor: mover.armor };
  const enemyBefore = { hp: enemy.hp, armor: enemy.armor };

  let tradeAim = 0;
  let tradePriority = 0;
  const tradeIndex = game.trade.findIndex((trade) => trade.enemyId === enemy.id && trade.team === mover.team && trade.sourceId !== mover.id);
  if (tradeIndex >= 0) {
    tradeAim = 1;
    tradePriority = 1;
    game.trade.splice(tradeIndex, 1);
    addLog(game, `${mover.name}이 ${enemy.name}의 트레이드 표식을 소비합니다. 에임 +1 / 우선도 -1.`);
  }

  const moverStats = finalStats(game, mover);
  const enemyStats = finalStats(game, enemy);
  const moverPrio = Math.max(1, moverPriority + moverStats.priorityPenalty - moverStats.priorityBoost - tradePriority);
  const enemyPrio = Math.max(1, (waiting ? 1 : 3) + enemyStats.priorityPenalty - enemyStats.priorityBoost);
  const simultaneous = moverPrio === enemyPrio;
  const firstActorId = moverPrio <= enemyPrio ? mover.id : enemy.id;
  const secondActorId = firstActorId === mover.id ? enemy.id : mover.id;
  addLog(game, `지속 교전 시작: ${mover.name}(우선 ${moverPrio}) ↔ ${enemy.name}(우선 ${enemyPrio}).`);
  game.combatQueue.push({
    id: `combat-${Date.now()}-${game.combatQueue.length}`,
    kind: "agent",
    mover: { id: mover.id, name: mover.name, kind: "agent", team: mover.team, role: mover.role, weapon: mover.weapon, region: mover.region, priority: moverPrio, hpBefore: moverBefore.hp, hpAfter: mover.hp, armorBefore: moverBefore.armor, armorAfter: mover.armor, shot: null },
    holder: { id: enemy.id, name: enemy.name, kind: "agent", team: enemy.team, role: enemy.role, weapon: enemy.weapon, region: enemy.region, priority: enemyPrio, hpBefore: enemyBefore.hp, hpAfter: enemy.hp, armorBefore: enemyBefore.armor, armorAfter: enemy.armor, shot: null },
    range,
    waiting,
    simultaneous,
    actorId: firstActorId,
    firstActorId,
    secondActorId,
    pendingNextActorId: null,
    round: 1,
    phase: "encounter",
    resolved: false,
    choices: {},
    canMoverAttack: canAttack,
    moverAimBonus: tradeAim,
    moverMoveBonus,
    moverPriorityBase: moverPriority,
    moverRetreated: false,
    moverAdvanced: false,
    evaded: false,
    result: `${mover.name}과 ${enemy.name}이 ${regionName(mover.region)} 전선에서 마주쳤습니다.`,
    waitDirections: revealedWaitDirs,
    tailwindActorId: null,
    pendingShotActorId: null,
  });
}

function queueTurretEncounter(game: GameState, mover: Agent, turret: Deployable) {
  const owner = getAgent(game, turret.ownerAgentId);
  const movement = game.pendingMovement?.agentId === mover.id ? game.pendingMovement : null;
  const profile = movement ? movementCombatProfile(movement) : { priority: 3, canAttack: true, moveBonus: 0 };
  const turretId = `turret-${turret.id}`;
  game.combatQueue.push({
    id: `combat-turret-${Date.now()}-${game.combatQueue.length}`,
    kind: "turret",
    deviceId: turret.id,
    mover: { id: mover.id, name: mover.name, kind: "agent", team: mover.team, role: mover.role, weapon: mover.weapon, region: mover.region, priority: profile.priority, hpBefore: mover.hp, hpAfter: mover.hp, armorBefore: mover.armor, armorAfter: mover.armor, shot: null },
    holder: { id: turretId, name: `${owner?.name ?? "킬조이"} 포탑`, kind: "turret", team: turret.owner, role: "sentinel", weapon: "classic", region: turret.region, priority: 2, hpBefore: 1, hpAfter: 1, armorBefore: 0, armorAfter: 0, shot: null },
    range: distance(turret.region, mover.region),
    waiting: true,
    simultaneous: false,
    actorId: turretId,
    firstActorId: turretId,
    secondActorId: mover.id,
    pendingNextActorId: null,
    round: 1,
    phase: "encounter",
    resolved: false,
    choices: {},
    canMoverAttack: profile.canAttack,
    moverAimBonus: 0,
    moverMoveBonus: profile.moveBonus,
    moverPriorityBase: profile.priority,
    moverRetreated: false,
    moverAdvanced: false,
    evaded: false,
    result: `${mover.name}이 ${regionName(turret.to ?? mover.region)} 포탑 감시 구역에 진입했습니다.`,
    waitDirections: turret.to === undefined ? [] : [turret.to],
    tailwindActorId: null,
    pendingShotActorId: null,
  });
  addLog(game, `포탑 교전 시작: ${owner?.name ?? "킬조이"} 포탑(우선 2) → ${mover.name}.`);
}

function triggerHazards(game: GameState, agent: Agent, from: number, to: number): boolean {
  const enemy = otherSide(agent.team);
  let stopped = false;
  const fire = game.fires.find((zone) => zone.owner === enemy && zone.region === to);
  if (fire) applyDamage(game, getAgent(game, fire.ownerAgentId), agent, 1, "불길 진입");

  const trip = game.deployables.find((item) => item.kind === "trip" && item.owner === enemy && item.region === from && item.to === to)
    ?? game.deployables.find((item) => item.kind === "trip" && item.owner === enemy && item.region === to && item.to === from);
  if (trip) {
    if (agent.status.ignoreGround) {
      agent.status.ignoreGround = false;
      addLog(game, `${agent.name}이 상승 기류로 함정 철선을 무시했습니다.`);
    } else {
      game.deployables = game.deployables.filter((item) => item.id !== trip.id);
      agent.detected = true;
      agent.status.moveBonus -= 1;
      stopped = true;
      addLog(game, `${agent.name}이 함정 철선에 걸려 이동을 멈췄습니다. 탐지 / 무빙 -1.`);
    }
  }

  const alarm = game.deployables.find((item) => item.kind === "alarm" && item.owner === enemy && item.region === to);
  if (alarm) {
    if (agent.status.ignoreGround) {
      agent.status.ignoreGround = false;
      addLog(game, `${agent.name}이 상승 기류로 알람봇을 무시했습니다.`);
    } else {
      game.deployables = game.deployables.filter((item) => item.id !== alarm.id);
      agent.detected = true;
      agent.status.vulnerable = true;
      addLog(game, `${agent.name}이 알람봇에 탐지되어 다음 피해가 +1 됩니다.`);
    }
  }

  const turret = game.deployables.find((item) => item.kind === "turret" && item.owner === enemy && item.to === to);
  if (turret) {
    if (agent.status.ignoreGround) {
      agent.status.ignoreGround = false;
      addLog(game, `${agent.name}이 상승 기류로 포탑의 공격을 무시했습니다.`);
    } else {
      queueTurretEncounter(game, agent, turret);
    }
  }
  return stopped;
}

function watchersFor(game: GameState, mover: Agent): Agent[] {
  const enemies = game.teams[otherSide(mover.team)].agents.filter((agent) => agent.alive);
  return enemies.filter((enemy) => {
    const path = shortestPath(enemy.region, mover.region);
    if (path.length < 2) return false;
    const maxRange = WEAPONS[enemy.weapon].type === "sniper" ? 2 : 1;
    const smokeAllowsDetectedShot = !isWaitPathSmokeBlocked(game, enemy.region, mover.region) || enemy.detected || mover.detected;
    return path.length - 1 <= maxRange && enemy.waitDirs.includes(mover.region) && smokeAllowsDetectedShot;
  }).sort((a, b) => {
    return (a.waitOrders[mover.region] ?? a.waitStamp) - (b.waitOrders[mover.region] ?? b.waitStamp);
  });
}

function movementCombatProfile(movement: PendingMovement) {
  const isFinal = movement.nextIndex >= movement.path.length;
  return {
    canAttack: movement.kind === "peek" ? false : movement.kind === "entry" || movement.noMidAttack ? isFinal : true,
    priority: movement.kind === "entry" && isFinal ? 2 : movement.kind === "shadow" ? 4 : 3,
    moveBonus: (movement.kind === "entry" ? 1 : 0) + (movement.kind === "peek" ? 2 : 0),
  };
}

function queueCurrentEncounter(
  game: GameState,
  agent: Agent,
  priority: number,
  canAttack: boolean,
  moveBonus: number,
  allowOptional = true,
  source: PendingContact["source"] = "movement",
): boolean {
  const watchers = watchersFor(game, agent);
  const sameRegionEnemies = game.teams[otherSide(agent.team)].agents
    .filter((enemy) => enemy.alive && enemy.region === agent.region && !watchers.some((watcher) => watcher.id === enemy.id));
  const mandatoryEnemy = [...watchers, ...sameRegionEnemies][0];
  if (mandatoryEnemy) {
    const waiting = watchers.some((watcher) => watcher.id === mandatoryEnemy.id)
      || (mandatoryEnemy.region === agent.region && mandatoryEnemy.waitDirs.length > 0);
    resolveEngagement(game, agent, mandatoryEnemy, priority, canAttack, moveBonus, waiting);
    return game.combatQueue.length > 0;
  }

  if (!allowOptional || agent.team !== game.turnSide || game.pendingContact) return false;
  const optionalEnemies = game.teams[otherSide(agent.team)].agents
    .filter((enemy) => {
      if (!enemy.alive || enemy.region === agent.region || watchers.some((watcher) => watcher.id === enemy.id)) return false;
      const path = shortestPath(agent.region, enemy.region);
      if (path.length !== 2) return false;
      return !isSmokeBlocked(game, path[0], path[1]) || agent.detected || enemy.detected;
    })
    .sort((a, b) => a.region - b.region);
  if (!optionalEnemies.length) return false;
  optionalEnemies.forEach((enemy) => rememberEnemy(game, game.turnSide, enemy));
  game.pendingContact = {
    agentId: agent.id,
    enemyIds: optionalEnemies.map((enemy) => enemy.id),
    priority,
    canAttack,
    moveBonus,
    source,
  };
  addLog(game, `${agent.name}이 거리 1에서 적을 발견했습니다. 카드 소모 없이 교전 여부를 선택하세요.`);
  return true;
}

function queueNextTurnStartContact(game: GameState) {
  if (game.combatQueue.length || game.pendingContact || game.winner) return;
  while (game.turnStartContactQueue.length) {
    const agent = getAgent(game, game.turnStartContactQueue.shift());
    if (!agent?.alive || agent.team !== game.turnSide) continue;
    if (queueCurrentEncounter(game, agent, 3, true, 0, true, "turn-start")) return;
  }
}

function resumeAfterSkippedContact(game: GameState, contact: PendingContact) {
  if (contact.source === "turn-start") {
    queueNextTurnStartContact(game);
    return;
  }
  if (game.pendingMovement?.agentId === contact.agentId) continuePendingMovement(game);
  if (!game.combatQueue.length && !game.pendingMovement) continueGroupMovement(game);
}

function acceptPendingContact(game: GameState, enemyId: string) {
  const contact = game.pendingContact;
  const agent = getAgent(game, contact?.agentId);
  const enemy = getAgent(game, enemyId);
  if (!contact) return;
  game.pendingContact = null;
  if (!agent?.alive || !enemy?.alive || agent.team !== game.turnSide || !contact.enemyIds.includes(enemy.id) || distance(agent.region, enemy.region) !== 1) {
    resumeAfterSkippedContact(game, contact);
    return;
  }
  resolveEngagement(game, agent, enemy, contact.priority, contact.canAttack, contact.moveBonus, false);
  if (!game.combatQueue.length) resumeAfterSkippedContact(game, contact);
}

function declinePendingContact(game: GameState) {
  const contact = game.pendingContact;
  if (!contact) return;
  game.pendingContact = null;
  const agent = getAgent(game, contact.agentId);
  addLog(game, `${agent?.name ?? "현재 요원"}이 거리 1 교전을 시작하지 않았습니다.`);
  resumeAfterSkippedContact(game, contact);
}

function finishMovement(game: GameState, agent: Agent, origin: number, stopped = false) {
  game.pendingMovement = null;
  agent.status.moveBonus = 0;
  agent.status.moveRangeBonus = 0;
  agent.status.ignoreGround = false;
  agent.status.highGear = false;
  agent.status.evadeReady = false;
  if (agent.alive) addLog(game, stopped
    ? `${agent.name}의 이동이 ${regionName(agent.region)}에서 중단되었습니다.`
    : `${agent.name} 이동 완료: ${regionName(origin)} → ${regionName(agent.region)}`);
}

function continuePendingMovement(game: GameState) {
  if (game.pendingContact || game.combatQueue.length) return;
  const movement = game.pendingMovement;
  const agent = getAgent(game, movement?.agentId);
  if (!movement || !agent?.alive || game.winner) {
    game.pendingMovement = null;
    return;
  }
  const origin = movement.path[0];
  while (movement.nextIndex < movement.path.length && agent.alive && !game.winner) {
    const from = agent.region;
    agent.region = movement.path[movement.nextIndex];
    movement.nextIndex += 1;
    const combatCountBeforeHazards = game.combatQueue.length;
    const stopped = triggerHazards(game, agent, from, agent.region);
    if (!agent.alive) {
      finishMovement(game, agent, origin, true);
      checkWinner(game);
      return;
    }
    if (game.combatQueue.length > combatCountBeforeHazards) {
      addLog(game, `${agent.name}의 이동이 포탑 교전 지점에서 일시 정지되었습니다.`);
      if (stopped) movement.nextIndex = movement.path.length;
      return;
    }
    const profile = movementCombatProfile(movement);
    if (queueCurrentEncounter(game, agent, profile.priority, profile.canAttack, profile.moveBonus, true, "movement")) {
      addLog(game, `${agent.name}의 이동이 교전 지점에서 일시 정지되었습니다.`);
      if (stopped) movement.nextIndex = movement.path.length;
      return;
    }
    if (stopped) {
      finishMovement(game, agent, origin, true);
      return;
    }
  }
  finishMovement(game, agent, origin);
}

function moveAgent(game: GameState, agent: Agent, target: number, kind: CardKind | "shadow" | "special" | "forced") {
  const path = shortestPath(agent.region, target);
  if (path.length < 2) return;
  clearWait(agent);
  cancelProgress(game, agent);
  game.pendingMovement = { agentId: agent.id, path, nextIndex: 1, target, kind, noMidAttack: agent.status.highGear };
  continuePendingMovement(game);
}

function continueGroupMovement(game: GameState) {
  const group = game.groupMovement;
  if (!group || game.combatQueue.length || game.pendingContact || game.pendingMovement || game.winner) return;
  while (group.nextIndex < group.agentIds.length) {
    const agent = getAgent(game, group.agentIds[group.nextIndex]);
    group.nextIndex += 1;
    if (!agent?.alive) continue;
    moveAgent(game, agent, group.target, "special");
    if (game.combatQueue.length || game.pendingMovement) return;
  }
  addLog(game, `${group.special === "rush" ? "러쉬" : "커버"} 단체 이동이 모두 끝났습니다.`);
  game.groupMovement = null;
}

function drawFive(team: TeamState, seed: number) {
  const discarding = team.hand.map((card) => ({ ...card, used: false, committedAgentId: undefined }));
  team.discard.push(...discarding);
  team.hand = [];
  while (team.hand.length < 5) {
    if (!team.deck.length) {
      team.deck = seededShuffle(team.discard.map((card) => ({ ...card, used: false, committedAgentId: undefined })), seed + team.discard.length);
      team.discard = [];
    }
    const card = team.deck.shift();
    if (!card) break;
    team.hand.push(card);
  }
}

function playCard(game: GameState, card: ActionCard, agent: Agent) {
  const handCard = game.teams[game.turnSide].hand.find((item) => item.id === card.id);
  const alreadyCommitted = !!handCard?.used;
  if (handCard) {
    handCard.used = true;
    handCard.committedAgentId = agent.id;
  }
  if (!alreadyCommitted) {
    agent.extraActions += 1;
    game.actionsUsed += 1;
    game.analytics[agent.team].cardsUsed += 1;
    addAnalyticsEvent(game, agent.team, "card", `${agent.name} · ${CARD_DATA[card.kind].name}`);
  }
  game.teams[game.turnSide].buyLocked = true;
  game.selectedCardId = null;
  game.targeting = null;
  addLog(game, `${agent.name}이 ${CARD_DATA[card.kind].name} 사용${alreadyCommitted ? " · 사전 추가행동 소모 완료" : " · 추가행동 +1"}.`);
}

function applyActionStartFire(game: GameState, agent: Agent): boolean {
  const fire = game.fires.find((zone) => zone.owner !== agent.team && zone.region === agent.region);
  if (!fire) return true;
  applyDamage(game, getAgent(game, fire.ownerAgentId), agent, 1, "불길에서 행동 시작");
  checkWinner(game);
  return agent.alive;
}

function cardTargets(game: GameState, agent: Agent, card: ActionCard): number[] {
  const rangeBonus = agent.status.moveRangeBonus;
  if (card.kind === "basic" || card.kind === "peek") return REGIONS
    .filter((region) => distance(agent.region, region.id) > 0 && distance(agent.region, region.id) <= 1 + rangeBonus)
    .map((region) => region.id);
  if (card.kind === "entry") return REGIONS.filter((region) => distance(agent.region, region.id) > 0 && distance(agent.region, region.id) <= 2 + rangeBonus).map((region) => region.id);
  if (card.kind === "follow") {
    return [...new Set(game.teams[agent.team].agents.filter((ally) => ally.alive && ally.id !== agent.id && distance(agent.region, ally.region) <= 2).map((ally) => ally.region))];
  }
  if (card.kind === "control") return GRAPH.get(agent.region) ?? [];
  return [];
}

function observedRegions(game: GameState, observer: Side): Set<number> {
  const visible = new Set<number>();
  const team = game.teams[observer];
  for (const agent of team.agents.filter((item) => item.alive)) {
    visible.add(agent.region);
    (GRAPH.get(agent.region) ?? []).forEach((region) => {
      if (!isSmokeBlocked(game, agent.region, region)) visible.add(region);
    });
  }
  for (const enemy of game.teams[otherSide(observer)].agents.filter((item) => item.detected)) visible.add(enemy.region);
  for (const camera of game.deployables.filter((item) => item.kind === "camera" && item.owner === observer)) {
    visible.add(camera.region);
    (GRAPH.get(camera.region) ?? []).forEach((region) => visible.add(region));
  }
  return visible;
}

function visibleRegions(game: GameState, context: VisibilityContext): Set<number> {
  if (context.omniscient) return new Set(REGIONS.map((region) => region.id));
  const visible = observedRegions(game, context.viewerSide);
  if (!context.allowLastKnown) return visible;
  const memories = game.enemyMemories.filter((memory) => memory.observer === context.viewerSide);
  const rememberedIds = new Set(memories.map((memory) => memory.agentId));
  memories.forEach((memory) => visible.add(memory.region));
  for (const enemy of game.teams[otherSide(context.viewerSide)].agents.filter((item) => game.revealedEnemyIds.includes(item.id) && !rememberedIds.has(item.id))) visible.add(enemy.region);
  return visible;
}

interface WaitConeView {
  id: string;
  agentName: string;
  from: number;
  to: number;
  hostile: boolean;
  lastKnown: boolean;
}

function waitConeViews(game: GameState, context: VisibilityContext): WaitConeView[] {
  const observer = context.viewerSide;
  const observed = context.omniscient ? new Set(REGIONS.map((region) => region.id)) : observedRegions(game, observer);
  const cones: WaitConeView[] = [];
  game.teams[observer].agents.filter((agent) => agent.alive).forEach((agent) => {
    agent.waitDirs.forEach((to) => cones.push({ id: `${agent.id}-${to}`, agentName: agent.name, from: agent.region, to, hostile: false, lastKnown: false }));
  });
  game.teams[otherSide(observer)].agents.filter((agent) => agent.alive).forEach((agent) => {
    const memory = context.allowLastKnown ? game.enemyMemories.find((item) => item.observer === observer && item.agentId === agent.id) : undefined;
    const currentlyKnown = observed.has(agent.region) || agent.detected || (context.allowLastKnown && game.revealedEnemyIds.includes(agent.id));
    if (!context.omniscient && !memory && !currentlyKnown) return;
    const from = memory && !observed.has(agent.region) && !agent.detected ? memory.region : agent.region;
    const waitDirs = memory && !observed.has(agent.region) && !agent.detected ? memory.waitDirs : agent.waitDirs;
    waitDirs.forEach((to) => cones.push({ id: `${agent.id}-${to}`, agentName: agent.name, from, to, hostile: true, lastKnown: !!memory && !observed.has(agent.region) && !agent.detected }));
  });
  return cones;
}

function connectionStyle(fromId: number, toId: number) {
  const from = REGIONS.find((region) => region.id === fromId)!;
  const to = REGIONS.find((region) => region.id === toId)!;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    left: `${from.x}%`,
    top: `${from.y}%`,
    width: `${Math.sqrt(dx * dx + dy * dy)}%`,
    transform: `translateY(-50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`,
  };
}

const SKILL_FX_KIND: Record<string, SkillFx["kind"]> = {
  paint: "throw", blast: "burst", curve: "throw", hot: "throw", relay: "burst", recon: "scan", shock: "throw",
  flash: "burst", aftershock: "burst", smoke: "smoke", dark: "smoke", shadow: "teleport",
  trip: "deploy", turret: "deploy", camera: "deploy", alarm: "deploy", stim: "deploy",
  tailwind: "self", updraft: "self", gear: "self",
};

function showSkillFx(game: GameState, agent: Agent, skillId: string, label: string, fromRegion: number, targetRegion: number) {
  game.lastSkillFx = {
    id: `${skillId}-${Date.now()}-${Math.random()}`,
    skillId,
    label,
    owner: agent.team,
    fromRegion,
    targetRegion,
    kind: SKILL_FX_KIND[skillId] ?? "burst",
  };
}

interface AiEnemyIntel {
  agent: Agent;
  region: number;
  exact: boolean;
}

function aiEnemyIntel(game: GameState, side: Side): AiEnemyIntel[] {
  const observed = observedRegions(game, side);
  return game.teams[otherSide(side)].agents.flatMap<AiEnemyIntel>((enemy) => {
    if (!enemy.alive) return [];
    if (enemy.detected || observed.has(enemy.region)) return [{ agent: enemy, region: enemy.region, exact: true }];
    const memory = game.enemyMemories.find((item) => item.observer === side && item.agentId === enemy.id);
    return memory ? [{ agent: enemy, region: memory.region, exact: false }] : [];
  });
}

function aiObjectiveRegion(game: GameState, side: Side, from: number, intel: AiEnemyIntel[]) {
  if (side === "defense" && game.spike.region !== null && ["planted", "half", "defusing"].includes(game.spike.status)) return game.spike.region;
  if (intel.length) return [...intel].sort((a, b) => distance(from, a.region) - distance(from, b.region))[0].region;
  const objectives = side === "attack" ? [9, 14] : [9, 14];
  return [...objectives].sort((a, b) => distance(from, a) - distance(from, b))[0];
}

function aiSkillRegions(agent: Agent, target: SkillTarget) {
  return REGIONS
    .filter((region) => {
      const range = distance(agent.region, region.id);
      if (target === "any") return true;
      if (target === "self") return range === 0;
      if (target === "adjacent") return range === 1;
      return range <= 2;
    })
    .map((region) => region.id);
}

function aiWatchDirection(game: GameState, agent: Agent, intel: AiEnemyIntel[], kind: "trip" | "turret") {
  const objective = aiObjectiveRegion(game, agent.team, agent.region, intel);
  const options = (GRAPH.get(agent.region) ?? []).filter((region) => !game.deployables.some((item) => item.owner === agent.team && item.kind === kind && item.region === agent.region && item.to === region));
  return [...options].sort((a, b) => {
    const enemyDistanceA = intel.length ? Math.min(...intel.map((item) => distance(a, item.region))) : distance(a, objective);
    const enemyDistanceB = intel.length ? Math.min(...intel.map((item) => distance(b, item.region))) : distance(b, objective);
    return enemyDistanceA - enemyDistanceB;
  })[0];
}

function aiSmokeEdge(game: GameState, agent: Agent, skillId: "smoke" | "dark", intel: AiEnemyIntel[]): [number, number] | null {
  const objective = aiObjectiveRegion(game, agent.team, agent.region, intel);
  const ownPath = shortestPath(agent.region, objective);
  const ownPathEdges = new Set(ownPath.slice(0, -1).map((region, index) => edgeKey(region, ownPath[index + 1])));
  const candidates = EDGES
    .filter(([a, b]) => !isSmokeBlocked(game, a, b) && (skillId === "dark" || distance(agent.region, a) <= 2 || distance(agent.region, b) <= 2))
    .map(([a, b]) => {
      let score = Math.max(0, 5 - Math.min(distance(a, objective), distance(b, objective)));
      for (const enemy of intel) {
        if (enemy.region === a || enemy.region === b) score += 10;
        const enemyPath = shortestPath(enemy.region, objective);
        const enemyEdges = enemyPath.slice(0, -1).map((region, index) => edgeKey(region, enemyPath[index + 1]));
        if (enemyEdges.includes(edgeKey(a, b))) score += 6;
      }
      if (ownPathEdges.has(edgeKey(a, b))) score -= agent.team === "attack" ? 7 : 2;
      return { a, b, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || (!intel.length && best.score <= 0)) return null;
  if (skillId === "smoke" && distance(agent.region, best.a) > 2) return [best.b, best.a];
  return [best.a, best.b];
}

function completeAiSkill(game: GameState, agent: Agent, definition: SkillDefinition, fromRegion: number, targetRegion: number) {
  showSkillFx(game, agent, definition.id, definition.name, fromRegion, targetRegion);
  agent.extraActions = Math.max(0, agent.extraActions - 1);
  agent.skills[definition.id] = Math.max(0, (agent.skills[definition.id] ?? 0) - 1);
  game.analytics[agent.team].skillsUsed += 1;
  addAnalyticsEvent(game, agent.team, "skill", `${agent.name} · ${definition.name}`);
  addLog(game, `${agent.team === "attack" ? "공격" : "수비"} AI · ${agent.name} 스킬 — ${definition.name} 사용.`);
  checkWinner(game);
}

function tryUseAiSkill(game: GameState, side: Side): boolean {
  const intel = aiEnemyIntel(game, side);
  const observed = observedRegions(game, side);
  const enemyDeployables = game.deployables.filter((item) => item.owner !== side && observed.has(item.region));

  for (const agent of game.teams[side].agents.filter((item) => item.alive && item.extraActions > 0)) {
    const camera = agent.name === "사이퍼" ? game.deployables.find((item) => item.kind === "camera" && item.owner === side && item.ownerAgentId === agent.id) : null;
    const cameraTarget = camera ? game.teams[otherSide(side)].agents.find((enemy) => enemy.alive && !enemy.detected && [camera.region, ...(GRAPH.get(camera.region) ?? [])].includes(enemy.region)) : null;
    if (cameraTarget) {
      if (!applyActionStartFire(game, agent)) return true;
      cameraTarget.detected = true;
      agent.extraActions = Math.max(0, agent.extraActions - 1);
      addAnalyticsEvent(game, side, "skill", `${agent.name} · 스파이캠 탐지`);
      addLog(game, `${side === "attack" ? "공격" : "수비"} AI · 스파이캠으로 ${cameraTarget.name} 탐지.`);
      return true;
    }

    const definitions = AGENTS[agent.name].skills.filter((definition) => (agent.skills[definition.id] ?? 0) > 0);
    for (const definition of definitions) {
      const from = agent.region;
      const begin = () => applyActionStartFire(game, agent);
      const finish = (target = agent.region) => completeAiSkill(game, agent, definition, from, target);
      const currentAndAdjacent = [agent.region, ...(GRAPH.get(agent.region) ?? [])];
      const exactIntel = intel.filter((item) => item.exact);
      const objective = aiObjectiveRegion(game, side, agent.region, intel);

      if (definition.id === "tailwind") {
        if (agent.status.evadeReady || !intel.some((item) => distance(agent.region, item.region) <= 2)) continue;
        if (!begin()) return true;
        agent.status.evadeReady = true;
        finish();
        return true;
      }

      if (definition.id === "updraft" || definition.id === "gear") {
        if (game.actionsUsed >= 3 || agent.status.moveRangeBonus > 0 || distance(agent.region, objective) < 1) continue;
        if (!begin()) return true;
        agent.status.moveBonus += 1;
        agent.status.moveRangeBonus += 1;
        if (definition.id === "updraft") agent.status.ignoreGround = true;
        if (definition.id === "gear") agent.status.highGear = true;
        finish();
        return true;
      }

      if (definition.id === "paint") {
        const target = [...currentAndAdjacent].map((region) => ({
          region,
          score: intel.filter((item) => item.region === region).length * 4 + enemyDeployables.filter((item) => item.region === region).length * 2,
        })).sort((a, b) => b.score - a.score)[0];
        if (!target?.score) continue;
        if (!begin()) return true;
        game.teams[otherSide(side)].agents.filter((enemy) => enemy.alive && enemy.region === target.region).forEach((enemy) => {
          clearWait(enemy);
          applyDamage(game, agent, enemy, 1, "페인트탄");
        });
        game.deployables = game.deployables.filter((item) => item.region !== target.region || item.owner === side);
        finish(target.region);
        return true;
      }

      if (definition.id === "blast") {
        const targetIntel = exactIntel.find((item) => item.agent.detected && currentAndAdjacent.includes(item.region));
        if (targetIntel) {
          const destination = [...(GRAPH.get(targetIntel.agent.region) ?? [])].sort((a, b) => distance(b, objective) - distance(a, objective))[0];
          if (destination === undefined) continue;
          if (!begin()) return true;
          moveAgent(game, targetIntel.agent, destination, "forced");
          finish(destination);
          return true;
        }
        const destination = REGIONS
          .filter((region) => distance(agent.region, region.id) === 1)
          .sort((a, b) => distance(a.id, objective) - distance(b.id, objective))[0]?.id;
        if (destination === undefined || distance(destination, objective) >= distance(agent.region, objective)) continue;
        if (!begin()) return true;
        agent.status.moveBonus += 1;
        moveAgent(game, agent, destination, "forced");
        finish(destination);
        return true;
      }

      if (definition.id === "curve") {
        const target = currentAndAdjacent.map((region) => ({
          region,
          targets: exactIntel.filter((item) => item.region === region || item.agent.waitDirs.includes(region)),
        })).sort((a, b) => b.targets.length - a.targets.length)[0];
        if (!target?.targets.length) continue;
        if (!begin()) return true;
        target.targets.forEach(({ agent: enemy }) => game.statusEffects.push({ id: `ai-curve-${game.turnSerial}-${enemy.id}`, owner: side, targetId: enemy.id, aimPenalty: 3, consumeOnAttack: true }));
        finish(target.region);
        return true;
      }

      if (definition.id === "hot") {
        const enemyRegion = currentAndAdjacent
          .map((region) => ({ region, count: intel.filter((item) => item.region === region).length }))
          .sort((a, b) => b.count - a.count)[0];
        const target = agent.hp < 2 ? agent.region : enemyRegion?.count ? enemyRegion.region : null;
        if (target === null || game.fires.some((fire) => fire.owner === side && fire.region === target)) continue;
        if (!begin()) return true;
        game.fires.push({ id: `ai-hot-${game.turnSerial}-${target}`, owner: side, ownerAgentId: agent.id, region: target, expiresOwnerTurn: game.teamTurns[side] + 1, expiresOn: "owner-start" });
        finish(target);
        return true;
      }

      if (definition.id === "relay" || definition.id === "flash" || definition.id === "aftershock") {
        const candidates = aiSkillRegions(agent, "adjacent").map((region) => ({
          region,
          targets: exactIntel.filter((item) => item.region === region),
        })).sort((a, b) => b.targets.length - a.targets.length);
        const target = candidates[0];
        if (!target?.targets.length) continue;
        if (!begin()) return true;
        if (definition.id === "relay") {
          target.targets.forEach(({ agent: enemy }) => {
            if (!game.statusEffects.some((effect) => effect.targetId === enemy.id && effect.priorityPenalty)) game.statusEffects.push({ id: `ai-relay-${game.turnSerial}-${enemy.id}`, owner: side, targetId: enemy.id, priorityPenalty: 1 });
          });
        } else if (definition.id === "flash") {
          target.targets.forEach(({ agent: enemy }) => game.statusEffects.push({ id: `ai-flash-${game.turnSerial}-${enemy.id}`, owner: side, targetId: enemy.id, aimPenalty: 3, consumeOnAttack: true }));
        } else {
          game.aftershocks.push({ id: `ai-aftershock-${game.turnSerial}-${target.region}`, owner: side, ownerAgentId: agent.id, region: target.region, targetIds: target.targets.map((item) => item.agent.id), readyOnTurn: game.teamTurns[otherSide(side)] + 1 });
          target.targets.forEach(({ agent: enemy }) => cancelProgress(game, enemy));
        }
        finish(target.region);
        return true;
      }

      if (definition.id === "trip" || definition.id === "turret") {
        const direction = aiWatchDirection(game, agent, intel, definition.id);
        if (direction === undefined) continue;
        if (!begin()) return true;
        game.deployables.push({ id: `ai-${definition.id}-${game.turnSerial}-${agent.id}`, kind: definition.id, owner: side, ownerAgentId: agent.id, region: agent.region, to: direction });
        finish(direction);
        return true;
      }

      if (definition.id === "camera" || definition.id === "alarm") {
        const kind = definition.id;
        const duplicate = game.deployables.some((item) => item.kind === kind && item.owner === side && (kind === "camera" ? item.ownerAgentId === agent.id : item.region === agent.region));
        if (duplicate) continue;
        if (!begin()) return true;
        game.deployables.push({ id: `ai-${kind}-${game.turnSerial}-${agent.id}`, kind, owner: side, ownerAgentId: agent.id, region: agent.region });
        finish();
        return true;
      }

      if (definition.id === "recon") {
        const target = aiSkillRegions(agent, "range2").map((region) => {
          const scanned = new Set([region, ...(GRAPH.get(region) ?? [])]);
          const score = intel.filter((item) => scanned.has(item.region)).length * 8 + Math.max(0, 4 - distance(region, objective));
          return { region, score };
        }).sort((a, b) => b.score - a.score)[0];
        if (!target) continue;
        if (!begin()) return true;
        const waitingEnemy = game.teams[otherSide(side)].agents
          .filter((enemy) => enemy.alive && enemy.waitDirs.includes(target.region))
          .sort((a, b) => (a.waitOrders[target.region] ?? a.waitStamp) - (b.waitOrders[target.region] ?? b.waitStamp))[0];
        if (waitingEnemy) {
          addTrade(game, { enemyId: waitingEnemy.id, team: side, sourceId: agent.id });
          rememberEnemy(game, side, waitingEnemy);
          addLog(game, `${waitingEnemy.name}이 AI 정찰 화살을 파괴했습니다. 총기 ${WEAPONS[waitingEnemy.weapon].name} 확인.`);
        } else {
          const scanned = new Set([target.region, ...(GRAPH.get(target.region) ?? [])]);
          game.teams[otherSide(side)].agents.filter((enemy) => enemy.alive && scanned.has(enemy.region)).forEach((enemy) => { enemy.detected = true; });
        }
        finish(target.region);
        return true;
      }

      if (definition.id === "shock") {
        const targetIntel = intel
          .filter((item) => distance(agent.region, item.region) <= 2)
          .sort((a, b) => (a.agent.hp + a.agent.armor) - (b.agent.hp + b.agent.armor))[0];
        const targetDevice = enemyDeployables.filter((item) => distance(agent.region, item.region) <= 2)[0];
        if (!targetIntel && !targetDevice) continue;
        const targetRegion = targetIntel?.region ?? targetDevice!.region;
        if (!begin()) return true;
        const actualTarget = targetIntel?.agent.region === targetRegion ? targetIntel.agent : game.teams[otherSide(side)].agents.find((enemy) => enemy.alive && enemy.region === targetRegion);
        if (actualTarget) applyDamage(game, agent, actualTarget, 1, "충격 화살");
        else if (targetDevice) game.deployables = game.deployables.filter((item) => item.id !== targetDevice.id);
        finish(targetRegion);
        return true;
      }

      if (definition.id === "smoke" || definition.id === "dark") {
        const edge = aiSmokeEdge(game, agent, definition.id, intel);
        if (!edge) continue;
        if (!begin()) return true;
        if (definition.id === "dark") game.smokes = game.smokes.filter((smoke) => !(smoke.sourceAgentId === agent.id && smoke.sourceSkill === "dark"));
        game.smokes.push({ key: edgeKey(edge[0], edge[1]), owner: side, expiresOwnerTurn: game.teamTurns[side] + 1, expiresOn: "owner-end", sourceAgentId: agent.id, sourceSkill: definition.id });
        finish(edge[1]);
        return true;
      }

      if (definition.id === "stim") {
        const alliesHere = game.teams[side].agents.filter((ally) => ally.alive && ally.region === agent.region).length;
        if (game.stims.some((stim) => stim.owner === side && stim.region === agent.region) || (alliesHere < 2 && !intel.some((item) => distance(agent.region, item.region) <= 1))) continue;
        if (!begin()) return true;
        game.stims.push({ id: `ai-stim-${game.turnSerial}-${agent.region}`, owner: side, region: agent.region, expiresOwnerTurn: game.teamTurns[side] + 1, expiresOn: "owner-start" });
        finish();
        return true;
      }

      if (definition.id === "shadow") {
        const destination = aiSkillRegions(agent, "range2")
          .filter((region) => region !== agent.region)
          .sort((a, b) => {
            const enemyA = exactIntel.some((item) => item.region === a) ? -4 : 0;
            const enemyB = exactIntel.some((item) => item.region === b) ? -4 : 0;
            return distance(a, objective) + enemyA - (distance(b, objective) + enemyB);
          })[0];
        if (destination === undefined || (distance(destination, objective) >= distance(agent.region, objective) && !exactIntel.some((item) => item.region === destination))) continue;
        if (!begin()) return true;
        clearWait(agent);
        cancelProgress(game, agent);
        agent.region = destination;
        triggerHazards(game, agent, destination, destination);
        if (agent.alive) queueCurrentEncounter(game, agent, 4, true, 0, true, "movement");
        finish(destination);
        return true;
      }
    }
  }
  return false;
}

function regionName(id: number) {
  return REGIONS.find((region) => region.id === id)?.name ?? `${id}번 구역`;
}

function withAndJosa(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return `${name}${code >= 0 && code <= 11171 && code % 28 !== 0 ? "과" : "와"}`;
}

function deckComposition(names: string[]) {
  const counts: Record<CardKind, number> = { basic: 0, peek: 0, entry: 0, follow: 0, control: 0 };
  names.forEach((name) => roleCards(AGENTS[name].role).forEach((kind) => { counts[kind] += 1; }));
  return counts;
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="setup-screen title-screen">
      <div className="title-noise" />
      <section className="title-hero">
        <div className="title-kicker"><span /> 5 VS 5 TACTICAL CARD GAME</div>
        <div className="title-lockup"><span className="title-v">V</span><div><h1>PROTOCOL:<br /><b>GRID</b></h1><p>발로란트식 전술 카드게임</p></div></div>
        <p className="title-copy">요원을 고르고, 15장의 역할 덱을 완성하고, 정보를 교환하며 두 개의 사이트를 두고 싸우세요.</p>
        <button className="primary-cta" onClick={onStart}><span>새 작전</span><b>게임 시작</b></button>
        <div className="title-roadmap"><span><i className="ready" /> PC 핫시트 플레이</span><span><i className="ready" /> 모바일 반응형 UI</span><span><i className="ready" /> AI 대전 · AI vs AI 분석</span></div>
      </section>
      <aside className="title-map-card">
        <div className="title-map-image" />
        <div className="title-map-copy"><span>MAP // GRID-01</span><strong>17개 전술 구역</strong><p>2개 사이트 · 26개 연결 · 사운드 정보 없음</p></div>
      </aside>
      <footer className="title-footer"><span>BUILD 0.6 // FULL RULESET UPDATE</span><span>PC·모바일 핫시트 플레이</span></footer>
    </main>
  );
}

function hitRate(stats: TeamAnalytics) {
  return stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
}

function analysisInsights(game: GameState) {
  const attack = game.analytics.attack;
  const defense = game.analytics.defense;
  const attackAlive = game.teams.attack.agents.filter((agent) => agent.alive).length;
  const defenseAlive = game.teams.defense.agents.filter((agent) => agent.alive).length;
  const attackPower = attackAlive * 3 + attack.damage + attack.hits * 2;
  const defensePower = defenseAlive * 3 + defense.damage + defense.hits * 2;
  const leader: Side | null = attackPower === defensePower ? null : attackPower > defensePower ? "attack" : "defense";
  const rateGap = hitRate(attack) - hitRate(defense);
  const first = leader
    ? `${SIDE_LABEL[leader]}이 생존·교전 효율 합산에서 주도권을 잡고 있습니다.`
    : "생존 인원과 교전 효율이 비슷해 아직 뚜렷한 우세가 없습니다.";
  const second = attack.shots + defense.shots === 0
    ? "아직 총격 데이터가 없습니다. 첫 대기 접촉과 엔트리 결과가 흐름을 결정합니다."
    : Math.abs(rateGap) >= 15
      ? `${rateGap > 0 ? "공격팀" : "수비팀"} 명중률이 ${Math.abs(rateGap)}%p 앞섭니다. 낮은 쪽은 정면 재교전보다 이탈·트레이드가 유리합니다.`
      : "양 팀 명중률 차이가 작습니다. 피해 집중과 생존 총기 보존이 더 중요한 구간입니다.";
  const third = game.spike.status === "carried"
    ? `공격팀은 사이트 진입과 설치가 우선이며, 수비팀은 ${game.teams.defense.agents.filter((agent) => agent.alive && [9, 10, 11, 14, 15, 16].includes(agent.region)).length}명으로 사이트 권역을 지키고 있습니다.`
    : ["planting", "planted", "half", "defusing"].includes(game.spike.status)
      ? `스파이크 ${SPIKE_STATUS_LABEL[game.spike.status]} 단계입니다. 수비 재진입과 해체 진행이 최우선입니다.`
      : `현재 승리 조건: ${game.winReason ?? SPIKE_STATUS_LABEL[game.spike.status]}.`;
  return [first, second, third];
}

function MatchAnalysisPanel({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const insights = analysisInsights(game);
  return <section className={`match-analysis ${compact ? "compact" : ""}`} aria-label="AI 경기 분석">
    <header><div><span>TACTICAL ANALYSIS</span><strong>{game.winner ? "라운드 분석" : "실시간 전술 분석"}</strong></div><small>실제 교전·행동 데이터 기준</small></header>
    <div className="analysis-teams">
      {(["defense", "attack"] as Side[]).map((side) => {
        const stats = game.analytics[side];
        return <article key={side} className={`analysis-team ${side}`}>
          <div><span>{side === "defense" ? "DEF" : "ATK"}</span><strong>{SIDE_LABEL[side]}</strong><b>{game.teams[side].agents.filter((agent) => agent.alive).length}/5 생존</b></div>
          <dl>
            <div><dt>명중률</dt><dd>{hitRate(stats)}%</dd></div>
            <div><dt>피해</dt><dd>{stats.damage}</dd></div>
            <div><dt>킬</dt><dd>{stats.kills}</dd></div>
            <div><dt>헤드</dt><dd>{stats.headshots}</dd></div>
            <div><dt>카드</dt><dd>{stats.cardsUsed}</dd></div>
            <div><dt>이탈</dt><dd>{stats.retreats}</dd></div>
          </dl>
          <i><span style={{ width: `${hitRate(stats)}%` }} /></i>
        </article>;
      })}
    </div>
    <div className="analysis-insights">{insights.map((insight, index) => <p key={insight}><b>0{index + 1}</b><span>{insight}</span></p>)}</div>
    {!compact && <div className="analysis-timeline"><span>최근 변곡점</span>{game.analytics.timeline.slice(0, 5).map((event) => <p key={event.id} className={event.side}><b>R{event.cycle}</b><i>{event.type}</i><span>{event.label}</span></p>)}{!game.analytics.timeline.length && <small>첫 행동을 기다리는 중입니다.</small>}</div>}
  </section>;
}

interface SelectionScreenProps {
  attackPick: string[];
  defensePick: string[];
  pickingSide: Side;
  onPickingSide: (side: Side) => void;
  onToggle: (name: string) => void;
  onRecommended: () => void;
  onBack: () => void;
  onConfirm: () => void;
  playMode: PlayMode;
  onPlayMode: (mode: PlayMode) => void;
}

function SelectionScreen(props: SelectionScreenProps) {
  const current = props.pickingSide === "attack" ? props.attackPick : props.defensePick;
  const attackDeck = deckComposition(props.attackPick);
  const defenseDeck = deckComposition(props.defensePick);
  const deckLine = (counts: Record<CardKind, number>) => (Object.keys(counts) as CardKind[]).filter((kind) => counts[kind] > 0);
  return (
    <main className="setup-screen selection-screen">
      <header className="setup-topbar"><button onClick={props.onBack}>← 타이틀</button><div><span>STEP 01</span><strong>요원 선택 · 덱 구성</strong></div><button onClick={props.onRecommended}>추천 조합</button></header>
      <section className="selection-body">
        <div className="selection-main">
          <div className="side-tabs">
            {(["attack", "defense"] as Side[]).map((side) => {
              const picks = side === "attack" ? props.attackPick : props.defensePick;
              return <button key={side} className={`${props.pickingSide === side ? "active" : ""} tab-${side}`} onClick={() => props.onPickingSide(side)}><span>{side === "attack" ? "ATK" : "DEF"}</span><strong>{SIDE_LABEL[side]}</strong><b>{picks.length}/5</b></button>;
            })}
          </div>
          <div className="selection-heading"><div><span className="eyebrow">SELECT YOUR AGENTS</span><h2>{SIDE_LABEL[props.pickingSide]} 조합</h2></div><p>같은 팀 안에서는 요원이 중복될 수 없습니다. 요원 한 명이 역할에 맞는 행동카드 3장을 제공합니다.</p></div>
          <div className="agent-select-grid">
            {Object.values(AGENTS).map((agent, index) => {
              const picked = current.includes(agent.name);
              const attackIndex = props.attackPick.indexOf(agent.name);
              const defenseIndex = props.defensePick.indexOf(agent.name);
              return <button key={agent.name} className={`select-agent-card role-${agent.role} ${picked ? "picked" : ""}`} onClick={() => props.onToggle(agent.name)}>
                <span className="select-number">{String(index + 1).padStart(2, "0")}</span><span className={`select-avatar ${agentArtClass(agent.name)}`} aria-label={`${agent.name} 초상`} />
                <span className="select-agent-copy"><small>{ROLE_LABEL[agent.role]}</small><strong>{agent.name}</strong><em>{roleCards(agent.role).map((kind) => CARD_DATA[kind].name).join(" · ")}</em></span>
                <span className="pick-badges">{attackIndex >= 0 && <i className="atk">A{attackIndex + 1}</i>}{defenseIndex >= 0 && <i className="def">D{defenseIndex + 1}</i>}</span>
              </button>;
            })}
          </div>
        </div>
        <aside className="deck-builder">
          <span className="eyebrow">LIVE DECK BUILDER</span><h2>15장 덱 구성</h2>
          {(["attack", "defense"] as Side[]).map((side) => {
            const picks = side === "attack" ? props.attackPick : props.defensePick;
            const deck = side === "attack" ? attackDeck : defenseDeck;
            return <article key={side} className={`deck-preview deck-${side}`}><header><div><span>{side === "attack" ? "ATK" : "DEF"}</span><strong>{SIDE_LABEL[side]}</strong></div><b>{picks.length * 3}/15</b></header>
              <div className="picked-lineup">{Array.from({ length: 5 }).map((_, index) => <i key={index} className={picks[index] ? `role-${AGENTS[picks[index]].role}` : "empty"}>{picks[index]?.slice(0, 1) ?? "+"}</i>)}</div>
              <div className="deck-card-counts">{deckLine(deck).map((kind) => <span key={kind} className={`count-${kind}`}><b>{deck[kind]}</b>{CARD_DATA[kind].name}</span>)}</div>
              <p>{picks.length === 5 ? "덱 구성 완료" : `요원 ${5 - picks.length}명을 더 선택하세요`}</p>
            </article>;
          })}
          <div className="deck-rule"><b>역할 제한</b><span>엔트리 → 타격대</span><span>추종 → 척후대·전략가</span><span>지역 장악 → 감시자</span></div>
          <div className="mode-picker">
            <b>플레이 모드</b>
            <button className={props.playMode === "hotseat" ? "active" : ""} onClick={() => props.onPlayMode("hotseat")}>2인 핫시트</button>
            <button className={props.playMode === "vs-ai" ? "active" : ""} onClick={() => props.onPlayMode("vs-ai")}>VS AI · 공격팀</button>
            <button className={props.playMode === "ai-vs-ai" ? "active spectator-mode" : "spectator-mode"} onClick={() => props.onPlayMode("ai-vs-ai")}><strong>AI vs AI 관전</strong><small>자동 구매 · 배치 · 전술 분석</small></button>
          </div>
          <button className="confirm-lineup" disabled={props.attackPick.length !== 5 || props.defensePick.length !== 5} onClick={props.onConfirm}><span>STEP 02</span><strong>수비 구매로 이동</strong></button>
        </aside>
      </section>
    </main>
  );
}

function remainingSkillBuyCost(agent: Agent): number {
  return AGENTS[agent.name].skills.reduce((total, definition) => {
    const max = definition.price.includes("2회") ? 2 : 1;
    const unitPrice = max === 2 ? 1 : 2;
    return total + Math.max(0, max - (agent.skills[definition.id] ?? 0)) * unitPrice;
  }, 0);
}

function autoBuyTeamLoadout(game: GameState, side: Side) {
  const team = game.teams[side];
  const skillReserve = Math.min(team.funds, game.matchRound === 1 ? 10 : game.matchRound === 2 ? 14 : 18);
  const preferred: WeaponId[] = game.matchRound === 1
    ? ["sheriff"]
    : game.matchRound === 2
      ? side === "defense" ? ["outlaw", "bulldog", "spectre", "bucky"] : ["bulldog", "spectre", "bucky", "outlaw"]
      : side === "defense"
        ? ["operator", "vandal", "phantom", "judge", "outlaw", "bulldog"]
        : ["vandal", "phantom", "judge", "outlaw", "bulldog", "spectre"];
  for (const agent of team.agents) {
    if (agent.weapon !== "classic") continue;
    const weapon = preferred.map((id) => WEAPONS[id]).find((item) => item.unlock <= game.matchRound && item.price <= team.funds - skillReserve);
    if (!weapon) continue;
    agent.weapon = weapon.id;
    team.funds -= weapon.price;
  }

  const skillRounds = [
    team.agents.flatMap((agent) => AGENTS[agent.name].skills.slice(0, 1).map((definition) => ({ agent, definition }))),
    team.agents.flatMap((agent) => AGENTS[agent.name].skills.slice(1).map((definition) => ({ agent, definition }))),
    team.agents.flatMap((agent) => AGENTS[agent.name].skills.filter((definition) => definition.price.includes("2회")).map((definition) => ({ agent, definition }))),
  ];
  for (const purchases of skillRounds) {
    for (const { agent, definition } of purchases) {
      const max = definition.price.includes("2회") ? 2 : 1;
      const price = max === 2 ? 1 : 2;
      if ((agent.skills[definition.id] ?? 0) < max && team.funds >= price) {
        agent.skills[definition.id] = (agent.skills[definition.id] ?? 0) + 1;
        team.funds -= price;
      }
    }
  }
  for (const agent of team.agents) {
    if (agent.armorType === "none" && team.funds >= 2) {
      agent.armorType = "light";
      agent.armor = 1;
      team.funds -= 2;
    }
  }
  team.buyLocked = true;
}

function autoDeployDefense(game: GameState) {
  const positions = [10, 13, 7, 10, 13];
  game.teams.defense.agents.forEach((agent, index) => {
    agent.region = positions[index % positions.length];
  });
}

function prepareAiVsAiRound(game: GameState) {
  autoBuyTeamLoadout(game, "defense");
  autoDeployDefense(game);
  autoBuyTeamLoadout(game, "attack");
  game.turnSide = "defense";
  game.teams.attack.buyLocked = true;
  game.teams.defense.buyLocked = true;
  game.selectedAgentId = game.teams.defense.agents.find((agent) => agent.alive)?.id ?? null;
  addLog(game, "AI 대 AI 관전 시작 · 양 팀 자동 구매와 수비 배치를 완료했습니다.");
  addAnalyticsEvent(game, "defense", "objective", "AI 자동 수비 배치 완료");
  game.turnStartContactQueue = game.teams.defense.agents.filter((agent) => agent.alive).map((agent) => agent.id);
  queueNextTurnStartContact(game);
}

interface PurchaseScreenProps {
  game: GameState;
  side: Side;
  selectedId: string | null;
  step: string;
  onSelect: (id: string) => void;
  onWeapon: (weapon: Weapon) => void;
  onBulkWeapon: (weapon: Weapon) => void;
  onArmor: (type: Agent["armorType"], price: number, value: number) => void;
  onBulkArmor: (type: Agent["armorType"], price: number, value: number) => void;
  onSkill: (skill: SkillDefinition) => void;
  onAllSkills: (scope: "agent" | "team") => void;
  onContinue: () => void;
  onBack: () => void;
}

function PurchaseScreen({ game, side, selectedId, step, onSelect, onWeapon, onBulkWeapon, onArmor, onBulkArmor, onSkill, onAllSkills, onContinue, onBack }: PurchaseScreenProps) {
  const team = game.teams[side];
  const agent = getAgent(game, selectedId) ?? team.agents[0];
  const spent = Math.max(0, team.buyStartFunds - team.funds);
  const agentSkillCost = remainingSkillBuyCost(agent);
  const teamSkillCost = team.agents.reduce((total, item) => total + remainingSkillBuyCost(item), 0);
  return <main className={`setup-screen purchase-screen purchase-${side}`}>
    <header className="setup-topbar"><button disabled={game.matchRound > 1 && side === "defense"} onClick={onBack}>← 이전 단계</button><div><span>{step}</span><strong>{SIDE_LABEL[side]} 구매 단계 · R{game.matchRound}</strong></div><span className="purchase-wallet">팀 자금 <b>{team.funds}원</b></span></header>
    <section className="purchase-body">
      <aside className="purchase-roster"><span className="eyebrow">TEAM LOADOUT</span><h2>{SIDE_LABEL[side]}</h2><p>{game.matchRound === 1 ? "모든 요원은 클래식과 방어구 0, 스킬 0회로 시작합니다." : "생존 총기와 무피해 방어구는 보존됐습니다. 스킬은 매 라운드 다시 구매합니다."} 팀 공동 자금을 원하는 요원에게 분배하세요.</p><div>{team.agents.map((item) => <button key={item.id} className={agent?.id === item.id ? "selected" : ""} onClick={() => onSelect(item.id)}><i className={`role-${item.role} ${agentArtClass(item.name)}`} aria-label={`${item.name} 초상`} /><span><strong>{item.name}</strong><small>{WEAPONS[item.weapon].name} · 방어 {item.armor}</small></span><b>{Object.values(item.skills).reduce((sum, value) => sum + value, 0)}U</b></button>)}</div><footer><span>사용</span><b>{spent}원</b><i style={{ width: `${team.buyStartFunds ? Math.min(100, (spent / team.buyStartFunds) * 100) : 0}%` }} /></footer></aside>
      <section className="purchase-catalog">
        <div className="purchase-agent-head"><div className={`purchase-avatar role-${agent.role} ${agentArtClass(agent.name)}`} aria-label={`${agent.name} 초상`} /><div><span className="eyebrow">SELECTED AGENT</span><h2>{agent.name}</h2><p>{ROLE_LABEL[agent.role]} · 에임 {ROLE_STATS[agent.role].aim} / 무빙 {ROLE_STATS[agent.role].move}</p></div><div className="current-loadout"><span>현재 장비</span><strong>{WEAPONS[agent.weapon].name}</strong><small>방어 {agent.armor} · 스킬 {Object.values(agent.skills).reduce((sum, value) => sum + value, 0)}회</small></div></div>
        <div className="purchase-section-title"><div><span>01</span><strong>총기</strong></div><p>{game.matchRound === 1 ? "클래식 · 셰리프" : game.matchRound === 2 ? "버키 · 스펙터 · 불독 · 아웃로 추가" : "모든 총기 해금"} · 교체 시 기존 장비값 환불</p></div>
        <div className="purchase-weapons">{Object.values(WEAPONS).map((weapon) => { const locked = weapon.unlock > game.matchRound; const equipped = agent.weapon === weapon.id; const difference = weapon.price - WEAPONS[agent.weapon].price; const bulkTargets = team.agents.filter((item) => item.weapon !== weapon.id); const bulkCount = bulkTargets.length; const bulkCost = bulkTargets.reduce((sum, item) => sum + weapon.price - WEAPONS[item.weapon].price, 0); return <div key={weapon.id} className={`purchase-weapon-option ${locked ? "locked" : ""}`}><button disabled={locked || equipped || difference > team.funds} className={`purchase-primary ${equipped ? "equipped" : ""}`} onClick={() => onWeapon(weapon)} title={weaponRuleSummary(weapon)}><span>{weapon.type === "sniper" ? "SNP" : weapon.type === "shotgun" ? "SG" : "GUN"}</span><strong>{weapon.name}</strong><small>몸통 {weapon.body} · 헤드 {weapon.head}</small><small className="weapon-rule-copy">{weaponRuleSummary(weapon)}</small><b>{locked ? `${weapon.unlock}R 해금` : equipped ? "장착 중" : difference < 0 ? `환불 ${-difference}원` : difference ? `${difference}원` : "무료 교체"}</b></button><button className="bulk-buy" disabled={locked || bulkCount === 0 || bulkCost > team.funds} onClick={() => onBulkWeapon(weapon)}><span>팀 일괄</span><b>{bulkCount}명 · {bulkCost < 0 ? `환불 ${-bulkCost}` : bulkCost}원</b></button></div>; })}</div>
        <div className="purchase-lower">
          <div><div className="purchase-section-title"><div><span>02</span><strong>방어구</strong></div></div><div className="purchase-armors">{([{"type":"none","name":"방어구 없음","detail":"장비값 환불","price":0,"value":0},{"type":"light","name":"소형 방어구","detail":"방어 1","price":2,"value":1},{"type":"regen","name":"회복 방어구","detail":"턴 종료 회복","price":4,"value":1},{"type":"heavy","name":"대형 방어구","detail":"방어 2","price":6,"value":2}] as const).map((armor) => { const difference = armor.price - ARMOR_PRICE[agent.armorType]; const bulkTargets = team.agents.filter((item) => item.armorType !== armor.type); const bulkCount = bulkTargets.length; const bulkCost = bulkTargets.reduce((sum, item) => sum + armor.price - ARMOR_PRICE[item.armorType], 0); return <div key={armor.type} className="purchase-armor-option"><button className="purchase-primary" disabled={difference > team.funds || agent.armorType === armor.type} onClick={() => onArmor(armor.type, armor.price, armor.value)}><strong>{armor.name}</strong><span>{armor.detail}</span><b>{difference < 0 ? `환불 ${-difference}원` : difference ? `${difference}원` : "무료 교체"}</b></button><button className="bulk-buy" disabled={bulkCount === 0 || bulkCost > team.funds} onClick={() => onBulkArmor(armor.type, armor.price, armor.value)}><span>팀 일괄</span><b>{bulkCount}명 · {bulkCost < 0 ? `환불 ${-bulkCost}` : bulkCost}원</b></button></div>; })}</div></div>
          <div><div className="purchase-section-title skill-title"><div><span>03</span><strong>스킬</strong></div><div className="skill-bulk-actions"><button disabled={agentSkillCost === 0 || agentSkillCost > team.funds} onClick={() => onAllSkills("agent")}>선택 요원 전부 · {agentSkillCost}원</button><button disabled={teamSkillCost === 0 || teamSkillCost > team.funds} onClick={() => onAllSkills("team")}>팀 전원 전부 · {teamSkillCost}원</button></div></div><div className="purchase-skills">{AGENTS[agent.name].skills.map((item) => { const max = item.price.includes("2회") ? 2 : 1; const current = agent.skills[item.id] ?? 0; const price = max === 2 ? 1 : 2; return <button key={item.id} disabled={current >= max || team.funds < price} onClick={() => onSkill(item)}><span className={skillArtClass(item.id)} aria-label={`${item.name} 아이콘`} /><div><strong>{item.name}</strong><small>{current}/{max}회 구매</small></div><b>{price}원</b></button>; })}</div></div>
        </div>
      </section>
      <aside className="purchase-confirm"><span className="eyebrow">BUY PHASE</span><h2>{team.funds}원 남음</h2><p>남은 자금은 다음 매치 라운드로 이월됩니다. 전원이 같은 장비를 가질 필요는 없습니다.</p><div className="loadout-summary">{team.agents.map((item) => <article key={item.id}><i className={agentArtClass(item.name)} aria-label={`${item.name} 초상`} /><span><strong>{item.name}</strong><small>{WEAPONS[item.weapon].name} · 방어 {item.armor}</small></span><b>{Object.values(item.skills).reduce((sum, value) => sum + value, 0)}U</b></article>)}</div><button onClick={onContinue}><span>{side === "defense" ? "수비 배치 단계" : "첫 수비 턴"}</span><strong>구매 확정</strong></button></aside>
    </section>
  </main>;
}

interface DeploymentScreenProps {
  game: GameState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlace: (region: number) => void;
  onBack: () => void;
  onStart: () => void;
}

function DeploymentScreen({ game, selectedId, onSelect, onPlace, onBack, onStart }: DeploymentScreenProps) {
  const defenders = game.teams.defense.agents;
  const allowed = [7, 10, 13];
  return (
    <main className="setup-screen deployment-screen">
      <header className="setup-topbar"><button onClick={onBack}>← 수비 구매</button><div><span>STEP 03</span><strong>수비팀 사전 배치</strong></div><span className="deck-locked">15장 덱 잠금 완료</span></header>
      <section className="deployment-body">
        <aside className="deployment-roster"><span className="eyebrow">DEFENDER LINEUP</span><h2>요원 배치</h2><p>각 요원은 수비 시작 지점에서 연결된 구역으로 최대 1칸 이동할 수 있습니다. 같은 구역에 여러 명을 배치할 수 있습니다.</p>
          <div>{defenders.map((agent) => <button key={agent.id} className={selectedId === agent.id ? "selected" : ""} onClick={() => onSelect(agent.id)}><i className={`role-${agent.role} ${agentArtClass(agent.name)}`} aria-label={`${agent.name} 초상`} /><span><strong>{agent.name}</strong><small>{ROLE_LABEL[agent.role]}</small></span><b>{agent.region}번</b></button>)}</div>
          <div className="placement-rule"><span>이동 가능</span><b>7 ↔ 10</b><b>7 ↔ 13</b></div>
        </aside>
        <div className="deployment-map">
          <div className="deployment-vignette" />
          <div className="map-coordinate-layer deployment-coordinate-layer">
            <div className="deployment-map-image" />
            {EDGES.map(([a, b]) => { const start = REGIONS.find((region) => region.id === a)!; const end = REGIONS.find((region) => region.id === b)!; const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx) * 180 / Math.PI; return <span key={`${a}-${b}`} className="map-edge" style={{ left: `${start.x}%`, top: `${start.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />; })}
            {REGIONS.map((region) => { const units = defenders.filter((agent) => agent.region === region.id); const valid = allowed.includes(region.id); return <button key={region.id} disabled={!valid} className={`deployment-node ${valid ? "valid" : ""}`} style={{ left: `${region.x}%`, top: `${region.y}%` }} onClick={() => onPlace(region.id)}><span>{region.id}</span>{valid && <small>{regionName(region.id)}</small>}<i>{units.map((agent) => <b key={agent.id} className={`role-${agent.role} ${agentArtClass(agent.name)}`} title={agent.name} />)}</i></button>; })}
          </div>
          <div className="deployment-callout"><span>수비팀 배치 범위</span><strong>시작 지점과 인접 1칸</strong><p>배치를 확정하면 공격팀 구매 단계로 넘어갑니다.</p></div>
        </div>
        <aside className="deployment-summary"><span className="eyebrow">READY CHECK</span><h2>작전 준비</h2><div className="versus-line"><article><span>ATK</span>{game.teams.attack.agents.map((agent) => <i key={agent.id}>{agent.name.slice(0, 1)}</i>)}</article><b>VS</b><article><span>DEF</span>{defenders.map((agent) => <i key={agent.id}>{agent.name.slice(0, 1)}</i>)}</article></div><ul><li><i /> 공격팀 시작 위치 1번</li><li><i /> 수비팀 배치 확정</li><li><i /> 다음: 공격팀 구매</li></ul><button onClick={onStart}><span>STEP 04</span><strong>공격팀 구매</strong></button></aside>
      </section>
    </main>
  );
}

interface AiControllerProps {
  game: GameState;
  sides: Side[];
  paused: boolean;
  speed: number;
  stepSignal: number;
  onStep: (side: Side) => void;
  onEndTurn: () => void;
  onCombatAttack: () => void;
  onCombatRetreat: (region: number) => void;
  onCombatAdvance: () => void;
  onCombatContinue: () => void;
  onTailwind: (region: number) => void;
}

function AiController(props: AiControllerProps) {
  const handledStepRef = useRef(0);
  useEffect(() => {
    if (!props.sides.length) return;
    const manualStep = props.paused && props.stepSignal > handledStepRef.current;
    if (props.paused && !manualStep) return;
    if (manualStep) handledStepRef.current = props.stepSignal;
    const scene = props.game.combatQueue[0];
    if (props.game.winner && !scene) return;
    let action: (() => void) | null = null;
    if (scene) {
      if (scene.phase === "tailwind") {
        const actor = getAgent(props.game, scene.tailwindActorId);
        if (actor && props.sides.includes(actor.team)) {
          const options = GRAPH.get(actor.region) ?? [];
          const enemies = props.game.teams[otherSide(actor.team)].agents.filter((enemy) => enemy.alive);
          const choice = [...options].sort((a, b) => Math.min(...enemies.map((enemy) => distance(b, enemy.region)), 99) - Math.min(...enemies.map((enemy) => distance(a, enemy.region)), 99))[0];
          if (choice) action = () => props.onTailwind(choice);
        }
      } else if (scene.phase === "choice") {
        const actor = getAgent(props.game, scene.actorId);
        if (actor && props.sides.includes(actor.team)) {
          const canAdvance = actor.id === scene.mover.id && props.game.pendingMovement?.agentId === actor.id && props.game.pendingMovement.nextIndex < props.game.pendingMovement.path.length;
          const retreatOptions = GRAPH.get(actor.region) ?? [];
          if (actor.id === scene.mover.id && !scene.canMoverAttack) {
            if (canAdvance) action = props.onCombatAdvance;
            else if (retreatOptions.length) action = () => props.onCombatRetreat(retreatOptions[0]);
          } else {
            const shouldRetreat = actor.hp === 1 && retreatOptions.length > 0 && Math.random() < .35;
            action = shouldRetreat ? () => props.onCombatRetreat(retreatOptions[0]) : props.onCombatAttack;
          }
        }
      } else {
        const mover = getAgent(props.game, scene.mover.id);
        const holder = getAgent(props.game, scene.holder.id);
        if ((mover && props.sides.includes(mover.team)) || (holder && props.sides.includes(holder.team))) action = props.onCombatContinue;
      }
    } else if (props.sides.includes(props.game.turnSide)) {
      action = props.game.actionsUsed >= 3 && !props.game.pendingWait && !props.game.targeting && !props.game.pendingContact ? props.onEndTurn : () => props.onStep(props.game.turnSide);
    }
    if (!action) return;
    const delay = manualStep ? 80 : Math.max(120, (scene?.phase === "encounter" ? 1400 : scene?.phase === "result" ? 1650 : 650) / props.speed);
    const timer = window.setTimeout(action, delay);
    return () => window.clearTimeout(timer);
  }, [props]);
  return null;
}

export default function Home() {
  const [stage, setStage] = useState<"title" | "select" | "buy_defense" | "deploy" | "buy_attack" | "play">("title");
  const [attackPick, setAttackPick] = useState<string[]>([]);
  const [defensePick, setDefensePick] = useState<string[]>([]);
  const [pickingSide, setPickingSide] = useState<Side>("attack");
  const [playMode, setPlayMode] = useState<PlayMode>("hotseat");
  const [spectatorPaused, setSpectatorPaused] = useState(false);
  const [spectatorSpeed, setSpectatorSpeed] = useState(1);
  const [spectatorStep, setSpectatorStep] = useState(0);
  const [deploymentAgentId, setDeploymentAgentId] = useState<string | null>(null);
  const [setupAgentId, setSetupAgentId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState>(() => createInitialGame());
  const [showHelp, setShowHelp] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const combatTurnRef = useRef<HTMLDivElement | null>(null);
  const combatStageRef = useRef<HTMLDivElement | null>(null);

  const aiSide: Side | null = playMode === "vs-ai" ? "attack" : null;
  const spectatorMode = playMode === "ai-vs-ai";
  const actorSide = game.turnSide;
  const viewerSide = spectatorMode ? actorSide : aiSide ? otherSide(aiSide) : actorSide;
  const allowLastKnown = spectatorMode ? false : !aiSide || actorSide === viewerSide;
  const visibilityContext = useMemo<VisibilityContext>(() => ({ actorSide, viewerSide, allowLastKnown, omniscient: spectatorMode }), [actorSide, viewerSide, allowLastKnown, spectatorMode]);
  const activeTeam = game.teams[game.turnSide];
  const viewerTeam = game.teams[viewerSide];
  const controlledAiSides = useMemo<Side[]>(() => spectatorMode ? ["attack", "defense"] : aiSide ? [aiSide] : [], [spectatorMode, aiSide]);
  const isAiControlledTurn = spectatorMode || aiSide === game.turnSide;
  const selectedAgent = getAgent(game, game.selectedAgentId);
  const displayedAgent = selectedAgent?.team === viewerSide ? selectedAgent : viewerTeam.agents.find((agent) => agent.alive) ?? viewerTeam.agents[0] ?? null;
  const selectedCard = activeTeam.hand.find((card) => card.id === game.selectedCardId) ?? null;
  const observed = useMemo(() => spectatorMode ? new Set(REGIONS.map((region) => region.id)) : observedRegions(game, viewerSide), [game, viewerSide, spectatorMode]);
  const visible = useMemo(() => visibleRegions(game, visibilityContext), [game, visibilityContext]);
  const mapWaitCones = useMemo(() => waitConeViews(game, visibilityContext), [game, visibilityContext]);
  const viewerLog = useMemo(() => {
    if (spectatorMode || !aiSide) return game.log;
    const hiddenAgentNames = game.teams[aiSide].agents.map((agent) => agent.name);
    return game.log.filter((entry) => !hiddenAgentNames.some((name) => entry.includes(name)) && !entry.includes(`${SIDE_LABEL[aiSide]} AI`));
  }, [game, aiSide, spectatorMode]);

  useEffect(() => {
    if (!isAiControlledTurn) return;
    const timer = window.setTimeout(() => setShowShop(false), 0);
    return () => window.clearTimeout(timer);
  }, [isAiControlledTurn]);

  const currentCombatPhase = game.combatQueue[0]?.phase ?? null;
  const currentCombatResult = game.combatQueue[0]?.result ?? null;
  useEffect(() => {
    if (!currentCombatPhase) return;
    const timer = window.setTimeout(() => {
      const target = currentCombatPhase === "result" ? combatStageRef.current : combatTurnRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [currentCombatPhase, currentCombatResult]);
  const validTargets = useMemo(() => {
    if (game.pendingWait) {
      const agent = getAgent(game, game.pendingWait);
      return new Set(agent ? waitTargetsFor(agent) : []);
    }
    if (game.targeting?.kind === "control") {
      const agent = getAgent(game, game.targeting.agentId);
      return new Set(agent ? GRAPH.get(agent.region) ?? [] : []);
    }
    if (game.targeting?.kind === "skill") {
      const agent = getAgent(game, game.targeting.agentId);
      const definition = agent ? AGENTS[agent.name].skills.find((item) => item.id === game.targeting?.skillId) : null;
      if (!agent || !definition) return new Set<number>();
      if (game.targeting.candidateAgentIds?.length || game.targeting.candidateDeployableIds?.length) return new Set<number>();
      if (definition.id === "blast" && game.targeting.targetAgentId) {
        const target = getAgent(game, game.targeting.targetAgentId);
        return new Set(target ? GRAPH.get(target.region) ?? [] : []);
      }
      if ((definition.id === "smoke" || definition.id === "dark") && game.targeting.selected?.length) {
        return new Set(GRAPH.get(game.targeting.selected[0]) ?? []);
      }
      if (definition.id === "blast") return new Set([agent.region, ...(GRAPH.get(agent.region) ?? [])]);
      if (["paint", "hot", "relay"].includes(definition.id)) return new Set([agent.region, ...(GRAPH.get(agent.region) ?? [])]);
      if (definition.target === "adjacent") return new Set(GRAPH.get(agent.region) ?? []);
      if (definition.target === "range2") return new Set(REGIONS.filter((region) => distance(agent.region, region.id) <= 2).map((region) => region.id));
      if (definition.target === "any") return new Set(REGIONS.map((region) => region.id));
    }
    if (game.targeting?.kind === "special") {
      if (game.targeting.origin !== undefined) return new Set(GRAPH.get(game.targeting.origin) ?? []);
      return new Set(activeTeam.agents.filter((agent) => agent.alive).map((agent) => agent.region));
    }
    if (selectedAgent && selectedCard && canUseCard(selectedCard, selectedAgent)) return new Set(cardTargets(game, selectedAgent, selectedCard));
    return new Set<number>();
  }, [game, selectedAgent, selectedCard, activeTeam.agents]);

  const mutate = (recipe: (draft: GameState) => void) => {
    setGame((current) => {
      const draft = structuredClone(current) as GameState;
      recipe(draft);
      return draft;
    });
  };

  const toggleLineupAgent = (name: string) => {
    const update = pickingSide === "attack" ? setAttackPick : setDefensePick;
    const current = pickingSide === "attack" ? attackPick : defensePick;
    if (current.includes(name)) update(current.filter((item) => item !== name));
    else if (current.length < 5) update([...current, name]);
  };

  const recommendedLineups = () => {
    setAttackPick(["제트", "레이즈", "소바", "브리치", "브림스톤"]);
    setDefensePick(["피닉스", "네온", "사이퍼", "킬조이", "오멘"]);
  };

  const confirmLineups = () => {
    if (attackPick.length !== 5 || defensePick.length !== 5) return;
    const next = createInitialGame(attackPick, defensePick);
    if (playMode === "ai-vs-ai") prepareAiVsAiRound(next);
    setGame(next);
    setDeploymentAgentId(next.teams.defense.agents[0]?.id ?? null);
    setSetupAgentId(next.teams.defense.agents[0]?.id ?? null);
    setSpectatorPaused(false);
    setStage(playMode === "ai-vs-ai" ? "play" : "buy_defense");
  };

  const setupBuyWeapon = (side: Side, weapon: Weapon) => mutate((draft) => {
    const team = draft.teams[side];
    const agent = getAgent(draft, setupAgentId);
    if (!agent || agent.team !== side || weapon.unlock > draft.matchRound || agent.weapon === weapon.id) return;
    const difference = weapon.price - WEAPONS[agent.weapon].price;
    if (difference > team.funds) return;
    agent.weapon = weapon.id;
    team.funds -= difference;
  });

  const setupBulkBuyWeapon = (side: Side, weapon: Weapon) => mutate((draft) => {
    const team = draft.teams[side];
    const targets = team.agents.filter((agent) => agent.weapon !== weapon.id);
    const total = targets.reduce((sum, agent) => sum + weapon.price - WEAPONS[agent.weapon].price, 0);
    if (weapon.unlock > draft.matchRound || targets.length === 0 || team.funds < total) return;
    targets.forEach((agent) => { agent.weapon = weapon.id; });
    team.funds -= total;
    addLog(draft, `${SIDE_LABEL[side]} 일괄 구매: ${weapon.name} ${targets.length}정 · ${total}원.`);
  });

  const setupBuyArmor = (side: Side, type: Agent["armorType"], price: number, value: number) => mutate((draft) => {
    const team = draft.teams[side];
    const agent = getAgent(draft, setupAgentId);
    if (!agent || agent.team !== side || agent.armorType === type) return;
    const difference = price - ARMOR_PRICE[agent.armorType];
    if (difference > team.funds) return;
    agent.armorType = type;
    agent.armor = value;
    agent.armorDamaged = false;
    team.funds -= difference;
  });

  const setupBulkBuyArmor = (side: Side, type: Agent["armorType"], price: number, value: number) => mutate((draft) => {
    const team = draft.teams[side];
    const targets = team.agents.filter((agent) => agent.armorType !== type);
    const total = targets.reduce((sum, agent) => sum + price - ARMOR_PRICE[agent.armorType], 0);
    if (targets.length === 0 || team.funds < total) return;
    targets.forEach((agent) => {
      agent.armorType = type;
      agent.armor = value;
      agent.armorDamaged = false;
    });
    team.funds -= total;
    addLog(draft, `${SIDE_LABEL[side]} 일괄 구매: 방어구 ${targets.length}개 · ${total}원.`);
  });

  const setupBuySkill = (side: Side, definition: SkillDefinition) => mutate((draft) => {
    const team = draft.teams[side];
    const agent = getAgent(draft, setupAgentId);
    if (!agent || agent.team !== side) return;
    const max = definition.price.includes("2회") ? 2 : 1;
    const price = max === 2 ? 1 : 2;
    if ((agent.skills[definition.id] ?? 0) >= max || team.funds < price) return;
    agent.skills[definition.id] = (agent.skills[definition.id] ?? 0) + 1;
    team.funds -= price;
  });

  const setupBuyAllSkills = (side: Side, scope: "agent" | "team") => mutate((draft) => {
    const team = draft.teams[side];
    const selected = getAgent(draft, setupAgentId);
    const targets = scope === "team" ? team.agents : selected?.team === side ? [selected] : [];
    const total = targets.reduce((sum, agent) => sum + remainingSkillBuyCost(agent), 0);
    if (targets.length === 0 || total === 0 || team.funds < total) return;
    targets.forEach((agent) => {
      AGENTS[agent.name].skills.forEach((definition) => {
        agent.skills[definition.id] = definition.price.includes("2회") ? 2 : 1;
      });
    });
    team.funds -= total;
    addLog(draft, `${scope === "team" ? SIDE_LABEL[side] : selected?.name} 스킬 전부 구매 · ${total}원.`);
  });

  const placeDefender = (region: number) => {
    if (!deploymentAgentId || ![7, 10, 13].includes(region)) return;
    mutate((draft) => {
      const agent = getAgent(draft, deploymentAgentId);
      if (agent?.team === "defense") agent.region = region;
    });
  };

  const autoBuyAttackAndStart = () => {
    mutate((draft) => {
      autoBuyTeamLoadout(draft, "attack");
      draft.turnSide = "defense";
      draft.teams.attack.buyLocked = true;
      draft.teams.defense.buyLocked = true;
      draft.selectedAgentId = draft.teams.defense.agents.find((agent) => agent.alive)?.id ?? null;
      addLog(draft, `공격팀 AI가 구매를 마쳤습니다. 수비팀 첫 턴을 시작합니다.`);
      draft.turnStartContactQueue = draft.teams.defense.agents.filter((agent) => agent.alive).map((agent) => agent.id);
      queueNextTurnStartContact(draft);
    });
    setStage("play");
  };

  const restartToTitle = () => {
    setGame(createInitialGame());
    setAttackPick([]);
    setDefensePick([]);
    setPickingSide("attack");
    setPlayMode("hotseat");
    setSpectatorPaused(false);
    setSpectatorSpeed(1);
    setSpectatorStep(0);
    setDeploymentAgentId(null);
    setSetupAgentId(null);
    setShowShop(false);
    setShowHelp(false);
    setStage("title");
  };

  const startNextRound = (swapSides: boolean) => {
    const nextDefenseFirst = (swapSides ? game.teams.attack : game.teams.defense).agents[0]?.id ?? null;
    mutate((draft) => {
      prepareNextRoundState(draft, swapSides);
      if (spectatorMode) prepareAiVsAiRound(draft);
    });
    setSetupAgentId(nextDefenseFirst);
    setDeploymentAgentId(nextDefenseFirst);
    setShowShop(false);
    setStage(spectatorMode ? "play" : "buy_defense");
  };

  if (stage === "title") return <TitleScreen onStart={() => setStage("select")} />;
  if (stage === "select") return <SelectionScreen attackPick={attackPick} defensePick={defensePick} pickingSide={pickingSide} onPickingSide={setPickingSide} onToggle={toggleLineupAgent} onRecommended={recommendedLineups} onBack={() => setStage("title")} onConfirm={confirmLineups} playMode={playMode} onPlayMode={setPlayMode} />;
  if (stage === "buy_defense") return <PurchaseScreen game={game} side="defense" selectedId={setupAgentId} step="STEP 02" onSelect={setSetupAgentId} onWeapon={(weapon) => setupBuyWeapon("defense", weapon)} onBulkWeapon={(weapon) => setupBulkBuyWeapon("defense", weapon)} onArmor={(type, price, value) => setupBuyArmor("defense", type, price, value)} onBulkArmor={(type, price, value) => setupBulkBuyArmor("defense", type, price, value)} onSkill={(item) => setupBuySkill("defense", item)} onAllSkills={(scope) => setupBuyAllSkills("defense", scope)} onBack={() => { if (game.matchRound === 1 && !game.teams.attack.score && !game.teams.defense.score) setStage("select"); }} onContinue={() => { setDeploymentAgentId(game.teams.defense.agents[0]?.id ?? null); setStage("deploy"); }} />;
  if (stage === "deploy") return <DeploymentScreen game={game} selectedId={deploymentAgentId} onSelect={setDeploymentAgentId} onPlace={placeDefender} onBack={() => { setSetupAgentId(game.teams.defense.agents[0]?.id ?? null); setStage("buy_defense"); }} onStart={() => { if (aiSide === "attack") autoBuyAttackAndStart(); else { setSetupAgentId(game.teams.attack.agents[0]?.id ?? null); setStage("buy_attack"); } }} />;
  if (stage === "buy_attack") return <PurchaseScreen game={game} side="attack" selectedId={setupAgentId} step="STEP 04" onSelect={setSetupAgentId} onWeapon={(weapon) => setupBuyWeapon("attack", weapon)} onBulkWeapon={(weapon) => setupBulkBuyWeapon("attack", weapon)} onArmor={(type, price, value) => setupBuyArmor("attack", type, price, value)} onBulkArmor={(type, price, value) => setupBulkBuyArmor("attack", type, price, value)} onSkill={(item) => setupBuySkill("attack", item)} onAllSkills={(scope) => setupBuyAllSkills("attack", scope)} onBack={() => setStage("deploy")} onContinue={() => { mutate((draft) => { draft.turnSide = "defense"; draft.teams.attack.buyLocked = true; draft.teams.defense.buyLocked = true; draft.selectedAgentId = draft.teams.defense.agents.find((agent) => agent.alive)?.id ?? null; addLog(draft, "공격팀 구매 완료. 수비팀 첫 턴을 시작합니다."); draft.turnStartContactQueue = draft.teams.defense.agents.filter((agent) => agent.alive).map((agent) => agent.id); queueNextTurnStartContact(draft); }); setStage("play"); }} />;

  const selectAgent = (id: string) => {
    if (isAiControlledTurn || game.pendingContact) return;
    const agent = getAgent(game, id);
    if (!agent || agent.team !== game.turnSide || !agent.alive || game.winner) return;
    if (selectedCard?.used && selectedCard.committedAgentId && selectedCard.committedAgentId !== id) return;
    mutate((draft) => { draft.selectedAgentId = id; });
  };

  const selectCard = (card: ActionCard) => {
    if (isAiControlledTurn) return;
    if (card.used || game.actionsUsed >= 3 || game.pendingWait || game.targeting || game.pendingContact || game.winner) return;
    if (selectedCard?.used && selectedCard.committedAgentId) return;
    mutate((draft) => { draft.selectedCardId = draft.selectedCardId === card.id ? null : card.id; });
  };

  const commitPreAction = () => {
    if (!selectedAgent || !selectedCard || selectedCard.used || game.actionsUsed >= 3 || game.pendingContact || !canUseCard(selectedCard, selectedAgent)) return;
    mutate((draft) => {
      const agent = getAgent(draft, selectedAgent.id);
      const card = draft.teams[draft.turnSide].hand.find((item) => item.id === selectedCard.id);
      if (!agent || !card || card.used) return;
      card.used = true;
      card.committedAgentId = agent.id;
      agent.extraActions += 1;
      draft.actionsUsed += 1;
      draft.teams[draft.turnSide].buyLocked = true;
      addLog(draft, `${agent.name}이 ${CARD_DATA[card.kind].name}의 사전 추가행동을 사용합니다. 카드 행동을 이어서 완료해야 합니다.`);
    });
  };

  const finishWait = (region: number) => {
    mutate((draft) => {
      const agent = getAgent(draft, draft.pendingWait);
      if (!agent || !waitTargetsFor(agent).includes(region)) return;
      setWait(draft, agent, [region]);
      draft.pendingWait = null;
      const range = distance(agent.region, region);
      addLog(draft, `${agent.name} 대기 설정: ${regionName(region)} 구역 · 거리 ${range} · 우선도 1.`);
    });
  };

  const resolveSkillTarget = (region: number) => {
    mutate((draft) => {
      const targeting = draft.targeting;
      const agent = getAgent(draft, targeting?.agentId);
      if (!targeting || targeting.kind !== "skill" || !agent || !targeting.skillId) return;
      const definition = AGENTS[agent.name].skills.find((item) => item.id === targeting.skillId);
      if (!definition) return;
      const skillOrigin = agent.region;
      const isSmokeSecondPoint = (targeting.skillId === "smoke" || targeting.skillId === "dark") && !!targeting.selected?.length;
      const isBlastDestination = targeting.skillId === "blast" && !!targeting.targetAgentId;
      const isValid = isSmokeSecondPoint
        ? (GRAPH.get(targeting.selected![0]) ?? []).includes(region)
        : isBlastDestination
          ? (GRAPH.get(getAgent(draft, targeting.targetAgentId)?.region ?? -1) ?? []).includes(region)
          : targeting.skillId === "blast" || ["paint", "hot", "relay"].includes(targeting.skillId)
            ? region === agent.region || (GRAPH.get(agent.region) ?? []).includes(region)
            : definition.target === "any"
        || (definition.target === "adjacent" && (GRAPH.get(agent.region) ?? []).includes(region))
        || (definition.target === "range2" && distance(agent.region, region) <= 2);
      if (!isValid) return;

      if ((targeting.skillId === "smoke" || targeting.skillId === "dark") && !targeting.selected?.length) {
        targeting.selected = [region];
        addLog(draft, `${definition.name}: 연막을 놓을 연결의 반대편 구역을 선택하세요.`);
        return;
      }

      const enemies = draft.teams[otherSide(agent.team)].agents.filter((enemy) => enemy.alive && enemy.region === region);
      const deployableId = () => `${targeting.skillId}-${Date.now()}-${region}`;
      switch (targeting.skillId) {
        case "paint":
          enemies.forEach((enemy) => { clearWait(enemy); applyDamage(draft, agent, enemy, 1, "페인트탄"); });
          draft.deployables = draft.deployables.filter((item) => item.region !== region || item.owner === agent.team);
          break;
        case "blast": {
          if (!targeting.targetAgentId) {
            const candidates = [
              ...draft.teams[agent.team].agents.filter((candidate) => candidate.alive && candidate.region === region),
              ...draft.teams[otherSide(agent.team)].agents.filter((candidate) => candidate.alive && candidate.region === region && candidate.detected),
            ];
            if (!candidates.length) return;
            if (candidates.length === 1) targeting.targetAgentId = candidates[0].id;
            else targeting.candidateAgentIds = candidates.map((candidate) => candidate.id);
            addLog(draft, `폭발 팩으로 이동시킬 요원을 선택하세요.`);
            return;
          }
          const target = getAgent(draft, targeting.targetAgentId);
          if (!target?.alive) return;
          if (target.id === agent.id) target.status.moveBonus += 1;
          moveAgent(draft, target, region, "forced");
          addLog(draft, `${target.name}이 폭발 팩으로 ${regionName(region)}에 강제 이동했습니다.`);
          break;
        }
        case "curve": {
          const curveTargets = draft.teams[otherSide(agent.team)].agents.filter((enemy) => enemy.alive && (enemy.region === region || enemy.waitDirs.includes(region)));
          curveTargets.forEach((enemy) => draft.statusEffects.push({ id: `${deployableId()}-${enemy.id}`, owner: agent.team, targetId: enemy.id, aimPenalty: 3, consumeOnAttack: true }));
          addLog(draft, `커브볼이 ${regionName(region)} 내부와 해당 구역을 대기 중인 적 ${curveTargets.length}명에게 적용됐습니다.`);
          break;
        }
        case "flash":
          enemies.forEach((enemy) => draft.statusEffects.push({ id: `${deployableId()}-${enemy.id}`, owner: agent.team, targetId: enemy.id, aimPenalty: 3, consumeOnAttack: true }));
          break;
        case "hot":
          draft.fires.push({ id: deployableId(), owner: agent.team, ownerAgentId: agent.id, region, expiresOwnerTurn: draft.teamTurns[agent.team] + 1, expiresOn: "owner-start" });
          break;
        case "relay":
          enemies.forEach((enemy) => {
            if (!draft.statusEffects.some((effect) => effect.targetId === enemy.id && effect.priorityPenalty)) draft.statusEffects.push({ id: `${deployableId()}-${enemy.id}`, owner: agent.team, targetId: enemy.id, priorityPenalty: 1 });
          });
          break;
        case "trip":
          draft.deployables.push({ id: deployableId(), kind: "trip", owner: agent.team, ownerAgentId: agent.id, region: agent.region, to: region });
          break;
        case "turret":
          draft.deployables.push({ id: deployableId(), kind: "turret", owner: agent.team, ownerAgentId: agent.id, region: agent.region, to: region });
          break;
        case "recon": {
          const scanned = new Set([region, ...(GRAPH.get(region) ?? [])]);
          const waitingEnemy = enemies
            .filter((enemy) => enemy.waitDirs.includes(region))
            .sort((a, b) => (a.waitOrders[region] ?? a.waitStamp) - (b.waitOrders[region] ?? b.waitStamp))[0];
          if (waitingEnemy) {
            addTrade(draft, { enemyId: waitingEnemy.id, team: agent.team, sourceId: agent.id });
            addLog(draft, `${waitingEnemy.name}이 정찰 화살을 파괴했습니다. 총기 ${WEAPONS[waitingEnemy.weapon].name} 확인 / 트레이드 표식.`);
          } else {
            draft.teams[otherSide(agent.team)].agents.filter((enemy) => scanned.has(enemy.region)).forEach((enemy) => { enemy.detected = true; });
            addLog(draft, `정찰 성공: ${regionName(region)} 주변의 적이 탐지됐습니다.`);
          }
          break;
        }
        case "shock": {
          const devices = draft.deployables.filter((item) => item.region === region && item.owner !== agent.team);
          const visibleEnemies = enemies.filter((enemy) => enemy.detected || draft.revealedEnemyIds.includes(enemy.id));
          if (visibleEnemies.length + devices.length > 1) {
            targeting.candidateAgentIds = visibleEnemies.map((target) => target.id);
            targeting.candidateDeployableIds = devices.map((target) => target.id);
            addLog(draft, `충격 화살의 목표를 선택하세요.`);
            return;
          }
          const target = visibleEnemies[0] ?? (enemies.length ? enemies[Math.floor(Math.random() * enemies.length)] : null);
          if (target) applyDamage(draft, agent, target, 1, "충격 화살");
          else if (devices[0]) draft.deployables = draft.deployables.filter((item) => item.id !== devices[0].id);
          break;
        }
        case "aftershock":
          draft.aftershocks.push({ id: deployableId(), owner: agent.team, ownerAgentId: agent.id, region, targetIds: enemies.map((enemy) => enemy.id), readyOnTurn: draft.teamTurns[otherSide(agent.team)] + 1 });
          enemies.forEach((enemy) => cancelProgress(draft, enemy));
          break;
        case "smoke": {
          const first = targeting.selected![0];
          draft.smokes.push({ key: edgeKey(first, region), owner: agent.team, expiresOwnerTurn: draft.teamTurns[agent.team] + 1, expiresOn: "owner-end", sourceAgentId: agent.id, sourceSkill: "smoke" });
          break;
        }
        case "dark": {
          const first = targeting.selected![0];
          draft.smokes = draft.smokes.filter((smoke) => !(smoke.sourceAgentId === agent.id && smoke.sourceSkill === "dark"));
          draft.smokes.push({ key: edgeKey(first, region), owner: agent.team, expiresOwnerTurn: draft.teamTurns[agent.team] + 1, expiresOn: "owner-end", sourceAgentId: agent.id, sourceSkill: "dark" });
          break;
        }
        case "shadow": {
          const from = agent.region;
          clearWait(agent);
          cancelProgress(draft, agent);
          agent.region = region;
          triggerHazards(draft, agent, region, region);
          if (agent.alive) queueCurrentEncounter(draft, agent, 4, true, 0, true, "movement");
          addLog(draft, `${agent.name}이 경로를 무시하고 ${regionName(from)}에서 ${regionName(region)}로 순간이동했습니다.`);
          break;
        }
      }
      showSkillFx(draft, agent, targeting.skillId, definition.name, skillOrigin, region);
      if (targeting.skillId !== "recon") addLog(draft, `${agent.name} 스킬 — ${definition.name} 사용.`);
      agent.extraActions = Math.max(0, agent.extraActions - 1);
      agent.skills[targeting.skillId] = Math.max(0, (agent.skills[targeting.skillId] ?? 0) - 1);
      draft.analytics[agent.team].skillsUsed += 1;
      addAnalyticsEvent(draft, agent.team, "skill", `${agent.name} · ${definition.name}`);
      draft.targeting = null;
      checkWinner(draft);
    });
  };

  const activateSkill = (definition: SkillDefinition) => {
    if (!selectedAgent || selectedAgent.extraActions < 1 || (selectedAgent.skills[definition.id] ?? 0) < 1 || game.pendingContact || game.winner) return;
    if (definition.target !== "self") {
      mutate((draft) => {
        const agent = getAgent(draft, selectedAgent.id);
        if (!agent || !applyActionStartFire(draft, agent)) return;
        draft.targeting = { kind: "skill", agentId: selectedAgent.id, skillId: definition.id };
      });
      return;
    }
    mutate((draft) => {
      const agent = getAgent(draft, selectedAgent.id)!;
      if (!applyActionStartFire(draft, agent)) return;
      if (definition.id === "tailwind") agent.status.evadeReady = true;
      if (definition.id === "updraft" || definition.id === "gear") {
        agent.status.moveBonus += 1;
        agent.status.moveRangeBonus += 1;
      }
      if (definition.id === "updraft") agent.status.ignoreGround = true;
      if (definition.id === "gear") agent.status.highGear = true;
      if (definition.id === "camera") draft.deployables.push({ id: `camera-${Date.now()}`, kind: "camera", owner: agent.team, ownerAgentId: agent.id, region: agent.region });
      if (definition.id === "alarm") draft.deployables.push({ id: `alarm-${Date.now()}`, kind: "alarm", owner: agent.team, ownerAgentId: agent.id, region: agent.region });
      if (definition.id === "stim") draft.stims.push({ id: `stim-${Date.now()}`, owner: agent.team, region: agent.region, expiresOwnerTurn: draft.teamTurns[agent.team] + 1, expiresOn: "owner-start" });
      showSkillFx(draft, agent, definition.id, definition.name, agent.region, agent.region);
      agent.extraActions -= 1;
      agent.skills[definition.id] -= 1;
      draft.analytics[agent.team].skillsUsed += 1;
      addAnalyticsEvent(draft, agent.team, "skill", `${agent.name} · ${definition.name}`);
      addLog(draft, `${agent.name} 스킬 — ${definition.name} 사용.`);
    });
  };

  const resolveSkillCandidate = (id: string, kind: "agent" | "deployable") => {
    mutate((draft) => {
      const targeting = draft.targeting;
      const caster = getAgent(draft, targeting?.agentId);
      if (!targeting || targeting.kind !== "skill" || !caster || !targeting.skillId) return;
      if (targeting.skillId === "blast" && kind === "agent") {
        const target = getAgent(draft, id);
        if (!target?.alive) return;
        targeting.targetAgentId = target.id;
        targeting.candidateAgentIds = [];
        addLog(draft, `${target.name}이 이동할 인접 구역을 선택하세요.`);
        return;
      }
      if (targeting.skillId !== "shock") return;
      const fxTargetRegion = kind === "agent" ? getAgent(draft, id)?.region : draft.deployables.find((item) => item.id === id)?.region;
      if (kind === "agent") {
        const target = getAgent(draft, id);
        if (target?.alive) applyDamage(draft, caster, target, 1, "충격 화살");
      } else {
        draft.deployables = draft.deployables.filter((item) => item.id !== id);
        addLog(draft, `충격 화살이 설치물을 파괴했습니다.`);
      }
      showSkillFx(draft, caster, "shock", "충격 화살", caster.region, fxTargetRegion ?? caster.region);
      caster.extraActions = Math.max(0, caster.extraActions - 1);
      caster.skills.shock = Math.max(0, (caster.skills.shock ?? 0) - 1);
      draft.targeting = null;
      checkWinner(draft);
    });
  };

  const cameraDetect = (enemyId: string) => mutate((draft) => {
    if (draft.pendingContact) return;
    const agent = getAgent(draft, selectedAgent?.id);
    const enemy = getAgent(draft, enemyId);
    if (!agent || agent.name !== "사이퍼" || agent.extraActions < 1 || !enemy?.alive) return;
    const camera = draft.deployables.find((item) => item.kind === "camera" && item.owner === agent.team);
    if (!camera || !new Set([camera.region, ...(GRAPH.get(camera.region) ?? [])]).has(enemy.region)) return;
    if (!applyActionStartFire(draft, agent)) return;
    enemy.detected = true;
    agent.extraActions -= 1;
    addLog(draft, `${agent.name}이 스파이캠으로 ${enemy.name}을 탐지했습니다.`);
  });

  const destroyDeployable = (deployableId: string) => mutate((draft) => {
    if (draft.pendingContact) return;
    const agent = getAgent(draft, selectedAgent?.id);
    const device = draft.deployables.find((item) => item.id === deployableId);
    if (!agent || agent.extraActions < 1 || !device || device.owner === agent.team || distance(agent.region, device.region) > 1) return;
    if (!applyActionStartFire(draft, agent)) return;
    draft.deployables = draft.deployables.filter((item) => item.id !== deployableId);
    agent.extraActions -= 1;
    addLog(draft, `${agent.name}이 적 ${device.kind} 설치물을 파괴했습니다.`);
  });

  const resolveAftershock = (effectId: string, agentId: string, destination?: number) => mutate((draft) => {
    const effect = draft.aftershocks.find((item) => item.id === effectId);
    const agent = getAgent(draft, agentId);
    if (!effect || !agent?.alive || agent.team !== draft.turnSide || !effect.targetIds.includes(agent.id)) return;
    effect.targetIds = effect.targetIds.filter((id) => id !== agent.id);
    if (destination !== undefined) {
      if (!(GRAPH.get(agent.region) ?? []).includes(destination)) return;
      clearWait(agent);
      cancelProgress(draft, agent);
      moveAgent(draft, agent, destination, "forced");
      addLog(draft, `${agent.name}이 여진 구역을 벗어났습니다.`);
    } else {
      applyDamage(draft, getAgent(draft, effect.ownerAgentId), agent, 2, "여진 폭발");
      addLog(draft, `${agent.name}이 이동하지 않고 여진 피해를 받았습니다.`);
    }
    draft.aftershocks = draft.aftershocks.filter((item) => item.targetIds.length > 0);
    checkWinner(draft);
  });

  const handleRegionClick = (region: number) => {
    if (game.winner || isAiControlledTurn || game.pendingContact) return;
    if (game.pendingWait) { finishWait(region); return; }
    if (game.targeting?.kind === "skill") { if (validTargets.has(region)) resolveSkillTarget(region); return; }
    if (game.targeting?.kind === "special") {
      mutate((draft) => {
        const state = draft.targeting;
        if (!state || state.kind !== "special") return;
        if (state.origin === undefined) {
          if (!draft.teams[draft.turnSide].agents.some((agent) => agent.alive && agent.region === region)) return;
          state.origin = region;
          addLog(draft, `${state.special === "rush" ? "러쉬" : "커버"} 출발 구역 선택: ${regionName(region)}.`);
          return;
        }
        if (!(GRAPH.get(state.origin) ?? []).includes(region)) return;
        const movers = draft.teams[draft.turnSide].agents.filter((agent) => agent.alive && agent.region === state.origin);
        draft.groupMovement = { agentIds: movers.map((agent) => agent.id), nextIndex: 0, target: region, special: state.special! };
        if (state.special === "rush") draft.teams.attack.rushUsed = true;
        else draft.teams.defense.cover = false;
        addLog(draft, `${state.special === "rush" ? "러쉬" : "커버"}: ${movers.length}명 순차 단체 이동.`);
        draft.targeting = null;
        continueGroupMovement(draft);
      });
      return;
    }
    if (game.targeting?.kind === "control") {
      if (!validTargets.has(region)) return;
      mutate((draft) => {
        const targeting = draft.targeting;
        const agent = getAgent(draft, targeting?.agentId);
        const card = draft.teams[draft.turnSide].hand.find((item) => item.id === targeting?.cardId);
        if (!targeting || !agent || !card) return;
        const selected = [...(targeting.selected ?? [])];
        if (!selected.includes(region)) selected.push(region);
        if (selected.length < 2) {
          targeting.selected = selected;
          addLog(draft, `지역 장악 첫 방향: ${regionName(region)}. 두 번째 방향을 선택하세요.`);
          return;
        }
        setWait(draft, agent, selected.slice(0, 2));
        playCard(draft, card, agent);
      });
      return;
    }
    if (!selectedAgent || !selectedCard || !validTargets.has(region) || !canUseCard(selectedCard, selectedAgent) || (selectedCard.committedAgentId && selectedCard.committedAgentId !== selectedAgent.id)) return;
    if (selectedCard.kind === "control") {
      if (isChanneling(game, selectedAgent)) return;
      mutate((draft) => {
        draft.targeting = { kind: "control", agentId: selectedAgent.id, cardId: selectedCard.id, selected: [region] };
        addLog(draft, `지역 장악 첫 방향: ${regionName(region)}. 두 번째 방향을 선택하세요.`);
      });
      return;
    }
    mutate((draft) => {
      const agent = getAgent(draft, selectedAgent.id);
      const card = draft.teams[draft.turnSide].hand.find((item) => item.id === selectedCard.id);
      if (!agent || !card || !canUseCard(card, agent)) return;
      playCard(draft, card, agent);
      if (!applyActionStartFire(draft, agent)) return;
      moveAgent(draft, agent, region, card.kind);
      if (card.kind === "basic" && agent.alive) draft.pendingWait = agent.id;
    });
  };

  const quickAction = (type: "plant" | "half" | "final" | "pickup" | "spike") => {
    if (!selectedAgent || selectedAgent.extraActions < 1 || game.pendingContact) return;
    mutate((draft) => {
      const agent = getAgent(draft, selectedAgent.id);
      if (!agent || !agent.alive || agent.extraActions < 1) return;
      if (!applyActionStartFire(draft, agent)) return;
      if (type === "plant") {
        const region = REGIONS.find((item) => item.id === agent.region);
        if (agent.team !== "attack" || !region?.site || draft.spike.carrierId !== agent.id || draft.spike.status !== "carried") return;
        clearWait(agent);
        draft.spike = { ...draft.spike, status: "planting", region: agent.region, actorId: agent.id, startCycle: draft.cycle };
        agent.extraActions -= 1;
        addLog(draft, `${agent.name}이 ${region.site} 사이트 설치를 시작했습니다. 다음 공격 턴 시작에 완료됩니다.`);
      }
      if (type === "half") {
        if (agent.team !== "defense" || draft.spike.status !== "planted" || draft.spike.region !== agent.region) return;
        draft.spike.status = "half";
        draft.spike.halfCycle = draft.cycle;
        agent.extraActions -= 1;
        addLog(draft, `${agent.name} 반 해체 완료. 다음 수비 턴부터 최종 해체가 가능합니다.`);
      }
      if (type === "final") {
        if (agent.team !== "defense" || draft.spike.status !== "half" || draft.spike.region !== agent.region || draft.spike.halfCycle === draft.cycle) return;
        clearWait(agent);
        draft.spike.status = "defusing";
        draft.spike.actorId = agent.id;
        draft.spike.startCycle = draft.cycle;
        agent.extraActions -= 1;
        addLog(draft, `${agent.name} 최종 해체 시작. 다음 수비 턴 시작까지 버티세요.`);
      }
      if (type === "pickup") {
        const dropped = draft.droppedWeapons.find((item) => item.region === agent.region);
        if (!dropped) return;
        if (agent.weapon !== "classic") draft.droppedWeapons.push({ id: `swap-${Date.now()}`, region: agent.region, weapon: agent.weapon });
        agent.weapon = dropped.weapon;
        draft.droppedWeapons = draft.droppedWeapons.filter((item) => item.id !== dropped.id);
        agent.extraActions -= 1;
        addLog(draft, `${agent.name}이 ${WEAPONS[agent.weapon].name}을 주웠습니다.`);
      }
      if (type === "spike") {
        if (agent.team !== "attack" || draft.spike.status !== "dropped" || draft.spike.region !== agent.region) return;
        draft.spike.status = "carried";
        draft.spike.carrierId = agent.id;
        draft.spike.region = null;
        agent.extraActions -= 1;
        addLog(draft, `${agent.name}이 스파이크를 회수했습니다.`);
      }
    });
  };

  const endTurn = () => {
    if (game.winner) return;
    mutate((draft) => {
      const endingSide = draft.turnSide;
      const endingTeam = draft.teams[endingSide];
      for (const agent of endingTeam.agents) {
        if (agent.alive && agent.armorType === "regen") agent.armor = 1;
        const standingInOwnFire = agent.alive && agent.name === "피닉스" && draft.fires.some((fire) => fire.owner === endingSide && fire.region === agent.region);
        if (standingInOwnFire) {
          agent.hp = Math.min(2, agent.hp + 1);
          addLog(draft, `${agent.name}가 불길에서 체력 1을 회복했습니다.`);
        }
        agent.status.aimPenalty = 0;
        agent.status.priorityPenalty = 0;
        agent.status.vulnerable = false;
        agent.status.evadeReady = false;
        agent.status.ignoreGround = false;
        agent.status.highGear = false;
        agent.status.moveBonus = 0;
        agent.status.moveRangeBonus = 0;
      }
      [...draft.teams.attack.agents, ...draft.teams.defense.agents].forEach((agent) => { agent.detected = false; });
      draft.statusEffects = draft.statusEffects.filter((effect) => effect.owner !== endingSide);
      draft.smokes = draft.smokes.filter((smoke) => !(smoke.owner === endingSide && draft.teamTurns[endingSide] >= smoke.expiresOwnerTurn));
      drawFive(endingTeam, draft.cycle * 31 + (endingSide === "attack" ? 7 : 3));
      draft.trade = [];
      draft.revealedEnemyIds = [];
      draft.enemyMemories = [];
      draft.combatQueue = [];
      draft.pendingWait = null;
      draft.targeting = null;
      draft.selectedCardId = null;
      draft.actionsUsed = 0;
      draft.pendingMovement = null;
      draft.pendingReengagements = [];
      draft.pendingContact = null;
      draft.turnStartContactQueue = [];
      draft.groupMovement = null;

      if (endingSide === "defense") {
        draft.turnSide = "attack";
      } else {
        if (draft.cycle >= 16 && !["planting", "planted", "half", "defusing"].includes(draft.spike.status)) {
          draft.winner = "defense";
          draft.winReason = "설치 전 16라운드 시간 종료";
          return;
        }
        draft.cycle += 1;
        draft.turnSide = "defense";
        draft.teams.attack.rushUsed = false;
      }

      const newSide = draft.turnSide;
      draft.turnSerial += 1;
      draft.teamTurns[newSide] += 1;
      if (newSide === "attack" && draft.cycle > 16 && !["planting", "planted", "half", "defusing"].includes(draft.spike.status)) {
        draft.winner = "defense";
        draft.winReason = "설치 전 16라운드 시간 종료";
        return;
      }
      const startingTeam = draft.teams[newSide];
      draft.selectedAgentId = startingTeam.agents.find((agent) => agent.alive)?.id ?? null;
      draft.fires = draft.fires.filter((zone) => !(zone.owner === newSide && zone.expiresOn === "owner-start" && draft.teamTurns[newSide] >= zone.expiresOwnerTurn));
      draft.stims = draft.stims.filter((zone) => !(zone.owner === newSide && zone.expiresOn === "owner-start" && draft.teamTurns[newSide] >= zone.expiresOwnerTurn));

      if (newSide === "attack" && draft.spike.status === "planting") {
        const planter = getAgent(draft, draft.spike.actorId);
        if (planter?.alive && planter.region === draft.spike.region) {
          draft.spike.status = "planted";
          draft.spike.installedCycle = draft.cycle;
          draft.spike.carrierId = null;
          draft.teams.defense.cover = true;
          draft.teams.attack.plantsThisRound += 1;
          addLog(draft, `스파이크 설치 완료. 폭발까지 8라운드 · 수비팀 커버 카드 생성.`);
          addAnalyticsEvent(draft, "attack", "objective", "스파이크 설치 완료");
        }
      }

      if (newSide === "defense") {
        if (draft.spike.status === "defusing") {
          const defuser = getAgent(draft, draft.spike.actorId);
          if (defuser?.alive && defuser.region === draft.spike.region) {
            draft.spike.status = "defused";
            draft.teams.defense.defusesThisRound += 1;
            draft.winner = "defense";
            draft.winReason = "최종 해체 완료";
            addLog(draft, `해체 완료 — 마지막 순간 클러치 성공.`);
            addAnalyticsEvent(draft, "defense", "objective", "스파이크 최종 해체 완료");
            return;
          }
          draft.spike.status = "half";
        }
        if (["planted", "half", "defusing"].includes(draft.spike.status) && draft.spike.installedCycle !== null && draft.cycle > draft.spike.installedCycle + 1) {
          draft.spike.explosion -= 1;
          if (draft.spike.explosion <= 0) {
            draft.spike.status = "exploded";
            draft.winner = "attack";
            draft.winReason = "스파이크 폭발";
            addAnalyticsEvent(draft, "attack", "objective", "스파이크 폭발");
            return;
          }
        }
      }
      addLog(draft, `${SIDE_LABEL[newSide]} 턴 시작 · 행동카드 3장.`);
      draft.turnStartContactQueue = startingTeam.agents.filter((agent) => agent.alive).map((agent) => agent.id);
      queueNextTurnStartContact(draft);
    });
  };

  const startSpecial = (special: "rush" | "cover") => {
    mutate((draft) => {
      draft.targeting = { kind: "special", special };
      draft.selectedCardId = null;
      addLog(draft, `${special === "rush" ? "러쉬" : "커버"} 출발 구역을 선택하세요.`);
    });
  };

  const buyWeapon = (weapon: Weapon) => {
    if (!selectedAgent || activeTeam.buyLocked || weapon.unlock > game.matchRound || activeTeam.funds < weapon.price) return;
    mutate((draft) => {
      const team = draft.teams[draft.turnSide];
      const agent = getAgent(draft, selectedAgent.id);
      if (!agent || team.funds < weapon.price || team.buyLocked) return;
      agent.weapon = weapon.id;
      team.funds -= weapon.price;
      addLog(draft, `${agent.name} 구매: ${weapon.name} · 팀 자금 ${team.funds}원.`);
    });
  };

  const buyArmor = (type: "light" | "regen" | "heavy", price: number, value: number) => {
    if (!selectedAgent || activeTeam.buyLocked || activeTeam.funds < price) return;
    mutate((draft) => {
      const team = draft.teams[draft.turnSide];
      const agent = getAgent(draft, selectedAgent.id);
      if (!agent || team.funds < price || team.buyLocked) return;
      agent.armorType = type;
      agent.armor = value;
      agent.armorDamaged = false;
      team.funds -= price;
      addLog(draft, `${agent.name} 방어구 구매 · 팀 자금 ${team.funds}원.`);
    });
  };

  const cancelTargeting = () => mutate((draft) => { draft.targeting = null; const card = draft.teams[draft.turnSide].hand.find((item) => item.id === draft.selectedCardId); if (!card?.used) draft.selectedCardId = null; });
  const skipWait = () => mutate((draft) => { const agent = getAgent(draft, draft.pendingWait); if (agent) clearWait(agent); draft.pendingWait = null; });
  const engageOptionalContact = (enemyId: string) => mutate((draft) => acceptPendingContact(draft, enemyId));
  const skipOptionalContact = () => mutate((draft) => declinePendingContact(draft));

  const refreshCombatView = (scene: CombatScene, agent: Agent, shot: ShotResult | null, before: { hp: number; armor: number }) => {
    const view = scene.mover.id === agent.id ? scene.mover : scene.holder;
    view.region = agent.region;
    view.weapon = agent.weapon;
    view.hpBefore = before.hp;
    view.armorBefore = before.armor;
    view.hpAfter = agent.hp;
    view.armorAfter = agent.armor;
    view.shot = shot;
  };

  const performCombatShot = (draft: GameState, scene: CombatScene, shooter: Agent, target: Agent) => {
    const shooterBefore = { hp: shooter.hp, armor: shooter.armor };
    const targetBefore = { hp: target.hp, armor: target.armor };
    scene.mover.shot = null;
    scene.holder.shot = null;
    if (target.status.evadeReady) {
      target.status.evadeReady = false;
      scene.evaded = true;
      refreshCombatView(scene, shooter, null, shooterBefore);
      refreshCombatView(scene, target, null, targetBefore);
      addLog(draft, `${target.name}이 순풍으로 ${shooter.name}의 공격을 회피했습니다.`);
      return { shot: null, text: `${target.name}이 공격을 회피했습니다.` };
    }
    scene.evaded = false;
    const shooterIsMover = shooter.id === scene.mover.id;
    const targetMoveBonus = target.id === scene.mover.id ? scene.moverMoveBonus : 0;
    const shot = makeShot(draft, shooter, target, scene.range, !shooterIsMover && scene.waiting, shooterIsMover ? scene.moverAimBonus : 0, targetMoveBonus);
    recordShot(draft, shooter.team, shot, `${shooter.name} → ${target.name}`);
    if (shooterIsMover) scene.moverAimBonus = 0;
    if (shot.hit) applyDamage(draft, shooter, target, shot.damage, `${shooter.name} ${shot.head ? "헤드샷" : "몸통 명중"}`);
    else addLog(draft, `${shooter.name} → ${target.name} 빗나감 [${shot.aimRoll}/${shot.aimSize} - ${shot.moveRoll}/${shot.moveSize}]`);
    refreshCombatView(scene, shooter, shot, shooterBefore);
    refreshCombatView(scene, target, null, targetBefore);
    return { shot, text: shot.hit ? `${shooter.name} ${shot.head ? "헤드샷" : "몸통 명중"} · 피해 ${shot.damage}` : `${shooter.name}의 공격이 빗나갔습니다.` };
  };

  const performTurretShot = (draft: GameState, scene: CombatScene) => {
    const target = getAgent(draft, scene.mover.id);
    const turret = draft.deployables.find((item) => item.id === scene.deviceId && item.kind === "turret");
    if (!target?.alive || !turret) {
      scene.resolved = true;
      scene.phase = "result";
      scene.result = !target?.alive ? "대상이 이미 제거되어 포탑 교전이 종료됩니다." : "포탑이 파괴되어 교전이 종료됩니다.";
      return;
    }
    const targetBefore = { hp: target.hp, armor: target.armor };
    const aimRoll = roll(5);
    const moveSize = Math.max(1, finalStats(draft, target).move + scene.moverMoveBonus);
    const moveRoll = roll(moveSize);
    const hit = aimRoll - moveRoll > 0;
    const vulnerableBonus = hit && target.status.vulnerable ? 1 : 0;
    const damage = hit ? 1 + vulnerableBonus : 0;
    const shot: ShotResult = { hit, head: false, damage, aimRoll, moveRoll, aimSize: 5, moveSize };
    recordShot(draft, turret.owner, shot, `${scene.holder.name} → ${target.name}`);
    scene.mover.shot = null;
    scene.holder.shot = shot;
    if (hit) {
      if (vulnerableBonus) target.status.vulnerable = false;
      applyDamage(draft, getAgent(draft, turret.ownerAgentId), target, damage, "포탑 명중");
      draft.deployables = draft.deployables.filter((item) => item.id !== turret.id);
      scene.result = `${scene.holder.name} 명중 · 피해 ${damage}. 포탑은 공격 후 소멸합니다.`;
    } else {
      addLog(draft, `${scene.holder.name}이 ${target.name}을 놓쳤습니다 [${aimRoll}/5 - ${moveRoll}/${moveSize}].`);
      scene.result = `${scene.holder.name}의 공격이 빗나갔습니다. 포탑은 감시를 유지합니다.`;
    }
    addTrade(draft, { enemyId: target.id, team: turret.owner, sourceId: turret.id });
    refreshCombatView(scene, target, null, targetBefore);
    scene.resolved = true;
    scene.pendingNextActorId = null;
    scene.phase = "result";
    checkWinner(draft);
  };

  const executeCombatRetreat = (draft: GameState, scene: CombatScene, agent: Agent, region: number) => {
    const before = { hp: agent.hp, armor: agent.armor };
    const from = agent.region;
    clearWait(agent);
    if (draft.pendingWait === agent.id) draft.pendingWait = null;
    cancelProgress(draft, agent);
    if (draft.pendingMovement?.agentId === agent.id) draft.pendingMovement = null;
    agent.region = region;
    agent.status.aimPenalty = Math.max(1, agent.status.aimPenalty);
    agent.status.moveBonus = Math.min(-1, agent.status.moveBonus);
    if (agent.id === scene.mover.id) scene.moverRetreated = true;
    const opponentId = agent.id === scene.mover.id ? scene.holder.id : scene.mover.id;
    const opponent = getAgent(draft, opponentId);
    if (agent.team === draft.turnSide) addTrade(draft, { enemyId: opponentId, team: agent.team, sourceId: agent.id });
    triggerHazards(draft, agent, from, region);
    const enemyToRemember = agent.team === draft.turnSide ? opponent : agent;
    if (enemyToRemember) rememberEnemy(draft, draft.turnSide, enemyToRemember);
    draft.analytics[agent.team].retreats += 1;
    addAnalyticsEvent(draft, agent.team, "combat", `${agent.name} 교전 이탈 · ${regionName(region)}`);
    if (agent.alive) draft.pendingReengagements.push({
      agentId: agent.id,
      priority: 5,
      canAttack: agent.id === scene.mover.id ? scene.canMoverAttack : true,
      moveBonus: 0,
    });
    refreshCombatView(scene, agent, null, before);
    addLog(draft, `${agent.name} 교전 이탈: ${regionName(from)} → ${regionName(region)} · 에임/무빙 -1.`);
  };

  const prepareTailwind = (draft: GameState, scene: CombatScene, target: Agent, shooter: Agent) => {
    draft.statusEffects = draft.statusEffects.filter((effect) => !(effect.targetId === shooter.id && effect.consumeOnAttack));
    scene.phase = "tailwind";
    scene.tailwindActorId = target.id;
    scene.pendingShotActorId = shooter.id;
    scene.result = `${target.name}이 순풍으로 이동할 인접 구역을 선택합니다.`;
  };

  const resolveSimultaneousChoices = (draft: GameState, scene: CombatScene) => {
    const mover = getAgent(draft, scene.mover.id);
    const holder = getAgent(draft, scene.holder.id);
    if (!mover || !holder) return;
    const moverChoice = scene.choices[mover.id];
    const holderChoice = scene.choices[holder.id];
    if (!moverChoice || !holderChoice) return;
    const lines: string[] = [];
    scene.mover.shot = null;
    scene.holder.shot = null;
    const moverBefore = { hp: mover.hp, armor: mover.armor };
    const holderBefore = { hp: holder.hp, armor: holder.armor };
    let moverShot: ShotResult | null = null;
    let holderShot: ShotResult | null = null;
    if (moverChoice.type === "attack" && scene.canMoverAttack) {
      if (holder.status.evadeReady) { holder.status.evadeReady = false; scene.evaded = true; lines.push(`${holder.name} 회피`); }
      else moverShot = makeShot(draft, mover, holder, scene.range, false, scene.moverAimBonus, 0);
    }
    if (holderChoice.type === "attack") {
      if (mover.status.evadeReady) { mover.status.evadeReady = false; scene.evaded = true; lines.push(`${mover.name} 회피`); }
      else holderShot = makeShot(draft, holder, mover, scene.range, scene.waiting, 0, scene.moverMoveBonus);
    }
    if (moverShot) recordShot(draft, mover.team, moverShot, `${mover.name} → ${holder.name}`);
    if (holderShot) recordShot(draft, holder.team, holderShot, `${holder.name} → ${mover.name}`);
    scene.moverAimBonus = 0;
    if (moverShot?.hit) applyDamage(draft, mover, holder, moverShot.damage, `${mover.name} ${moverShot.head ? "헤드샷" : "몸통 명중"}`);
    if (holderShot?.hit) applyDamage(draft, holder, mover, holderShot.damage, `${holder.name} ${holderShot.head ? "헤드샷" : "몸통 명중"}`);
    if (moverChoice.type === "attack" && moverShot) lines.push(moverShot.hit ? `${mover.name} 피해 ${moverShot.damage}` : `${mover.name} 빗나감`);
    if (holderChoice.type === "attack" && holderShot) lines.push(holderShot.hit ? `${holder.name} 피해 ${holderShot.damage}` : `${holder.name} 빗나감`);
    refreshCombatView(scene, mover, moverShot, moverBefore);
    refreshCombatView(scene, holder, holderShot, holderBefore);
    if (mover.alive && moverChoice.type === "retreat" && moverChoice.retreatRegion) executeCombatRetreat(draft, scene, mover, moverChoice.retreatRegion);
    if (holder.alive && holderChoice.type === "retreat" && holderChoice.retreatRegion) executeCombatRetreat(draft, scene, holder, holderChoice.retreatRegion);
    if (moverChoice.type === "advance" && mover.alive) {
      scene.moverAdvanced = true;
      if (mover.team === draft.turnSide) addTrade(draft, { enemyId: holder.id, team: mover.team, sourceId: mover.id });
      lines.push(`${mover.name} 계속 이동`);
    }
    const exited = moverChoice.type === "retreat" || holderChoice.type === "retreat" || moverChoice.type === "advance";
    scene.resolved = exited || !mover.alive || !holder.alive;
    scene.pendingNextActorId = scene.resolved ? null : scene.firstActorId;
    scene.phase = "result";
    scene.result = exited ? "동일 우선도 행동에서 이동 또는 이탈이 선언되어 교전이 종료됩니다." : lines.join(" · ") || "양쪽 행동이 처리되었습니다.";
    checkWinner(draft);
  };

  const combatAttack = () => mutate((draft) => {
    const scene = draft.combatQueue[0];
    if (!scene || scene.kind !== "agent" || scene.phase !== "choice") return;
    const actor = getAgent(draft, scene.actorId);
    const targetId = scene.actorId === scene.mover.id ? scene.holder.id : scene.mover.id;
    const target = getAgent(draft, targetId);
    if (!actor?.alive || !target?.alive || (actor.id === scene.mover.id && !scene.canMoverAttack)) return;
    if (scene.simultaneous) {
      scene.choices[actor.id] = { type: "attack" };
      const otherId = actor.id === scene.firstActorId ? scene.secondActorId : scene.firstActorId;
      if (!scene.choices[otherId]) {
        scene.actorId = otherId;
        scene.result = `${actor.name} 행동 선택 완료. 동일 우선도 상대의 선택을 기다립니다.`;
        return;
      }
      const mover = getAgent(draft, scene.mover.id);
      const holder = getAgent(draft, scene.holder.id);
      const moverChoice = scene.choices[scene.mover.id];
      const holderChoice = scene.choices[scene.holder.id];
      if (mover && holder && moverChoice?.type === "attack" && holder.status.evadeReady) {
        prepareTailwind(draft, scene, holder, mover);
        return;
      }
      if (mover && holder && holderChoice?.type === "attack" && mover.status.evadeReady) {
        prepareTailwind(draft, scene, mover, holder);
        return;
      }
      resolveSimultaneousChoices(draft, scene);
      return;
    }
    if (target.status.evadeReady) {
      prepareTailwind(draft, scene, target, actor);
      return;
    }
    const outcome = performCombatShot(draft, scene, actor, target);
    scene.resolved = !target.alive || !actor.alive;
    scene.pendingNextActorId = scene.resolved ? null : target.id;
    scene.phase = "result";
    scene.result = scene.resolved ? `${target.name}이 제거되어 교전이 종료됩니다.` : outcome.text;
    checkWinner(draft);
  });

  const combatRetreat = (region: number) => mutate((draft) => {
    const scene = draft.combatQueue[0];
    if (!scene || scene.kind !== "agent" || scene.phase !== "choice") return;
    const actor = getAgent(draft, scene.actorId);
    if (!actor?.alive || !(GRAPH.get(actor.region) ?? []).includes(region)) return;
    if (scene.simultaneous) {
      scene.choices[actor.id] = { type: "retreat", retreatRegion: region };
      const otherId = actor.id === scene.firstActorId ? scene.secondActorId : scene.firstActorId;
      if (!scene.choices[otherId]) {
        scene.actorId = otherId;
        scene.result = `${actor.name} 행동 선택 완료. 동일 우선도 상대의 선택을 기다립니다.`;
        return;
      }
      resolveSimultaneousChoices(draft, scene);
      return;
    }
    executeCombatRetreat(draft, scene, actor, region);
    scene.resolved = true;
    scene.pendingNextActorId = null;
    scene.phase = "result";
    scene.result = `${actor.name}이 교전에서 이탈했습니다.`;
  });

  const combatAdvance = () => mutate((draft) => {
    const scene = draft.combatQueue[0];
    if (!scene || scene.kind !== "agent" || scene.phase !== "choice" || scene.actorId !== scene.mover.id) return;
    const movement = draft.pendingMovement;
    const mover = getAgent(draft, scene.mover.id);
    const holder = getAgent(draft, scene.holder.id);
    if (!movement || movement.agentId !== scene.mover.id || movement.nextIndex >= movement.path.length || !mover?.alive || !holder?.alive) return;
    if (scene.simultaneous) {
      scene.choices[mover.id] = { type: "advance" };
      const otherId = mover.id === scene.firstActorId ? scene.secondActorId : scene.firstActorId;
      if (!scene.choices[otherId]) {
        scene.actorId = otherId;
        scene.result = `${mover.name} 행동 선택 완료. 동일 우선도 상대의 선택을 기다립니다.`;
        return;
      }
      resolveSimultaneousChoices(draft, scene);
      return;
    }
    scene.moverAdvanced = true;
    scene.resolved = true;
    scene.phase = "result";
    scene.pendingNextActorId = null;
    if (mover.team === draft.turnSide) addTrade(draft, { enemyId: holder.id, team: mover.team, sourceId: mover.id });
    scene.result = `${mover.name}이 공격하지 않고 남은 이동을 계속합니다.`;
  });

  const tailwindMove = (region: number) => mutate((draft) => {
    const scene = draft.combatQueue[0];
    const agent = getAgent(draft, scene?.tailwindActorId);
    if (!scene || scene.phase !== "tailwind" || !agent?.alive || !(GRAPH.get(agent.region) ?? []).includes(region)) return;
    const from = agent.region;
    clearWait(agent);
    cancelProgress(draft, agent);
    agent.status.evadeReady = false;
    agent.region = region;
    triggerHazards(draft, agent, from, region);
    if (draft.pendingMovement?.agentId === agent.id) {
      const newPath = shortestPath(agent.region, draft.pendingMovement.target);
      draft.pendingMovement.path = newPath.length ? newPath : [agent.region];
      draft.pendingMovement.nextIndex = 1;
    } else if (agent.alive) {
      draft.pendingReengagements.push({ agentId: agent.id, priority: agent.id === scene.mover.id ? scene.moverPriorityBase : 3, canAttack: true, moveBonus: 0 });
    }
    scene.evaded = true;
    scene.resolved = true;
    scene.phase = "result";
    scene.pendingNextActorId = null;
    scene.tailwindActorId = null;
    scene.pendingShotActorId = null;
    scene.result = `${agent.name}이 순풍으로 ${regionName(region)}에 이동해 공격을 피했습니다.`;
    refreshCombatView(scene, agent, null, { hp: agent.hp, armor: agent.armor });
  });

  const advanceCombat = () => mutate((draft) => {
    const scene = draft.combatQueue[0];
    if (!scene) return;
    if (scene.phase === "encounter") {
      if (scene.kind === "turret") {
        performTurretShot(draft, scene);
        return;
      }
      scene.phase = "choice";
      scene.actorId = scene.firstActorId;
      scene.result = scene.simultaneous
        ? "동일 우선도입니다. 양쪽 행동을 선택한 뒤 동시에 처리합니다."
        : `${getAgent(draft, scene.firstActorId)?.name}이 우선도에 따라 먼저 행동합니다.`;
      return;
    }
    if (scene.phase !== "result") return;
    if (!scene.resolved && scene.pendingNextActorId) {
      if (scene.pendingNextActorId === scene.firstActorId) scene.round += 1;
      scene.actorId = scene.pendingNextActorId;
      scene.pendingNextActorId = null;
      scene.phase = "choice";
      scene.choices = {};
      scene.result = `${getAgent(draft, scene.actorId)?.name}의 교전 차례입니다. 공격 또는 이탈을 선택하세요.`;
      return;
    }
    draft.combatQueue.shift();
    const mover = getAgent(draft, scene.mover.id);
    while (!draft.combatQueue.length && !draft.pendingContact && draft.pendingReengagements.length) {
      const pending = draft.pendingReengagements.shift()!;
      const agent = getAgent(draft, pending.agentId);
      if (!agent?.alive) continue;
      if (queueCurrentEncounter(draft, agent, pending.priority, pending.canAttack, pending.moveBonus, true, "reengagement")) break;
      agent.status.aimPenalty = 0;
      agent.status.moveBonus = 0;
    }
    if (!draft.combatQueue.length && !draft.pendingContact && mover?.alive && !scene.moverRetreated) {
      if (scene.moverAdvanced && draft.pendingMovement?.agentId === mover.id) continuePendingMovement(draft);
      else if (!queueCurrentEncounter(draft, mover, scene.moverPriorityBase, scene.canMoverAttack, scene.moverMoveBonus, false, "movement")) {
        if (draft.pendingMovement?.agentId === mover.id) continuePendingMovement(draft);
        else addLog(draft, `${mover.name}의 교전이 종료되었습니다.`);
      }
    }
    if (!draft.combatQueue.length && !draft.pendingContact && draft.pendingMovement && draft.pendingMovement.agentId !== mover?.id) continuePendingMovement(draft);
    if (!draft.combatQueue.length && !draft.pendingContact && mover?.alive && scene.moverPriorityBase === 5) {
      mover.status.aimPenalty = 0;
      mover.status.moveBonus = 0;
    }
    if (!draft.combatQueue.length && !draft.pendingContact && !draft.pendingMovement) {
      continueGroupMovement(draft);
      queueNextTurnStartContact(draft);
    }
  });

  const runAiStep = (side: Side) => mutate((draft) => {
    if (!controlledAiSides.includes(side) || draft.turnSide !== side || draft.winner || draft.combatQueue.length) return;
    if (draft.pendingContact) {
      const enemyId = draft.pendingContact.enemyIds.find((id) => getAgent(draft, id)?.alive);
      if (enemyId) acceptPendingContact(draft, enemyId);
      else declinePendingContact(draft);
      return;
    }
    if (draft.groupMovement) {
      continueGroupMovement(draft);
      return;
    }
    const pendingShock = draft.aftershocks
      .filter((effect) => effect.owner !== side && draft.teamTurns[side] >= effect.readyOnTurn)
      .flatMap((effect) => effect.targetIds.map((agentId) => ({ effect, agent: getAgent(draft, agentId) })))
      .find((item) => item.agent?.alive && item.agent.team === side && item.agent.region === item.effect.region);
    if (pendingShock?.agent) {
      const options = GRAPH.get(pendingShock.agent.region) ?? [];
      pendingShock.effect.targetIds = pendingShock.effect.targetIds.filter((id) => id !== pendingShock.agent!.id);
      if (options[0] !== undefined) moveAgent(draft, pendingShock.agent, options[0], "forced");
      else applyDamage(draft, getAgent(draft, pendingShock.effect.ownerAgentId), pendingShock.agent, 2, "여진 폭발");
      draft.aftershocks = draft.aftershocks.filter((effect) => effect.targetIds.length);
      checkWinner(draft);
      return;
    }
    if (draft.pendingWait) {
      const agent = getAgent(draft, draft.pendingWait);
      if (agent?.alive) {
        const enemies = draft.teams[otherSide(side)].agents.filter((enemy) => enemy.alive);
        const target = waitTargetsFor(agent).sort((a, b) => Math.min(...enemies.map((enemy) => distance(a, enemy.region)), 99) - Math.min(...enemies.map((enemy) => distance(b, enemy.region)), 99))[0];
        if (target !== undefined) setWait(draft, agent, [target]);
      }
      draft.pendingWait = null;
      return;
    }
    if (draft.targeting) {
      draft.targeting = null;
      return;
    }
    if (side === "defense" && ["planted", "half"].includes(draft.spike.status) && draft.spike.region !== null) {
      const defuser = draft.teams.defense.agents.find((agent) => agent.alive && agent.region === draft.spike.region && agent.extraActions > 0);
      if (defuser && draft.spike.status === "planted") {
        defuser.extraActions -= 1;
        draft.spike.status = "half";
        draft.spike.halfCycle = draft.cycle;
        addLog(draft, `수비팀 AI가 ${defuser.name}으로 반 해체를 완료했습니다.`);
        addAnalyticsEvent(draft, "defense", "objective", `${defuser.name} 반 해체 완료`);
        return;
      }
      if (defuser && draft.spike.status === "half" && draft.spike.halfCycle !== draft.cycle) {
        clearWait(defuser);
        defuser.extraActions -= 1;
        draft.spike.status = "defusing";
        draft.spike.actorId = defuser.id;
        addLog(draft, `수비팀 AI가 ${defuser.name}으로 최종 해체를 시작했습니다.`);
        addAnalyticsEvent(draft, "defense", "objective", `${defuser.name} 최종 해체 시작`);
        return;
      }
    }
    if (draft.spike.status === "dropped") {
      const retriever = draft.teams.attack.agents.find((agent) => agent.alive && agent.region === draft.spike.region && agent.extraActions > 0);
      if (retriever) {
        retriever.extraActions -= 1;
        draft.spike.status = "carried";
        draft.spike.carrierId = retriever.id;
        draft.spike.region = null;
        addLog(draft, `공격팀 AI가 스파이크를 회수했습니다.`);
        return;
      }
    }
    if (draft.spike.status === "carried") {
      const carrier = getAgent(draft, draft.spike.carrierId);
      const carrierRegion = carrier ? REGIONS.find((region) => region.id === carrier.region) : null;
      if (carrier?.alive && carrier.extraActions > 0 && carrierRegion?.site) {
        clearWait(carrier);
        carrier.extraActions -= 1;
        draft.spike = { ...draft.spike, status: "planting", region: carrier.region, actorId: carrier.id, startCycle: draft.cycle };
        addLog(draft, `공격팀 AI가 ${carrierRegion.site} 사이트 스파이크 설치를 시작했습니다.`);
        addAnalyticsEvent(draft, "attack", "objective", `${carrier.name} ${carrierRegion.site} 설치 시작`);
        return;
      }
    }
    if (tryUseAiSkill(draft, side)) return;
    if (draft.turnSide === "attack" && draft.cycle <= 2 && !draft.teams.attack.rushUsed) {
      const groups = new Map<number, Agent[]>();
      draft.teams.attack.agents.filter((agent) => agent.alive).forEach((agent) => groups.set(agent.region, [...(groups.get(agent.region) ?? []), agent]));
      const group = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      if (group?.[1].length > 1) {
        const destination = [...(GRAPH.get(group[0]) ?? [])].sort((a, b) => Math.min(distance(a, 9), distance(a, 14)) - Math.min(distance(b, 9), distance(b, 14)))[0];
        if (destination !== undefined) {
          draft.teams.attack.rushUsed = true;
          draft.groupMovement = { agentIds: group[1].map((agent) => agent.id), nextIndex: 0, target: destination, special: "rush" };
          addLog(draft, `공격팀 AI가 러쉬로 ${regionName(destination)} 방향에 전개합니다.`);
          continueGroupMovement(draft);
          return;
        }
      }
      draft.teams.attack.rushUsed = true;
    }
    if (draft.actionsUsed >= 3) return;
    const team = draft.teams[side];
    const priority: Record<CardKind, number> = { entry: 0, peek: 1, follow: 2, basic: 3, control: 4 };
    const cards = team.hand.filter((card) => !card.used).sort((a, b) => priority[a.kind] - priority[b.kind]);
    for (const card of cards) {
      const candidates = team.agents.filter((agent) => agent.alive && canUseCard(card, agent));
      for (const agent of candidates) {
        if (card.kind === "control") {
          const directions = GRAPH.get(agent.region) ?? [];
          if (directions.length < 2) continue;
          setWait(draft, agent, directions.slice(0, 2));
          draft.selectedAgentId = agent.id;
          playCard(draft, card, agent);
          return;
        }
        const targets = cardTargets(draft, agent, card).filter((region) => region !== agent.region);
        if (!targets.length) continue;
        const objectiveRegion = side === "defense" && ["planted", "half", "defusing"].includes(draft.spike.status) ? draft.spike.region : null;
        const destination = [...targets].sort((a, b) => side === "attack"
          ? Math.min(distance(a, 9), distance(a, 14)) - Math.min(distance(b, 9), distance(b, 14))
          : objectiveRegion !== null
            ? distance(a, objectiveRegion) - distance(b, objectiveRegion)
            : distance(a, 1) - distance(b, 1))[0];
        draft.selectedAgentId = agent.id;
        playCard(draft, card, agent);
        if (!applyActionStartFire(draft, agent)) return;
        moveAgent(draft, agent, destination, card.kind);
        if (card.kind === "basic" && agent.alive) draft.pendingWait = agent.id;
        return;
      }
    }
    draft.actionsUsed = 3;
    addLog(draft, `AI가 사용할 수 있는 행동카드가 없어 턴을 정리합니다.`);
  });
  const selectedRegion = selectedAgent ? REGIONS.find((region) => region.id === selectedAgent.region) : null;
  const droppedHere = selectedAgent ? game.droppedWeapons.find((item) => item.region === selectedAgent.region) : null;
  const nearbyEnemyDeployables = selectedAgent ? game.deployables.filter((item) => item.owner !== selectedAgent.team && distance(selectedAgent.region, item.region) <= 1 && visible.has(item.region)) : [];
  const friendlyCamera = selectedAgent?.name === "사이퍼" ? game.deployables.find((item) => item.kind === "camera" && item.owner === selectedAgent.team) : null;
  const cameraTargets = friendlyCamera ? game.teams[otherSide(selectedAgent!.team)].agents.filter((enemy) => enemy.alive && !enemy.detected && [friendlyCamera.region, ...(GRAPH.get(friendlyCamera.region) ?? [])].includes(enemy.region)) : [];
  const pendingAftershock = game.aftershocks
    .filter((effect) => effect.owner !== game.turnSide && game.teamTurns[game.turnSide] >= effect.readyOnTurn)
    .flatMap((effect) => effect.targetIds.map((agentId) => ({ effect, agent: getAgent(game, agentId) })))
    .find((item) => item.agent?.alive && item.agent.team === game.turnSide && item.agent.region === item.effect.region) ?? null;
  const pendingContactAgent = getAgent(game, game.pendingContact?.agentId);
  const pendingContactEnemies = (game.pendingContact?.enemyIds ?? []).map((id) => getAgent(game, id)).filter((agent): agent is Agent => !!agent?.alive);
  const canPlant = selectedAgent?.team === "attack" && selectedRegion?.site && game.spike.status === "carried" && game.spike.carrierId === selectedAgent.id;
  const canHalf = selectedAgent?.team === "defense" && game.spike.status === "planted" && game.spike.region === selectedAgent.region;
  const canFinal = selectedAgent?.team === "defense" && game.spike.status === "half" && game.spike.region === selectedAgent.region && game.spike.halfCycle !== game.cycle;
  const combatScene = game.combatQueue[0] ?? null;
  const combatActor = combatScene ? getAgent(game, combatScene.actorId) : null;
  const combatRetreatOptions = combatActor ? GRAPH.get(combatActor.region) ?? [] : [];
  const tailwindActor = combatScene ? getAgent(game, combatScene.tailwindActorId) : null;
  const tailwindOptions = tailwindActor ? GRAPH.get(tailwindActor.region) ?? [] : [];
  const nextCombatActor = combatScene ? getAgent(game, combatScene.pendingNextActorId) : null;
  const combatFocusAgent = combatScene?.phase === "encounter" ? getAgent(game, combatScene.firstActorId) : combatScene?.phase === "tailwind" ? tailwindActor : combatScene?.phase === "choice" ? combatActor : nextCombatActor;
  const combatFocusSide = combatFocusAgent?.team ?? (combatScene?.kind === "turret" ? combatScene.holder.team : game.turnSide);
  const combatantIds = new Set([combatScene?.mover.id, combatScene?.holder.id].filter(Boolean));
  const activeCombatAction = combatScene?.kind === "turret" ? "포탑 자동 방어 사격 · 우선도 2" : game.pendingMovement
    ? `${MOVEMENT_LABEL[game.pendingMovement.kind]} · ${Math.max(0, game.pendingMovement.path.length - game.pendingMovement.nextIndex)}칸 남음`
    : selectedCard?.used ? CARD_DATA[selectedCard.kind].name : "위치 교전";
  const canCombatAdvance = !!(combatScene && combatActor?.id === combatScene.mover.id && game.pendingMovement?.agentId === combatActor.id && game.pendingMovement.nextIndex < game.pendingMovement.path.length);
  const winnerReward = game.winner ? roundIncome(game.teams[game.winner], true, game.matchRound) : null;
  const loserReward = game.winner ? roundIncome(game.teams[otherSide(game.winner)], false, game.matchRound) : null;

  return (
    <main className={`game-shell side-${game.turnSide} ${spectatorMode ? "spectator-shell" : ""}`}>
      <AiController game={game} sides={controlledAiSides} paused={spectatorMode && spectatorPaused} speed={spectatorMode ? spectatorSpeed : 1} stepSignal={spectatorStep} onStep={runAiStep} onEndTurn={endTurn} onCombatAttack={combatAttack} onCombatRetreat={combatRetreat} onCombatAdvance={combatAdvance} onCombatContinue={advanceCombat} onTailwind={tailwindMove} />
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">V//T</span>
          <div><strong>PROTOCOL: GRID</strong><span>전술 카드게임 프로토타입</span></div>
        </div>
        <div className="round-display">
          <span className="side-name defense-name">DEF <b>{game.teams.defense.score}</b></span>
          <div className="round-core">
            <span>매치 R{game.matchRound} · 전술 {game.cycle}/16</span>
            <strong>{spectatorMode ? `AI 시뮬레이션 · ${SIDE_LABEL[game.turnSide]}` : `${SIDE_LABEL[game.turnSide]} ${isAiControlledTurn ? "AI 작전 중" : "행동"}`}</strong>
          </div>
          <span className="side-name attack-name"><b>{game.teams.attack.score}</b> ATK</span>
        </div>
        <div className="header-actions">
          {spectatorMode && <div className="spectator-controls" aria-label="AI 관전 제어">
            <button className={spectatorPaused ? "paused" : ""} onClick={() => setSpectatorPaused((value) => !value)}>{spectatorPaused ? "▶ 재생" : "Ⅱ 일시정지"}</button>
            <button onClick={() => setSpectatorSpeed((speed) => speed === 1 ? 2 : speed === 2 ? 4 : 1)}>×{spectatorSpeed} 속도</button>
            <button disabled={!spectatorPaused} onClick={() => setSpectatorStep((step) => step + 1)}>한 단계</button>
          </div>}
          <button onClick={() => setShowHelp(true)}>규칙</button>
          <button className="reset-button" onClick={restartToTitle}>새 게임</button>
        </div>
      </header>

      <section className="battle-layout">
        <aside className="roster-panel panel">
          <div className="panel-heading">
            <div><span className="eyebrow">YOUR SQUAD</span><h2>{SIDE_LABEL[viewerSide]}</h2></div>
            <span className="funds">¤ {viewerTeam.funds}</span>
          </div>
          <div className="action-meter" aria-label={`행동 ${game.actionsUsed}/3`}>
            {[0, 1, 2].map((value) => <i key={value} className={value < game.actionsUsed ? "spent" : ""} />)}
            <span>{3 - game.actionsUsed} ACTIONS</span>
          </div>
          <div className="agent-list">
            {viewerTeam.agents.map((agent, index) => {
              const stats = finalStats(game, agent);
              return (
                <button key={agent.id} className={`agent-row ${game.selectedAgentId === agent.id ? "selected" : ""} ${!agent.alive ? "dead" : ""}`} disabled={isAiControlledTurn} onClick={() => selectAgent(agent.id)}>
                  <span className={`agent-avatar role-${agent.role} ${agentArtClass(agent.name)}`} aria-label={`${agent.name} 초상`}><small>{index + 1}</small></span>
                  <span className="agent-copy"><strong>{agent.name}</strong><small>{ROLE_LABEL[agent.role]} · {WEAPONS[agent.weapon].name}</small></span>
                  <span className="agent-vitals"><b>{agent.hp + agent.armor}</b><small>A{stats.aim} / M{stats.move}</small></span>
                </button>
              );
            })}
          </div>
          <div className="enemy-summary">
            <span className="eyebrow">OPPOSITION</span>
            <div className="enemy-pips">
              {game.teams[otherSide(viewerSide)].agents.map((agent) => { const revealed = observed.has(agent.region) || agent.detected || (allowLastKnown && game.revealedEnemyIds.includes(agent.id)); return <i key={agent.id} className={`${agent.alive ? "" : "down"} ${revealed ? "detected" : ""}`} title={`${agent.name}${revealed ? " · 위치 공개" : ""}`} />; })}
            </div>
          </div>
          <button className="shop-trigger" disabled={isAiControlledTurn || viewerTeam.buyLocked || !!game.winner} onClick={() => setShowShop(true)}>
            <span>장비 구매</span><small>{isAiControlledTurn ? "상대 작전 중" : viewerTeam.buyLocked ? "행동 시작 후 잠김" : "무기 · 방어구"}</small>
          </button>
          <div className="deck-status"><span>덱 {viewerTeam.deck.length}</span><span>버림 {viewerTeam.discard.length}</span><span>손패 5</span></div>
        </aside>

        <section className="arena-column">
          <div className="map-header">
            <div><span className="live-dot" /> LIVE TACTICAL MAP</div>
            <div className="map-legend"><span><i className="dot ally" /> 아군</span><span><i className="dot enemy" /> 적</span><span><i className="dot target" /> 행동 가능</span></div>
          </div>
          <div className="map-board fog-on">
            <div className="map-vignette" />
            <div className="map-coordinate-layer">
            <div className="map-image" />
            {EDGES.map(([a, b]) => {
              const start = REGIONS.find((region) => region.id === a)!;
              const end = REGIONS.find((region) => region.id === b)!;
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * 180 / Math.PI;
              const smoke = game.smokes.find((item) => item.key === edgeKey(a, b));
              const smokeKnown = !!smoke && (smoke.owner === viewerSide || observed.has(a) || observed.has(b));
              return <span key={`${a}-${b}`} className={`map-edge ${smokeKnown ? "smoked" : ""}`} style={{ left: `${start.x}%`, top: `${start.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />;
            })}
            {mapWaitCones.map((cone) => <span key={cone.id} className={`wait-cone ${cone.hostile ? "hostile" : "friendly"} ${cone.lastKnown ? "last-known" : ""}`} style={connectionStyle(cone.from, cone.to)} title={`${cone.agentName} · ${cone.to}번 구역 대기`}><i /></span>)}
            {game.lastSkillFx && (game.lastSkillFx.owner === viewerSide || observed.has(game.lastSkillFx.targetRegion)) && (() => {
              const fx = game.lastSkillFx;
              const target = REGIONS.find((region) => region.id === fx.targetRegion)!;
              return <div key={fx.id} className={`skill-map-fx team-${fx.owner} kind-${fx.kind} fx-${fx.skillId}`} aria-label={`${fx.label} 사용 연출`}>
                {fx.fromRegion !== fx.targetRegion && (fx.owner === viewerSide || (observed.has(fx.fromRegion) && observed.has(fx.targetRegion))) && <span className="skill-fx-flight" style={connectionStyle(fx.fromRegion, fx.targetRegion)}><i className={skillArtClass(fx.skillId)} /></span>}
                <span className="skill-fx-impact" style={{ left: `${target.x}%`, top: `${target.y}%` }}><i className={skillArtClass(fx.skillId)} /><b>{fx.label}</b></span>
              </div>;
            })()}
            {REGIONS.map((region) => {
              const allies = viewerTeam.agents.filter((agent) => agent.alive && agent.region === region.id);
               const enemies = game.teams[otherSide(viewerSide)].agents.filter((agent) => agent.alive && agent.region === region.id);
               const observedNow = observed.has(region.id);
               const remembered = visible.has(region.id);
               const memoriesHere = allowLastKnown ? game.enemyMemories.filter((memory) => memory.observer === viewerSide && memory.region === region.id) : [];
               const rememberedEnemies = memoriesHere.map((memory) => getAgent(game, memory.agentId)).filter((agent): agent is Agent => !!agent?.alive && !agent.detected && !observed.has(agent.region));
               const shownEnemies = [...enemies.filter((agent) => {
                 const memory = allowLastKnown ? game.enemyMemories.find((item) => item.observer === viewerSide && item.agentId === agent.id) : undefined;
                 if (memory && memory.region !== agent.region && !observedNow && !agent.detected) return false;
                 return observedNow || agent.detected || (allowLastKnown && game.revealedEnemyIds.includes(agent.id));
               }), ...rememberedEnemies.filter((agent) => !enemies.some((enemy) => enemy.id === agent.id))];
              const revealedEnemies = shownEnemies.filter((agent) => observedNow || agent.detected || (allowLastKnown && game.revealedEnemyIds.includes(agent.id)));
              const isValid = !isAiControlledTurn && validTargets.has(region.id);
              const devices = game.deployables.filter((item) => item.region === region.id && (item.owner === viewerSide || observedNow));
              const fire = game.fires.some((item) => item.region === region.id && (item.owner === viewerSide || observedNow));
              const stim = game.stims.some((item) => item.region === region.id && (item.owner === viewerSide || observedNow));
              const installedSpike = ["planting", "planted", "half", "defusing"].includes(game.spike.status);
              const hasSpike = game.spike.region === region.id && (viewerSide === "attack" || observedNow || installedSpike);
              return (
                <button
                  key={region.id}
                  className={`region-node ${isValid ? "valid" : ""} ${region.site ? "site-node" : ""} ${!remembered ? "unknown" : ""}`}
                  style={{ left: `${region.x}%`, top: `${region.y}%` }}
                  onClick={() => handleRegionClick(region.id)}
                  aria-label={`${region.id}번 ${region.name}${isValid ? ", 선택 가능" : ""}`}
                >
                  <span className="node-core">{region.id}</span>
                  <span className="node-label">{region.site && <b>{region.site}</b>}{region.name}</span>
                  <span className="unit-stack ally-stack">
                    {allies.map((agent) => <i key={agent.id} className={`unit-token role-${agent.role} ${agentArtClass(agent.name)} ${game.selectedAgentId === agent.id ? "selected" : ""}`} onClick={(event) => { event.stopPropagation(); selectAgent(agent.id); }} title={`${agent.name} · ${WEAPONS[agent.weapon].name}`} aria-label={`${agent.name} 지도 토큰`} />)}
                  </span>
                  <span className="unit-stack enemy-stack">
                    {shownEnemies.map((agent) => { const memory = memoriesHere.find((item) => item.agentId === agent.id); const identified = observedNow || agent.detected || (allowLastKnown && game.revealedEnemyIds.includes(agent.id)); const lastKnown = allowLastKnown && !!memory && !agent.detected && !observed.has(agent.region); return <i key={agent.id} className={`unit-token hostile ${agentArtClass(agent.name)} ${identified ? "identified" : ""} ${lastKnown ? "last-known" : ""}`} title={`${agent.name} · ${identified ? WEAPONS[agent.weapon].name : "장비 미확인"}${lastKnown ? " · 이번 턴 마지막 확인 위치" : ""}`} aria-label={`${agent.name} 지도 토큰`}>{lastKnown && <small>잔상</small>}</i>; })}
                  </span>
                  {revealedEnemies.length > 0 && <span className="enemy-wait-intel">{revealedEnemies.map((agent) => { const memory = memoriesHere.find((item) => item.agentId === agent.id); const waitDirs = memory?.waitDirs ?? agent.waitDirs; return <i key={agent.id}><b>{agent.name}</b>{waitDirs.length ? `대기 → ${waitDirs.join(" · ")}` : "대기 없음"}</i>; })}</span>}
                  {(devices.length > 0 || fire || stim || hasSpike) && <span className="effect-stack">
                    {devices.map((item) => <i key={item.id} title={item.kind}>{item.kind === "trip" ? "⌁" : item.kind === "camera" ? "◉" : item.kind === "turret" ? "⌖" : "!"}</i>)}
                    {fire && <i className="fire">▲</i>}{stim && <i className="stim">+</i>}{hasSpike && <i className="spike">◆</i>}
                  </span>}
                </button>
              );
            })}
            </div>
            <div className="objective-hud">
              <span className={`spike-icon status-${game.spike.status}`}>◆</span>
              <div><small>SPIKE</small><strong>{game.spike.status === "carried" ? "운반 중" : game.spike.status === "dropped" ? "회수 필요" : game.spike.status === "planting" ? "설치 진행" : game.spike.status === "planted" ? "설치됨" : game.spike.status === "half" ? "반 해체" : game.spike.status === "defusing" ? "최종 해체" : game.spike.status === "defused" ? "해체 완료" : "폭발"}</strong></div>
              {["planted", "half", "defusing"].includes(game.spike.status) && <b>{game.spike.explosion}</b>}
            </div>
            {!isAiControlledTurn && (game.pendingWait || game.targeting) && <div className="targeting-banner">
              <strong>{game.pendingWait ? WEAPONS[getAgent(game, game.pendingWait)?.weapon ?? "classic"].type === "sniper" ? "저격 대기 구역 선택 · 거리 1~2" : "대기 구역 선택 · 거리 1" : game.targeting?.kind === "control" ? "두 방향을 지정" : game.targeting?.kind === "special" ? `${game.targeting.special === "rush" ? "러쉬" : "커버"} 이동` : "스킬 목표 선택"}</strong>
              <span>{game.pendingWait ? "청록색 구역 하나를 직접 선택하면 해당 구역 진입에 반응합니다." : "청록색으로 표시된 구역을 선택하세요."}</span>
              <button onClick={(event) => { event.stopPropagation(); if (game.pendingWait) skipWait(); else cancelTargeting(); }}>취소</button>
            </div>}
            {!isAiControlledTurn && game.pendingContact && pendingContactAgent && !combatScene && <section className="contact-choice-panel" aria-label="거리 1 교전 선택" aria-live="polite">
              <header><span>VISUAL CONTACT // 거리 1</span><strong>{pendingContactAgent.name}이 적을 발견했습니다</strong><p>보이는 것만으로는 교전하지 않습니다. 카드 소모 없이 지금 교전을 시작할 수 있습니다.</p></header>
              <div>{pendingContactEnemies.map((enemy) => <button key={enemy.id} className="contact-engage" onClick={() => engageOptionalContact(enemy.id)}><i className={agentArtClass(enemy.name)} /><span><b>{withAndJosa(enemy.name)} 교전</b><small>{regionName(enemy.region)} · 기본 우선도 3</small></span></button>)}</div>
              <button className="contact-skip" onClick={skipOptionalContact}><b>교전하지 않기</b><small>{game.pendingContact.source === "turn-start" ? "턴을 그대로 시작합니다" : "남은 이동·행동을 계속합니다"}</small></button>
            </section>}
          </div>

          <div className="hand-zone">
            <div className="hand-label"><span>TACTICAL HAND</span><small>카드 선택 → 요원 선택 → 지도 구역 선택</small></div>
            <div className="card-row">
              {viewerTeam.hand.map((card, index) => {
                const unusable = displayedAgent ? !canUseCard(card, displayedAgent) : false;
                return (
                  <button key={card.id} className={`action-card card-${card.kind} ${game.selectedCardId === card.id ? "selected" : ""} ${card.used ? "used" : ""}`} disabled={isAiControlledTurn || card.used || game.actionsUsed >= 3 || !!game.pendingWait || !!game.targeting || !!game.pendingContact || !!game.winner} onClick={() => selectCard(card)}>
                    <span className="card-index">0{index + 1}</span><span className="card-tag">{CARD_DATA[card.kind].tag}</span>
                    <strong>{CARD_DATA[card.kind].name}</strong><p>{CARD_DATA[card.kind].description}</p>
                    <small className={unusable ? "blocked" : ""}>{isAiControlledTurn ? "상대 작전 중 · 내 카드" : unusable ? `${ROLE_LABEL[displayedAgent!.role]} 사용 불가` : `${card.source} 덱 제공`}</small>
                  </button>
                );
              })}
              {!isAiControlledTurn && viewerSide === "attack" && game.cycle <= 2 && !viewerTeam.rushUsed && <button className="special-card rush-card" onClick={() => startSpecial("rush")} disabled={!!game.targeting || !!game.pendingWait || !!game.pendingContact}><span>ROUND {game.cycle}</span><strong>러쉬</strong><p>한 구역 아군 전원을 인접 구역으로 이동</p></button>}
              {!isAiControlledTurn && viewerSide === "defense" && viewerTeam.cover && <button className="special-card cover-card" onClick={() => startSpecial("cover")} disabled={!!game.targeting || !!game.pendingWait || !!game.pendingContact}><span>ONE USE</span><strong>커버</strong><p>보관 가능한 단체 재진입 카드</p></button>}
            </div>
          </div>
        </section>

        <aside className="intel-panel panel">
          {spectatorMode && <MatchAnalysisPanel game={game} compact />}
          {displayedAgent ? <>
            <div className="selected-agent-head">
              <span className={`large-avatar role-${displayedAgent.role} ${agentArtClass(displayedAgent.name)}`} aria-label={`${displayedAgent.name} 초상`} />
              <div><span className="eyebrow">{isAiControlledTurn ? "YOUR AGENT" : "SELECTED AGENT"}</span><h2>{displayedAgent.name}</h2><p>{ROLE_LABEL[displayedAgent.role]} · {regionName(displayedAgent.region)}</p></div>
            </div>
            <div className="stat-grid">
              <div><span>체력</span><strong>{displayedAgent.hp}/2</strong></div><div><span>방어</span><strong>{displayedAgent.armor}</strong></div>
              <div><span>에임</span><strong>{finalStats(game, displayedAgent).aim}</strong></div><div><span>무빙</span><strong>{finalStats(game, displayedAgent).move}</strong></div>
            </div>
            <div className="loadout-line"><div><span className="eyebrow">PRIMARY</span><strong>{WEAPONS[displayedAgent.weapon].name}</strong></div><div className="damage-chip">{WEAPONS[displayedAgent.weapon].body}<small>BODY</small> / {WEAPONS[displayedAgent.weapon].head}<small>HEAD</small></div></div>
            <div className="extra-action-head"><span>추가행동</span><strong>{displayedAgent.extraActions}</strong></div>
            {!isAiControlledTurn && selectedAgent && selectedAgent.id === displayedAgent.id && selectedCard && !selectedCard.used && !game.pendingContact && canUseCard(selectedCard, selectedAgent) && <button className="pre-action-button" onClick={commitPreAction}><span>카드 사용 전</span><strong>사전 추가행동 +1</strong><small>스킬·설치·줍기 후 선택한 카드 행동을 완료합니다.</small></button>}
            {!isAiControlledTurn && selectedAgent && selectedCard?.used && selectedCard.committedAgentId === selectedAgent.id && <div className="committed-card-note"><span>COMMITTED</span><strong>{CARD_DATA[selectedCard.kind].name} 행동을 지도에서 완료하세요.</strong></div>}
            <div className="skills-list">
              {AGENTS[displayedAgent.name].skills.map((item) => (
                <button key={item.id} disabled={isAiControlledTurn || displayedAgent.extraActions < 1 || (displayedAgent.skills[item.id] ?? 0) < 1 || !!game.targeting || !!game.pendingWait || !!game.pendingContact || !!game.winner} onClick={() => activateSkill(item)} title={item.description}>
                  <span className={`skill-glyph ${skillArtClass(item.id)}`} aria-label={`${item.name} 아이콘`} /><span><strong>{item.name}</strong><small>{item.description}</small></span><b>×{displayedAgent.skills[item.id] ?? 0}</b>
                </button>
              ))}
            </div>
            <div className="quick-actions">
              {!isAiControlledTurn && selectedAgent && <>
                {canPlant && <button disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => quickAction("plant")}>◆ 스파이크 설치</button>}
                {canHalf && <button disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => quickAction("half")}>◇ 반 해체</button>}
                {canFinal && <button disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => quickAction("final")}>◇ 최종 해체</button>}
                {droppedHere && <button disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => quickAction("pickup")}>{WEAPONS[droppedHere.weapon].name} 줍기</button>}
                {selectedAgent.team === "attack" && game.spike.status === "dropped" && game.spike.region === selectedAgent.region && <button disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => quickAction("spike")}>◆ 스파이크 회수</button>}
                {cameraTargets.map((enemy) => <button key={`cam-${enemy.id}`} disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => cameraDetect(enemy.id)}>◉ 스파이캠 탐지 · {enemy.region}번</button>)}
                {nearbyEnemyDeployables.map((device) => <button key={device.id} disabled={selectedAgent.extraActions < 1 || !!game.pendingContact} onClick={() => destroyDeployable(device.id)}>⌁ {device.kind} 파괴 · {device.region}번</button>)}
              </>}
            </div>
          </> : <div className="empty-inspector">요원을 선택하세요.</div>}
          <div className="combat-log">
            <div className="log-heading"><span>전투 기록</span><i>LIVE</i></div>
            {isAiControlledTurn && !spectatorMode ? <div className="opponent-turn-note"><b>상대 작전 진행 중</b><span>아군의 거리 1 시야와 직접 교전으로 확인되는 정보만 표시합니다.</span></div> : <ol>{viewerLog.map((entry, index) => <li key={`${entry}-${index}`}><span>{String(viewerLog.length - index).padStart(2, "0")}</span>{entry}</li>)}</ol>}
          </div>
          {spectatorMode ? <div className="spectator-status"><i className={spectatorPaused ? "paused" : ""} /><span>{spectatorPaused ? "시뮬레이션 일시정지" : `AI 자동 진행 · ×${spectatorSpeed}`}</span><small>전장 전체 정보 공개</small></div> : <button className="end-turn" disabled={isAiControlledTurn || !!game.pendingWait || !!game.targeting || !!game.pendingContact || !!game.winner || !!combatScene || !!pendingAftershock || !!(selectedCard?.used && selectedCard.committedAgentId)} onClick={endTurn}><span>턴 종료</span><small>{game.actionsUsed}/3 카드 사용 · 미사용 카드도 버림</small></button>}
        </aside>
      </section>

      {game.winner && game.combatQueue.length === 0 && <div className="modal-backdrop victory-backdrop"><div className={`victory-card winner-${game.winner} ${spectatorMode ? "spectator-victory" : ""}`}><span className="eyebrow">ROUND {game.matchRound} COMPLETE</span><h1>{SIDE_LABEL[game.winner]} 승리</h1><p>{game.winReason}</p>{spectatorMode && <MatchAnalysisPanel game={game} />}<div className="round-economy"><article><span>{SIDE_LABEL[game.winner]}</span><b>+{winnerReward?.total}원</b><small>라운드 {winnerReward?.resultIncome} · 보너스 {winnerReward?.bonus}</small></article><article><span>{SIDE_LABEL[otherSide(game.winner)]}</span><b>+{loserReward?.total}원</b><small>라운드 {loserReward?.resultIncome} · 보너스 {loserReward?.bonus}</small></article></div><div className="victory-actions"><button onClick={() => startNextRound(false)}><span>{spectatorMode ? "AI 자동 구매 후 계속" : "장비·경제 유지"}</span><strong>다음 라운드</strong></button><button onClick={() => startNextRound(true)}><span>공수 교대 · 경제 초기화</span><strong>진영 교대</strong></button><button className="secondary" onClick={restartToTitle}>새 작전</button></div></div></div>}

      {pendingAftershock && !combatScene && <div className="modal-backdrop"><section className="choice-modal"><span className="eyebrow">AFTERSHOCK // FORCED CHOICE</span><h2>{pendingAftershock.agent!.name} · 여진 해결</h2><p>{regionName(pendingAftershock.effect.region)}을 떠나거나 피해 2를 받아야 합니다. 이동하면 대기와 설치·해체 진행을 잃습니다.</p><div className="choice-grid"><button className="danger-choice" onClick={() => resolveAftershock(pendingAftershock.effect.id, pendingAftershock.agent!.id)}><b>위치 유지</b><small>피해 2 받기</small></button>{(GRAPH.get(pendingAftershock.agent!.region) ?? []).map((region) => <button key={region} onClick={() => resolveAftershock(pendingAftershock.effect.id, pendingAftershock.agent!.id, region)}><b>{region}번 이동</b><small>{regionName(region)}</small></button>)}</div></section></div>}

      {game.targeting?.kind === "skill" && ((game.targeting.candidateAgentIds?.length ?? 0) > 0 || (game.targeting.candidateDeployableIds?.length ?? 0) > 0) && <div className="modal-backdrop"><section className="choice-modal"><span className="eyebrow">TARGET SELECT</span><h2>스킬 목표 선택</h2><div className="choice-grid">{game.targeting.candidateAgentIds?.map((id) => { const target = getAgent(game, id); return target ? <button key={id} onClick={() => resolveSkillCandidate(id, "agent")}><b>{target.name}</b><small>{target.team === game.turnSide ? "아군" : "탐지된 적"} · {target.region}번</small></button> : null; })}{game.targeting.candidateDeployableIds?.map((id) => { const device = game.deployables.find((item) => item.id === id); return device ? <button key={id} onClick={() => resolveSkillCandidate(id, "deployable")}><b>{device.kind}</b><small>설치물 · {device.region}번</small></button> : null; })}</div><button className="choice-cancel" onClick={cancelTargeting}>취소</button></section></div>}

      {combatScene && <div className="modal-backdrop combat-backdrop"><section className={`combat-modal phase-${combatScene.phase}`} aria-label="전투 진행" aria-live="polite">
        <header className="combat-modal-head"><div><span className="combat-alert"><i /> ENGAGEMENT ACTIVE</span><h2>{combatScene.kind === "turret" ? "포탑 자동 교전" : `지속 교전 · ${combatScene.round}회차`}</h2></div><div><span>GAME TURN</span><b>{SIDE_LABEL[game.turnSide]} · 전술 {game.cycle}</b></div></header>
        <div ref={combatTurnRef} className={`combat-turn-banner focus-${combatFocusSide}`}>
          <div className={`combat-game-turn ${game.turnSide}`}><span>현재 게임 턴</span><b>{SIDE_LABEL[game.turnSide]}</b><small>행동카드 {game.actionsUsed}/3 사용</small></div>
          <i>›</i>
          <div className="combat-actor-turn"><span>{combatScene.phase === "encounter" ? combatScene.kind === "turret" ? "포탑 감지" : "적 접촉" : combatScene.phase === "tailwind" ? "반응 선택" : combatScene.phase === "choice" ? "지금 행동" : combatScene.resolved ? "교전 결과" : "다음 행동"}</span><strong>{combatScene.phase === "encounter" ? `${combatScene.mover.name} ↔ ${combatScene.holder.name}` : combatFocusAgent ? `${SIDE_LABEL[combatFocusAgent.team]} · ${combatFocusAgent.name}` : combatScene.kind === "turret" ? "포탑 사격 결과" : "결과 확인"}</strong><small>{combatScene.phase === "encounter" ? combatScene.kind === "turret" ? "포탑이 우선도 2로 자동 사격합니다" : "지도와 대기 구역을 확인한 뒤 교전을 시작하세요" : combatScene.phase === "choice" ? "공격·이탈 중 선택하세요" : combatScene.phase === "tailwind" ? "순풍 이동지를 선택하세요" : combatScene.resolved ? "아래 버튼으로 교전을 정리하세요" : `${nextCombatActor?.name ?? "다음 요원"} 차례가 이어집니다`}</small></div>
          {combatScene.kind === "turret" ? <em className={combatScene.holder.team === game.turnSide ? "team-action" : "reaction-action"}>자동 방어 장치</em> : combatFocusAgent && <em className={combatFocusAgent.team === game.turnSide ? "team-action" : "reaction-action"}>{combatFocusAgent.team === game.turnSide ? "현재 팀 행동" : "상대 반응 차례"}</em>}
        </div>
        <div className="combat-location"><span>교전 위치</span><strong>{regionName(combatScene.mover.region)}</strong><i>거리 {combatScene.range}</i><strong>{regionName(combatScene.holder.region)}</strong>{combatScene.waiting && <b>대기 공격 발동</b>}</div>
        {combatScene.phase === "encounter" && <section className="encounter-intro">
          <div className={`encounter-portrait ${agentArtClass(combatScene.mover.name)}`}><span>{combatScene.mover.name}</span></div>
          <div><span>{combatScene.kind === "turret" ? "AUTOMATED DEFENSE" : "ENEMY CONTACT"}</span><strong>{combatScene.kind === "turret" ? "포탑 감시선 진입" : "시야에 적 포착"}</strong><small>우선도 {combatScene.mover.priority} : {combatScene.holder.priority}{combatScene.kind === "turret" ? " · 포탑 선제 사격" : combatScene.waiting ? " · 대기 반응" : " · 범위 교전"}</small></div>
          <div className={`encounter-portrait hostile ${combatScene.holder.kind === "turret" ? `turret-portrait ${skillArtClass("turret")}` : agentArtClass(combatScene.holder.name)}`}><span>{combatScene.holder.name}</span></div>
        </section>}
        <section className="combat-map-overview">
          <header><div><span>LIVE TACTICAL MAP</span><strong>교전 중 전장 현황</strong></div><small>얼굴 토큰 · 대기 시야 · 이번 턴 마지막 확인 위치</small></header>
          <div className="combat-mini-map">
            <div className="map-coordinate-layer combat-coordinate-layer">
            <div className="combat-mini-map-image" />
            {EDGES.map(([a, b]) => { const smoke = game.smokes.find((item) => item.key === edgeKey(a, b)); const smokeKnown = !!smoke && (smoke.owner === viewerSide || observed.has(a) || observed.has(b)); return <span key={`combat-edge-${a}-${b}`} className={`map-edge ${smokeKnown ? "smoked" : ""}`} style={connectionStyle(a, b)} />; })}
            {mapWaitCones.map((cone) => <span key={`combat-${cone.id}`} className={`wait-cone ${cone.hostile ? "hostile" : "friendly"} ${cone.lastKnown ? "last-known" : ""}`} style={connectionStyle(cone.from, cone.to)}><i /></span>)}
            {REGIONS.map((region) => {
              const friendlies = viewerTeam.agents.filter((agent) => agent.alive && agent.region === region.id);
              const knownEnemies = game.teams[otherSide(viewerSide)].agents.filter((agent) => {
                if (!agent.alive) return false;
                const memory = allowLastKnown ? game.enemyMemories.find((item) => item.observer === viewerSide && item.agentId === agent.id) : undefined;
                const displayRegion = memory && !observed.has(agent.region) && !agent.detected ? memory.region : agent.region;
                const known = combatantIds.has(agent.id) || observed.has(agent.region) || agent.detected || (allowLastKnown && game.revealedEnemyIds.includes(agent.id)) || !!memory;
                return known && displayRegion === region.id;
              });
              const engaged = region.id === combatScene.mover.region || region.id === combatScene.holder.region;
              return <span key={`combat-node-${region.id}`} className={`combat-map-node ${engaged ? "engaged" : ""} ${region.site ? "site" : ""}`} style={{ left: `${region.x}%`, top: `${region.y}%` }}>
                <b>{region.id}</b><small>{region.site ?? ""}</small>
                <i className="combat-map-units">{friendlies.map((agent) => <em key={agent.id} className={`mini-face friendly ${agentArtClass(agent.name)}`} title={`${agent.name} · ${agent.region}번`} />)}{knownEnemies.map((agent) => { const memory = allowLastKnown ? game.enemyMemories.find((item) => item.observer === viewerSide && item.agentId === agent.id) : undefined; const ghost = allowLastKnown && !!memory && !observed.has(agent.region) && !agent.detected && !combatantIds.has(agent.id); return <em key={agent.id} className={`mini-face hostile ${ghost ? "ghost" : ""} ${agentArtClass(agent.name)}`} title={`${agent.name}${ghost ? " · 마지막 확인" : ""}`} />; })}</i>
              </span>;
            })}
            </div>
            <div className="combat-map-focus"><span>CONTACT</span><b>{combatScene.mover.region} ↔ {combatScene.holder.region}</b></div>
          </div>
        </section>
        <div className="combat-stage" ref={combatStageRef}>
          {([combatScene.mover, combatScene.holder] as CombatFighterView[]).map((fighter, index) => {
            const shot = fighter.shot;
            const opponentShot = index === 0 ? combatScene.holder.shot : combatScene.mover.shot;
            const isMover = index === 0;
            const survived = fighter.hpAfter > 0;
            const acting = combatScene.phase === "choice" && fighter.id === combatScene.actorId;
            const liveAgent = getAgent(game, fighter.id);
            const liveStats = liveAgent ? finalStats(game, liveAgent) : null;
            return <article key={fighter.id} className={`combat-fighter ${isMover ? "mover" : "holder"} team-${fighter.team} ${fighter.kind === "turret" ? "turret-fighter" : ""} ${survived ? "" : "eliminated"} ${acting ? "acting" : ""} ${shot ? "fired" : ""} ${opponentShot?.hit ? "landed" : ""}`}>
              {acting && <div className="acting-ribbon">지금 행동</div>}
              <div className="combat-side-tag">{SIDE_LABEL[fighter.team]} · {fighter.kind === "turret" ? "자동 방어 장치" : isMover ? "진입" : combatScene.waiting ? "대기 반응" : "범위 내 반응"}</div>
              <div className={`combat-avatar role-${fighter.role} ${fighter.kind === "turret" ? `turret-avatar ${skillArtClass("turret")}` : agentArtClass(fighter.name)}`} aria-label={`${fighter.name} ${fighter.kind === "turret" ? "장치" : "초상"}`}><span>{fighter.kind === "turret" ? "AUTO" : isMover ? "ACT" : "REACT"}</span></div>
              <h3>{fighter.name}</h3><p>{fighter.kind === "turret" ? "설치물 · 에임 5 · 피해 1" : `${ROLE_LABEL[fighter.role]} · ${WEAPONS[fighter.weapon].name}`}</p>
              <div className="combat-priority"><span>공격 우선도</span><strong>{fighter.priority}</strong></div>
              <div className="combat-vitals"><span>내구도</span><b>{fighter.hpBefore + fighter.armorBefore}</b><i>→</i><strong>{fighter.hpAfter + fighter.armorAfter}</strong></div>
              {fighter.kind === "turret" ? <div className="combat-live-stats"><span>MODE <b>AUTO</b></span><span>DMG <b>1</b></span><span>AIM <b>5</b></span><span>PRIO <b>2</b></span></div> : liveAgent && <div className="combat-live-stats"><span>HP <b>{liveAgent.hp}</b></span><span>ARMOR <b>{liveAgent.armor}</b></span><span>AIM <b>{liveStats?.aim}</b></span><span>MOVE <b>{liveStats?.move}</b></span></div>}
              <div className={`combat-roll ${!shot ? "no-shot" : shot.hit ? shot.head ? "headshot" : "hit" : "miss"}`}>
                {shot ? <><span className="dice aim-die"><small>AIM</small><b>{shot.aimRoll}</b><i>D{shot.aimSize}</i></span><em>−</em><span className="dice move-die"><small>MOVE</small><b>{shot.moveRoll}</b><i>D{shot.moveSize}</i></span><div><strong>{shot.hit ? shot.head ? "HEADSHOT" : fighter.kind === "turret" ? "TURRET HIT" : "BODY HIT" : "MISS"}</strong><small>{shot.hit ? `피해 ${shot.damage}` : "피해 없음"}</small></div></> : <div><strong>{combatScene.evaded ? "EVADED" : acting ? "YOUR TURN" : fighter.kind === "turret" ? "TARGET LOCK" : "STANDING BY"}</strong><small>{combatScene.evaded ? "순풍으로 공격 회피" : acting ? "공격 또는 이탈 선택" : fighter.kind === "turret" ? "포탑 자동 사격 대기" : "상대 행동 대기"}</small></div>}
              </div>
            </article>;
          })}
          <div className="combat-versus"><span>PRIORITY</span><b>VS</b><i>{combatScene.mover.priority === combatScene.holder.priority ? "=" : combatScene.mover.priority < combatScene.holder.priority ? "←" : "→"}</i></div>
        </div>
        <section className="combat-situation">
          <header><div><span>SITUATION BOARD</span><strong>현재 전장 현황</strong></div><small>이번 팀 턴에 확인된 정보가 계속 표시됩니다</small></header>
          <div className="combat-context-grid">
            <div><span>진행</span><b>매치 R{game.matchRound} · 전술 {game.cycle}/16</b></div>
            <div><span>현재 행동</span><b>{activeCombatAction}</b></div>
            <div><span>스파이크</span><b>{SPIKE_STATUS_LABEL[game.spike.status]}{game.spike.region ? ` · ${game.spike.region}번` : ""}</b></div>
            <div><span>교전 규칙</span><b>{combatScene.kind === "turret" ? "포탑 우선도 2 · 자동 1회 공격" : combatScene.simultaneous ? "동일 우선도 · 동시 처리" : `${Math.min(combatScene.mover.priority, combatScene.holder.priority)} 우선 행동`}</b></div>
          </div>
          <div className="combat-intel-grid">
            {(["defense", "attack"] as Side[]).map((side) => <article key={side} className={`combat-team-intel ${side}`}>
              <h4><span>{side === "defense" ? "DEF" : "ATK"}</span>{SIDE_LABEL[side]}<b>{game.teams[side].agents.filter((agent) => agent.alive).length}명 생존</b></h4>
              {game.teams[side].agents.map((agent) => {
                const memory = allowLastKnown ? game.enemyMemories.find((item) => item.observer === viewerSide && item.agentId === agent.id) : undefined;
                const currentlyKnown = side === viewerSide || combatantIds.has(agent.id) || agent.detected || observed.has(agent.region);
                const known = currentlyKnown || !!memory || (allowLastKnown && game.revealedEnemyIds.includes(agent.id));
                const displayRegion = memory && !currentlyKnown ? memory.region : agent.region;
                const displayWaitDirs = memory && !currentlyKnown ? memory.waitDirs : agent.waitDirs;
                const stats = currentlyKnown ? finalStats(game, agent) : null;
                const flags = [
                  !agent.alive ? "제거" : "",
                  known && displayWaitDirs.length ? `대기 ${displayWaitDirs.join("·")}` : "",
                  memory && !currentlyKnown ? "마지막 확인" : "",
                  currentlyKnown && agent.detected ? "탐지" : "",
                  currentlyKnown && agent.status.vulnerable ? "취약" : "",
                  currentlyKnown && isChanneling(game, agent) ? game.spike.status === "planting" ? "설치 중" : "해체 중" : "",
                ].filter(Boolean);
                return <div key={agent.id} className={`combat-intel-row ${agent.alive ? "" : "down"} ${combatantIds.has(agent.id) ? "engaged" : ""} ${known ? "known" : "unknown"}`}>
                  <i className={`role-${agent.role} ${agentArtClass(agent.name)}`} aria-label={`${agent.name} 초상`} />
                  <span><strong>{agent.name}</strong><small>{known ? `${displayRegion}번 · ${WEAPONS[agent.weapon].name}` : "위치·장비 미확인"}</small></span>
                  <b>{currentlyKnown ? agent.alive ? `HP ${agent.hp}+${agent.armor}` : "제거" : agent.alive ? "생존" : "제거"}<small>{stats ? `A${stats.aim} / M${stats.move}` : "NO DATA"}</small></b>
                  <em>{flags.length ? flags.join(" · ") : known ? "대기 없음" : "정보 없음"}</em>
                </div>;
              })}
            </article>)}
          </div>
        </section>
        <div className="combat-result"><div><span>{combatScene.phase === "choice" ? "CURRENT TURN" : "RESULT"}</span><strong>{combatScene.result}</strong><p>{combatScene.kind === "turret" ? "포탑은 이 교전에서 자동으로 한 번 사격한 뒤 원래 이동과 요원 교전을 이어갑니다." : "누군가 제거되거나 자기 교전 차례에 이탈할 때까지 이 1대1 교전은 계속됩니다."}</p></div><div className="revealed-hold"><span>{combatScene.kind === "turret" ? "포탑 감시 구역" : "공개된 대기"}</span><b>{combatScene.waitDirections.length ? combatScene.waitDirections.map((region) => `${region}번`).join(" · ") : "대기 없음"}</b></div></div>
        {combatScene.phase === "encounter" ? <button className="combat-continue encounter-start" onClick={advanceCombat}><span>{combatScene.kind === "turret" ? "포탑 공격 확인" : "접촉 확인 · 교전 개시"}</span><small>{combatScene.kind === "turret" ? "에임 D5와 대상 무빙 주사위를 굴립니다" : "우선도와 전술 맵을 확인했습니다"}</small></button> : combatScene.phase === "tailwind" && tailwindActor ? <div className="combat-actions tailwind-actions"><div><span>REACTION // {tailwindActor.name}</span><strong>순풍 이동 구역을 선택하세요</strong></div><div className="retreat-actions"><span>순풍</span>{tailwindOptions.map((region) => <button key={region} onClick={() => tailwindMove(region)}><b>{region}번</b><small>{regionName(region)}</small></button>)}</div></div> : combatScene.phase === "choice" && combatActor ? <div className="combat-actions"><div><span>ACTION // {combatActor.name}</span><strong>이번 교전 차례를 선택하세요</strong></div><button className="fight-action" disabled={combatActor.id === combatScene.mover.id && !combatScene.canMoverAttack} onClick={combatAttack}><b>교전</b><small>{combatActor.id === combatScene.mover.id && !combatScene.canMoverAttack ? "이 행동에서는 공격 불가" : `${WEAPONS[combatActor.weapon].name}으로 공격`}</small></button>{canCombatAdvance && <button className="advance-action" onClick={combatAdvance}><b>계속 이동</b><small>공격하지 않고 남은 경로 진행</small></button>}<div className="retreat-actions"><span>이탈</span>{combatRetreatOptions.map((region) => <button key={region} onClick={() => combatRetreat(region)}><b>{region}번</b><small>{regionName(region)}</small></button>)}</div></div> : <button className="combat-continue" onClick={advanceCombat}><span>{combatScene.resolved ? combatScene.kind === "turret" ? "이동·교전 계속" : "교전 종료" : "다음 교전 차례"}</span><small>{combatScene.resolved ? "남은 적이 있으면 다음 1대1 또는 남은 이동을 진행합니다" : `${getAgent(game, combatScene.pendingNextActorId)?.name ?? "다음 요원"} 행동`}</small></button>}
      </section></div>}

      {showShop && !isAiControlledTurn && <div className="modal-backdrop" onMouseDown={() => setShowShop(false)}><div className="shop-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">TEAM ARMORY</span><h2>{selectedAgent?.name} 장비 구매</h2></div><div><strong>¤ {activeTeam.funds}</strong><button onClick={() => setShowShop(false)}>닫기</button></div></div>
        <p className="shop-note">매치 1라운드: 클래식과 셰리프만 해금 · 구매 자금은 팀 공동입니다. 기존 장비 환불은 없습니다.</p>
        <div className="weapon-grid">{Object.values(WEAPONS).map((weapon) => <button key={weapon.id} className={selectedAgent?.weapon === weapon.id ? "equipped" : ""} disabled={weapon.unlock > game.matchRound || weapon.price > activeTeam.funds || activeTeam.buyLocked} onClick={() => buyWeapon(weapon)} title={weaponRuleSummary(weapon)}><span>{weapon.type === "sniper" ? "SNP" : weapon.type === "shotgun" ? "SG" : "RFL"}</span><strong>{weapon.name}</strong><small>몸통 {weapon.body} · 헤드 {weapon.head}</small><small className="weapon-rule-copy">{weaponRuleSummary(weapon)}</small><b>{weapon.price ? `${weapon.price}원` : "기본"}</b></button>)}</div>
        <h3>방어구</h3><div className="armor-grid"><button onClick={() => buyArmor("light", 2, 1)} disabled={activeTeam.funds < 2}><strong>소형 방어구</strong><small>방어 1 · 2원</small></button><button onClick={() => buyArmor("regen", 4, 1)} disabled={activeTeam.funds < 4}><strong>회복 방어구</strong><small>팀 턴 종료 회복 · 4원</small></button><button onClick={() => buyArmor("heavy", 6, 2)} disabled={activeTeam.funds < 6}><strong>대형 방어구</strong><small>방어 2 · 6원</small></button></div>
      </div></div>}

      {showHelp && <div className="modal-backdrop" onMouseDown={() => setShowHelp(false)}><div className="rules-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">FIELD MANUAL // V0.1</span><h2>핵심 규칙</h2></div><button onClick={() => setShowHelp(false)}>닫기</button></div>
        <div className="rules-grid">
          <article><b>01</b><h3>턴</h3><p>수비 구매 → 수비 배치 → 공격 구매 후 수비가 먼저 행동합니다. 손패 5장 중 카드 3장을 사용합니다.</p></article>
          <article><b>02</b><h3>지속 교전</h3><p>낮은 우선도 숫자부터 행동합니다. 각 교전 차례에 공격 또는 이탈을 선택하며, 제거되거나 이탈할 때까지 1대1이 계속됩니다.</p></article>
          <article><b>03</b><h3>추가행동</h3><p>카드 한 장마다 해당 요원이 추가행동 1회를 얻습니다. 스킬, 설치·해체, 총기·스파이크 줍기에 사용합니다.</p></article>
          <article><b>04</b><h3>시야</h3><p>아군이 있는 구역과 인접 구역만 확인합니다. 연막은 시야와 대기를 끊지만 이동은 막지 않습니다.</p></article>
          <article><b>05</b><h3>트레이드</h3><p>아군 사망·이탈·정찰 장치 파괴 시 적에게 표식. 같은 턴 다음 아군의 첫 교전에 에임 +1, 우선도 1단계 향상.</p></article>
          <article><b>06</b><h3>스파이크</h3><p>설치는 다음 공격 턴 시작, 최종 해체는 다음 수비 턴 시작에 완료됩니다. 같은 시점이면 해체가 먼저입니다.</p></article>
        </div>
        <p className="prototype-note">PC와 모바일에서 2인 핫시트 또는 공격팀 AI 모드로 플레이할 수 있습니다. 지속 교전, 라운드 경제, 장비 보존과 역할 스킬을 지원합니다.</p>
      </div></div>}
    </main>
  );
}
