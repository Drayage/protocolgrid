"use client";

import { useMemo, useState } from "react";

type Side = "attack" | "defense";
type Role = "duelist" | "initiator" | "controller" | "sentinel";
type CardKind = "basic" | "peek" | "entry" | "follow" | "control";
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
  detected: boolean;
  skills: Record<string, number>;
  status: AgentStatus;
}

interface ActionCard {
  id: string;
  kind: CardKind;
  source: string;
  used: boolean;
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
}

interface ZoneEffect {
  id: string;
  owner: Side;
  region: number;
  expiresCycle: number;
}

interface SmokeEffect {
  key: string;
  owner: Side;
  expiresCycle: number;
}

interface TargetingState {
  kind: "skill" | "control" | "special";
  agentId?: string;
  skillId?: string;
  cardId?: string;
  selected?: number[];
  special?: "rush" | "cover";
  origin?: number;
}

interface TradeState {
  enemyId: string;
  team: Side;
  sourceId: string;
}

interface CombatFighterView {
  id: string;
  name: string;
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

interface CombatScene {
  id: string;
  mover: CombatFighterView;
  holder: CombatFighterView;
  range: number;
  waiting: boolean;
  simultaneous: boolean;
  evaded: boolean;
  result: string;
  waitDirections: number[];
}

interface GameState {
  matchRound: number;
  cycle: number;
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
  trade: TradeState | null;
  combatQueue: CombatScene[];
  revealedEnemyIds: string[];
  waitCounter: number;
  log: string[];
  winner: Side | null;
  winReason: string | null;
}

const SIDE_LABEL: Record<Side, string> = { attack: "공격팀", defense: "수비팀" };
const ROLE_LABEL: Record<Role, string> = {
  duelist: "타격대",
  initiator: "척후대",
  controller: "전략가",
  sentinel: "감시자",
};

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

const skill = (id: string, name: string, price: string, target: SkillTarget, description: string): SkillDefinition => ({
  id, name, price, target, description,
});

const AGENTS: Record<string, AgentTemplate> = {
  "제트": { name: "제트", role: "duelist", skills: [skill("tailwind", "순풍", "2원 · 1회", "self", "다음 최초 교전의 공격을 회피합니다."), skill("updraft", "상승 기류", "1원 · 2회", "self", "다음 이동 거리와 무빙이 1 증가합니다.")] },
  "레이즈": { name: "레이즈", role: "duelist", skills: [skill("paint", "페인트탄", "2원 · 1회", "adjacent", "인접 구역의 적 모두에게 피해 1, 설치물을 파괴합니다."), skill("blast", "폭발 팩", "1원 · 2회", "adjacent", "인접 구역으로 강제 이동하며 대기를 해제합니다.")] },
  "피닉스": { name: "피닉스", role: "duelist", skills: [skill("curve", "커브볼", "2원 · 1회", "adjacent", "인접 구역 적의 첫 공격 에임을 3 낮춥니다."), skill("hot", "뜨거운 손", "1원 · 2회", "adjacent", "구역에 다음 턴까지 피해 1의 불길을 만듭니다.")] },
  "네온": { name: "네온", role: "duelist", skills: [skill("gear", "고속 기어", "2원 · 1회", "self", "다음 이동 거리와 무빙이 1 증가합니다."), skill("relay", "릴레이 볼트", "1원 · 2회", "adjacent", "구역 적의 우선도 숫자를 1 높입니다.")] },
  "사이퍼": { name: "사이퍼", role: "sentinel", skills: [skill("trip", "함정 철선", "1원 · 2회", "adjacent", "현재 구역과 인접 구역 사이에 철선을 설치합니다."), skill("camera", "스파이캠", "2원 · 1회", "self", "현재 구역에 주변을 밝히는 카메라를 설치합니다.")] },
  "킬조이": { name: "킬조이", role: "sentinel", skills: [skill("turret", "포탑", "2원 · 1회", "adjacent", "현재 구역에서 선택 방향을 감시하는 포탑을 설치합니다."), skill("alarm", "알람봇", "1원 · 2회", "self", "현재 구역에 탐지·취약 알람봇을 설치합니다.")] },
  "소바": { name: "소바", role: "initiator", skills: [skill("recon", "정찰 화살", "2원 · 1회", "range2", "거리 2 구역과 인접 구역의 적을 탐지합니다."), skill("shock", "충격 화살", "1원 · 2회", "range2", "거리 2 구역의 적 또는 설치물에 피해 1을 줍니다.")] },
  "브리치": { name: "브리치", role: "initiator", skills: [skill("flash", "섬광 폭발", "2원 · 1회", "adjacent", "인접 구역 적의 첫 공격 에임을 3 낮춥니다."), skill("aftershock", "여진", "1원 · 2회", "adjacent", "인접 구역의 적에게 피해 2, 진행 행동을 취소합니다.")] },
  "브림스톤": { name: "브림스톤", role: "controller", skills: [skill("smoke", "공중 연막", "1원 · 2회", "range2", "목표 방향의 첫 연결을 다음 턴까지 차단합니다."), skill("stim", "전투 자극제", "2원 · 1회", "self", "현재 구역 아군의 에임과 우선도를 강화합니다.")] },
  "오멘": { name: "오멘", role: "controller", skills: [skill("dark", "어둠의 장막", "1원 · 2회", "any", "선택 구역의 첫 연결에 전역 연막을 설치합니다."), skill("shadow", "어둠의 발걸음", "2원 · 1회", "range2", "거리 2 이내로 순간이동하고 우선도 4로 교전합니다.")] },
};

const CARD_DATA: Record<CardKind, { name: string; tag: string; description: string }> = {
  basic: { name: "기본 행동", tag: "MOVE", description: "인접 구역 1칸 이동 · 교전 우선도 3 · 이후 한 방향 대기" },
  peek: { name: "피킹", tag: "SCOUT", description: "이번 행동 무빙 +2 · 공격하지 않고 첫 홀드를 빼낸 뒤 후퇴" },
  entry: { name: "엔트리", tag: "BREACH", description: "타격대 전용 · 최대 2칸 · 중간 공격 불가 · 도착 우선도 2" },
  follow: { name: "추종", tag: "FOLLOW", description: "척후대·전략가 전용 · 거리 2 아군 위치까지 합류" },
  control: { name: "지역 장악", tag: "HOLD ×2", description: "감시자 전용 · 현재 구역에서 인접 두 방향 동시 대기" },
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

function createAgent(name: string, team: Side, index: number): Agent {
  const template = AGENTS[name];
  const presetAttack: WeaponId[] = ["phantom", "judge", "bulldog", "spectre", "outlaw"];
  const presetDefense: WeaponId[] = ["vandal", "spectre", "outlaw", "bulldog", "operator"];
  const skills: Record<string, number> = {};
  template.skills.forEach((item) => { skills[item.id] = item.price.includes("2회") ? 2 : 1; });
  return {
    id: `${team}-${name}`,
    name,
    role: template.role,
    team,
    region: team === "attack" ? 1 : 7,
    hp: 2,
    armor: index < 2 ? 2 : 1,
    armorType: index < 2 ? "heavy" : "light",
    armorDamaged: false,
    alive: true,
    weapon: team === "attack" ? presetAttack[index] : presetDefense[index],
    extraActions: 0,
    waitDirs: [],
    waitStamp: 0,
    detected: false,
    skills,
    status: { aimPenalty: 0, priorityPenalty: 0, moveBonus: 0, moveRangeBonus: 0, evadeReady: false, vulnerable: false },
  };
}

function createTeam(side: Side, names: string[], seed: number): TeamState {
  const agents = names.map((name, index) => createAgent(name, side, index));
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
    funds: 65,
    rushUsed: false,
    cover: false,
    buyLocked: false,
  };
}

function createInitialGame(
  attackNames = ["제트", "레이즈", "소바", "브리치", "브림스톤"],
  defenseNames = ["피닉스", "네온", "사이퍼", "킬조이", "오멘"],
): GameState {
  const attack = createTeam("attack", attackNames, 17);
  const defense = createTeam("defense", defenseNames, 29);
  return {
    matchRound: 3,
    cycle: 1,
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
    trade: null,
    combatQueue: [],
    revealedEnemyIds: [],
    waitCounter: 0,
    log: ["수비팀이 먼저 행동합니다.", "작전 개시 — 손패에서 카드 3장을 사용하세요."],
    winner: null,
    winReason: null,
  };
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

function roll(max: number) {
  return Math.floor(Math.random() * Math.max(1, max)) + 1;
}

function finalStats(game: GameState, agent: Agent) {
  const base = ROLE_STATS[agent.role];
  const weapon = WEAPONS[agent.weapon];
  const stimmed = game.stims.some((zone) => zone.owner === agent.team && zone.region === agent.region);
  return {
    aim: Math.max(1, base.aim + weapon.aim - agent.status.aimPenalty + (stimmed ? 1 : 0)),
    move: Math.max(1, base.move + weapon.move + agent.status.moveBonus),
    priorityBoost: stimmed ? 1 : 0,
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
  let aim = stats.aim + aimBonus;
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
  if (defender.status.vulnerable && damage > 0) damage += 1;
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

function applyDamage(game: GameState, attacker: Agent | null, defender: Agent, damage: number, label: string) {
  if (damage <= 0 || !defender.alive) return;
  const armorDamage = Math.min(defender.armor, damage);
  defender.armor -= armorDamage;
  if (armorDamage > 0) defender.armorDamaged = true;
  defender.hp -= damage - armorDamage;
  addLog(game, `${label} — ${defender.name} 피해 ${damage} (체력 ${Math.max(0, defender.hp)} / 방어 ${defender.armor})`);
  if (defender.hp > 0) return;
  defender.hp = 0;
  defender.alive = false;
  defender.waitDirs = [];
  cancelProgress(game, defender);
  if (defender.weapon !== "classic") {
    game.droppedWeapons.push({ id: `drop-${Date.now()}-${defender.id}`, region: defender.region, weapon: defender.weapon });
  }
  if (game.spike.carrierId === defender.id && game.spike.status === "carried") {
    game.spike = { ...game.spike, status: "dropped", carrierId: null, region: defender.region, actorId: null };
    addLog(game, `스파이크가 ${REGIONS.find((region) => region.id === defender.region)?.name}에 떨어졌습니다.`);
  }
  addLog(game, `${defender.name} 제거.`);
  if (attacker && defender.team === game.turnSide) {
    game.trade = { enemyId: attacker.id, team: defender.team, sourceId: defender.id };
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
    if (path.length > 1 && isSmokeBlocked(game, path[0], path[1])) return;
  }

  if (!game.revealedEnemyIds.includes(enemy.id)) game.revealedEnemyIds.push(enemy.id);
  const revealedWaitDirs = [...enemy.waitDirs];
  const moverBefore = { hp: mover.hp, armor: mover.armor };
  const enemyBefore = { hp: enemy.hp, armor: enemy.armor };
  const baseMoverStats = finalStats(game, mover);
  const baseEnemyStats = finalStats(game, enemy);
  const baseMoverPrio = Math.max(1, moverPriority + mover.status.priorityPenalty - baseMoverStats.priorityBoost);
  const baseEnemyPrio = Math.max(1, (waiting ? 1 : 3) + enemy.status.priorityPenalty - baseEnemyStats.priorityBoost);

  if (mover.status.evadeReady) {
    mover.status.evadeReady = false;
    addLog(game, `${mover.name}의 순풍 — ${enemy.name}의 첫 공격 각을 회피했습니다.`);
    game.combatQueue.push({
      id: `combat-${Date.now()}-${game.combatQueue.length}`,
      mover: { id: mover.id, name: mover.name, role: mover.role, weapon: mover.weapon, region: mover.region, priority: baseMoverPrio, hpBefore: moverBefore.hp, hpAfter: mover.hp, armorBefore: moverBefore.armor, armorAfter: mover.armor, shot: null },
      holder: { id: enemy.id, name: enemy.name, role: enemy.role, weapon: enemy.weapon, region: enemy.region, priority: baseEnemyPrio, hpBefore: enemyBefore.hp, hpAfter: enemy.hp, armorBefore: enemyBefore.armor, armorAfter: enemy.armor, shot: null },
      range,
      waiting,
      simultaneous: false,
      evaded: true,
      result: `${mover.name}이 순풍으로 첫 공격을 회피했습니다.`,
      waitDirections: revealedWaitDirs,
    });
    return;
  }

  let tradeAim = 0;
  let tradePriority = 0;
  if (game.trade?.enemyId === enemy.id && game.trade.team === mover.team && game.trade.sourceId !== mover.id) {
    tradeAim = 1;
    tradePriority = 1;
    game.trade = null;
    addLog(game, `${mover.name}이 ${enemy.name}의 트레이드 표식을 소비합니다. 에임 +1 / 우선도 -1.`);
  }

  const moverStats = finalStats(game, mover);
  const enemyStats = finalStats(game, enemy);
  const moverPrio = Math.max(1, moverPriority + mover.status.priorityPenalty - moverStats.priorityBoost - tradePriority);
  const enemyPrio = Math.max(1, (waiting ? 1 : 3) + enemy.status.priorityPenalty - enemyStats.priorityBoost);
  const moverShot = canAttack ? makeShot(game, mover, enemy, range, false, tradeAim, 0) : null;
  const enemyShot = makeShot(game, enemy, mover, range, waiting, 0, moverMoveBonus);

  const shotLabel = (shooter: Agent, target: Agent, shot: ShotResult) => {
    if (!shot.hit) {
      addLog(game, `${shooter.name} → ${target.name} 빗나감 [${shot.aimRoll}/${shot.aimSize} - ${shot.moveRoll}/${shot.moveSize}]`);
      return;
    }
    applyDamage(game, shooter, target, shot.damage, `${shooter.name} ${shot.head ? "헤드샷" : "몸통 명중"}`);
  };

  addLog(game, `교전: ${mover.name}(우선 ${moverPrio}) ↔ ${enemy.name}(우선 ${enemyPrio})`);
  if (!moverShot) {
    shotLabel(enemy, mover, enemyShot);
  } else if (moverPrio < enemyPrio) {
    shotLabel(mover, enemy, moverShot);
    if (enemy.alive) shotLabel(enemy, mover, enemyShot);
  } else if (enemyPrio < moverPrio) {
    shotLabel(enemy, mover, enemyShot);
    if (mover.alive) shotLabel(mover, enemy, moverShot);
  } else {
    shotLabel(mover, enemy, moverShot);
    shotLabel(enemy, mover, enemyShot);
  }
  const result = !mover.alive && !enemy.alive
    ? "동시 교전으로 두 요원이 모두 제거되었습니다."
    : !mover.alive
      ? `${enemy.name}이 교전을 승리했습니다.`
      : !enemy.alive
        ? `${mover.name}이 교전을 승리했습니다.`
        : "양측 모두 생존했습니다.";
  game.combatQueue.push({
    id: `combat-${Date.now()}-${game.combatQueue.length}`,
    mover: { id: mover.id, name: mover.name, role: mover.role, weapon: mover.weapon, region: mover.region, priority: moverPrio, hpBefore: moverBefore.hp, hpAfter: mover.hp, armorBefore: moverBefore.armor, armorAfter: mover.armor, shot: moverShot },
    holder: { id: enemy.id, name: enemy.name, role: enemy.role, weapon: enemy.weapon, region: enemy.region, priority: enemyPrio, hpBefore: enemyBefore.hp, hpAfter: enemy.hp, armorBefore: enemyBefore.armor, armorAfter: enemy.armor, shot: enemyShot },
    range,
    waiting,
    simultaneous: moverPrio === enemyPrio,
    evaded: false,
    result,
    waitDirections: revealedWaitDirs,
  });
  checkWinner(game);
}

function triggerHazards(game: GameState, agent: Agent, from: number, to: number) {
  const enemy = otherSide(agent.team);
  const fire = game.fires.find((zone) => zone.owner === enemy && zone.region === to);
  if (fire) applyDamage(game, null, agent, 1, "불길 진입");

  const trip = game.deployables.find((item) => item.kind === "trip" && item.owner === enemy && item.region === from && item.to === to)
    ?? game.deployables.find((item) => item.kind === "trip" && item.owner === enemy && item.region === to && item.to === from);
  if (trip) {
    game.deployables = game.deployables.filter((item) => item.id !== trip.id);
    agent.detected = true;
    agent.status.moveBonus -= 1;
    addLog(game, `${agent.name}이 함정 철선에 걸렸습니다. 탐지 / 무빙 -1.`);
  }

  const alarm = game.deployables.find((item) => item.kind === "alarm" && item.owner === enemy && item.region === to);
  if (alarm) {
    game.deployables = game.deployables.filter((item) => item.id !== alarm.id);
    agent.detected = true;
    agent.status.vulnerable = true;
    addLog(game, `${agent.name}이 알람봇에 탐지되어 다음 피해가 +1 됩니다.`);
  }

  const turrets = game.deployables.filter((item) => item.kind === "turret" && item.owner === enemy && item.to === to);
  for (const turret of turrets) {
    const aimRoll = roll(5);
    const moveRoll = roll(Math.max(1, finalStats(game, agent).move));
    if (aimRoll - moveRoll > 0) applyDamage(game, null, agent, 1, "포탑 명중");
    else addLog(game, `포탑이 ${agent.name}을 놓쳤습니다 [${aimRoll} - ${moveRoll}].`);
  }
}

function watchersFor(game: GameState, mover: Agent): Agent[] {
  const enemies = game.teams[otherSide(mover.team)].agents.filter((agent) => agent.alive);
  return enemies.filter((enemy) => {
    const path = shortestPath(enemy.region, mover.region);
    if (path.length < 2) return false;
    const maxRange = WEAPONS[enemy.weapon].type === "sniper" ? 2 : 1;
    return path.length - 1 <= maxRange && enemy.waitDirs.includes(path[1]) && !isSmokeBlocked(game, path[0], path[1]);
  }).sort((a, b) => a.waitStamp - b.waitStamp);
}

function moveAgent(game: GameState, agent: Agent, target: number, kind: CardKind | "shadow" | "special") {
  const origin = agent.region;
  const path = shortestPath(origin, target);
  const entryBonus = kind === "entry" ? 1 : 0;
  const peekBonus = kind === "peek" ? 2 : 0;
  let engagedEnemy: Agent | null = null;
  agent.waitDirs = [];
  cancelProgress(game, agent);

  for (let index = 1; index < path.length; index += 1) {
    if (!agent.alive) break;
    const from = agent.region;
    agent.region = path[index];
    triggerHazards(game, agent, from, agent.region);
    if (!agent.alive) break;

    const watchers = watchersFor(game, agent);
    const occupants = game.teams[otherSide(agent.team)].agents
      .filter((enemy) => enemy.alive && enemy.region === agent.region && !watchers.some((watcher) => watcher.id === enemy.id));
    const enemies = [...watchers, ...occupants];
    for (const enemy of enemies) {
      const isFinal = index === path.length - 1;
      const canAttack = kind === "peek" ? false : kind === "entry" ? isFinal : true;
      const priority = kind === "entry" && isFinal ? 2 : kind === "shadow" ? 4 : kind === "special" ? 3 : 3;
      const waiting = watchers.some((watcher) => watcher.id === enemy.id);
      resolveEngagement(game, agent, enemy, priority, canAttack, entryBonus + peekBonus, waiting);
      engagedEnemy = enemy;
      if (!agent.alive || game.winner) break;
    }
  }

  if (kind === "peek" && engagedEnemy && agent.alive) {
    const lastRegion = agent.region;
    agent.region = origin;
    agent.waitDirs = [];
    game.trade = { enemyId: engagedEnemy.id, team: agent.team, sourceId: agent.id };
    addLog(game, `${agent.name} 피킹 이탈: ${lastRegion} → ${origin}. ${engagedEnemy.name} 트레이드 표식 생성.`);
  } else if (agent.alive) {
    addLog(game, `${agent.name} 이동 완료: ${REGIONS.find((region) => region.id === origin)?.name} → ${REGIONS.find((region) => region.id === agent.region)?.name}`);
  }
  agent.status.moveBonus = 0;
  agent.status.moveRangeBonus = 0;
}

function drawFive(team: TeamState, seed: number) {
  const discarding = team.hand.map((card) => ({ ...card, used: false }));
  team.discard.push(...discarding);
  team.hand = [];
  while (team.hand.length < 5) {
    if (!team.deck.length) {
      team.deck = seededShuffle(team.discard.map((card) => ({ ...card, used: false })), seed + team.discard.length);
      team.discard = [];
    }
    const card = team.deck.shift();
    if (!card) break;
    team.hand.push(card);
  }
}

function useCard(game: GameState, card: ActionCard, agent: Agent) {
  const handCard = game.teams[game.turnSide].hand.find((item) => item.id === card.id);
  if (handCard) handCard.used = true;
  agent.extraActions += 1;
  game.actionsUsed += 1;
  game.teams[game.turnSide].buyLocked = true;
  game.selectedCardId = null;
  game.targeting = null;
  addLog(game, `${agent.name}이 ${CARD_DATA[card.kind].name} 사용 · 추가행동 +1.`);
}

function cardTargets(game: GameState, agent: Agent, card: ActionCard): number[] {
  const rangeBonus = agent.status.moveRangeBonus;
  if (card.kind === "basic" || card.kind === "peek") return GRAPH.get(agent.region) ?? [];
  if (card.kind === "entry") return REGIONS.filter((region) => distance(agent.region, region.id) > 0 && distance(agent.region, region.id) <= 2 + rangeBonus).map((region) => region.id);
  if (card.kind === "follow") {
    return [...new Set(game.teams[agent.team].agents.filter((ally) => ally.alive && ally.id !== agent.id && distance(agent.region, ally.region) <= 2).map((ally) => ally.region))];
  }
  if (card.kind === "control") return GRAPH.get(agent.region) ?? [];
  return [];
}

function visibleRegions(game: GameState): Set<number> {
  const visible = new Set<number>();
  const team = game.teams[game.turnSide];
  for (const agent of team.agents.filter((item) => item.alive)) {
    visible.add(agent.region);
    (GRAPH.get(agent.region) ?? []).forEach((region) => {
      if (!isSmokeBlocked(game, agent.region, region)) visible.add(region);
    });
  }
  for (const enemy of game.teams[otherSide(game.turnSide)].agents.filter((item) => item.detected)) visible.add(enemy.region);
  for (const enemy of game.teams[otherSide(game.turnSide)].agents.filter((item) => game.revealedEnemyIds.includes(item.id))) visible.add(enemy.region);
  for (const camera of game.deployables.filter((item) => item.kind === "camera" && item.owner === game.turnSide)) {
    visible.add(camera.region);
    (GRAPH.get(camera.region) ?? []).forEach((region) => visible.add(region));
  }
  return visible;
}

function regionName(id: number) {
  return REGIONS.find((region) => region.id === id)?.name ?? `${id}번 구역`;
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
        <div className="title-roadmap"><span><i className="ready" /> PC 핫시트 플레이</span><span><i /> 모바일 전용 UI · 예정</span><span><i /> AI 상대 · 예정</span></div>
      </section>
      <aside className="title-map-card">
        <div className="title-map-image" />
        <div className="title-map-copy"><span>MAP // GRID-01</span><strong>17개 전술 구역</strong><p>2개 사이트 · 26개 연결 · 사운드 정보 없음</p></div>
      </aside>
      <footer className="title-footer"><span>BUILD 0.2 // COMBAT REVEAL UPDATE</span><span>한 화면에서 두 플레이어가 번갈아 진행합니다</span></footer>
    </main>
  );
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
                <span className="select-number">{String(index + 1).padStart(2, "0")}</span><span className="select-avatar">{agent.name.slice(0, 1)}</span>
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
          <button className="confirm-lineup" disabled={props.attackPick.length !== 5 || props.defensePick.length !== 5} onClick={props.onConfirm}><span>STEP 02</span><strong>수비 배치로 이동</strong></button>
        </aside>
      </section>
    </main>
  );
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
      <header className="setup-topbar"><button onClick={onBack}>← 요원 선택</button><div><span>STEP 02</span><strong>수비팀 사전 배치</strong></div><span className="deck-locked">15장 덱 잠금 완료</span></header>
      <section className="deployment-body">
        <aside className="deployment-roster"><span className="eyebrow">DEFENDER LINEUP</span><h2>요원 배치</h2><p>각 요원은 수비 시작 지점에서 연결된 구역으로 최대 1칸 이동할 수 있습니다. 같은 구역에 여러 명을 배치할 수 있습니다.</p>
          <div>{defenders.map((agent) => <button key={agent.id} className={selectedId === agent.id ? "selected" : ""} onClick={() => onSelect(agent.id)}><i className={`role-${agent.role}`}>{agent.name.slice(0, 1)}</i><span><strong>{agent.name}</strong><small>{ROLE_LABEL[agent.role]}</small></span><b>{agent.region}번</b></button>)}</div>
          <div className="placement-rule"><span>이동 가능</span><b>7 ↔ 10</b><b>7 ↔ 13</b></div>
        </aside>
        <div className="deployment-map">
          <div className="deployment-map-image" /><div className="deployment-vignette" />
          {EDGES.map(([a, b]) => { const start = REGIONS.find((region) => region.id === a)!; const end = REGIONS.find((region) => region.id === b)!; const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx) * 180 / Math.PI; return <span key={`${a}-${b}`} className="map-edge" style={{ left: `${start.x}%`, top: `${start.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />; })}
          {REGIONS.map((region) => { const units = defenders.filter((agent) => agent.region === region.id); const valid = allowed.includes(region.id); return <button key={region.id} disabled={!valid} className={`deployment-node ${valid ? "valid" : ""}`} style={{ left: `${region.x}%`, top: `${region.y}%` }} onClick={() => onPlace(region.id)}><span>{region.id}</span>{valid && <small>{regionName(region.id)}</small>}<i>{units.map((agent) => <b key={agent.id} className={`role-${agent.role}`}>{agent.name.slice(0, 1)}</b>)}</i></button>; })}
          <div className="deployment-callout"><span>수비팀 배치 범위</span><strong>시작 지점과 인접 1칸</strong><p>배치를 확정하면 수비팀의 첫 행동 턴이 시작됩니다.</p></div>
        </div>
        <aside className="deployment-summary"><span className="eyebrow">READY CHECK</span><h2>작전 준비</h2><div className="versus-line"><article><span>ATK</span>{game.teams.attack.agents.map((agent) => <i key={agent.id}>{agent.name.slice(0, 1)}</i>)}</article><b>VS</b><article><span>DEF</span>{defenders.map((agent) => <i key={agent.id}>{agent.name.slice(0, 1)}</i>)}</article></div><ul><li><i /> 공격팀 시작 위치 1번</li><li><i /> 수비팀 배치 확정</li><li><i /> 수비팀 선행 턴</li></ul><button onClick={onStart}><span>DEPLOYMENT READY</span><strong>작전 시작</strong></button></aside>
      </section>
    </main>
  );
}

export default function Home() {
  const [stage, setStage] = useState<"title" | "select" | "deploy" | "play">("title");
  const [attackPick, setAttackPick] = useState<string[]>([]);
  const [defensePick, setDefensePick] = useState<string[]>([]);
  const [pickingSide, setPickingSide] = useState<Side>("attack");
  const [deploymentAgentId, setDeploymentAgentId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState>(() => createInitialGame());
  const [showHelp, setShowHelp] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showIntel, setShowIntel] = useState(false);

  const activeTeam = game.teams[game.turnSide];
  const selectedAgent = getAgent(game, game.selectedAgentId);
  const selectedCard = activeTeam.hand.find((card) => card.id === game.selectedCardId) ?? null;
  const visible = useMemo(() => visibleRegions(game), [game]);
  const validTargets = useMemo(() => {
    if (game.pendingWait) {
      const agent = getAgent(game, game.pendingWait);
      return new Set(agent ? GRAPH.get(agent.region) ?? [] : []);
    }
    if (game.targeting?.kind === "control") {
      const agent = getAgent(game, game.targeting.agentId);
      return new Set(agent ? GRAPH.get(agent.region) ?? [] : []);
    }
    if (game.targeting?.kind === "skill") {
      const agent = getAgent(game, game.targeting.agentId);
      const definition = agent ? AGENTS[agent.name].skills.find((item) => item.id === game.targeting?.skillId) : null;
      if (!agent || !definition) return new Set<number>();
      if (definition.target === "adjacent") return new Set(GRAPH.get(agent.region) ?? []);
      if (definition.target === "range2") return new Set(REGIONS.filter((region) => distance(agent.region, region.id) <= 2).map((region) => region.id));
      if (definition.target === "any") return new Set(REGIONS.map((region) => region.id));
    }
    if (game.targeting?.kind === "special") {
      if (game.targeting.origin) return new Set(GRAPH.get(game.targeting.origin) ?? []);
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
    setGame(next);
    setDeploymentAgentId(next.teams.defense.agents[0]?.id ?? null);
    setStage("deploy");
  };

  const placeDefender = (region: number) => {
    if (!deploymentAgentId || ![7, 10, 13].includes(region)) return;
    mutate((draft) => {
      const agent = getAgent(draft, deploymentAgentId);
      if (agent?.team === "defense") agent.region = region;
    });
  };

  const restartToTitle = () => {
    setGame(createInitialGame());
    setAttackPick([]);
    setDefensePick([]);
    setPickingSide("attack");
    setDeploymentAgentId(null);
    setShowShop(false);
    setShowHelp(false);
    setStage("title");
  };

  if (stage === "title") return <TitleScreen onStart={() => setStage("select")} />;
  if (stage === "select") return <SelectionScreen attackPick={attackPick} defensePick={defensePick} pickingSide={pickingSide} onPickingSide={setPickingSide} onToggle={toggleLineupAgent} onRecommended={recommendedLineups} onBack={() => setStage("title")} onConfirm={confirmLineups} />;
  if (stage === "deploy") return <DeploymentScreen game={game} selectedId={deploymentAgentId} onSelect={setDeploymentAgentId} onPlace={placeDefender} onBack={() => setStage("select")} onStart={() => setStage("play")} />;

  const selectAgent = (id: string) => {
    const agent = getAgent(game, id);
    if (!agent || agent.team !== game.turnSide || !agent.alive || game.winner) return;
    mutate((draft) => { draft.selectedAgentId = id; });
  };

  const selectCard = (card: ActionCard) => {
    if (card.used || game.actionsUsed >= 3 || game.pendingWait || game.targeting || game.winner) return;
    mutate((draft) => { draft.selectedCardId = draft.selectedCardId === card.id ? null : card.id; });
  };

  const finishWait = (region: number) => {
    mutate((draft) => {
      const agent = getAgent(draft, draft.pendingWait);
      if (!agent || !(GRAPH.get(agent.region) ?? []).includes(region)) return;
      draft.waitCounter += 1;
      agent.waitDirs = [region];
      agent.waitStamp = draft.waitCounter;
      draft.pendingWait = null;
      addLog(draft, `${agent.name} 대기 설정: ${regionName(region)} 방향 · 우선도 1.`);
    });
  };

  const resolveSkillTarget = (region: number) => {
    mutate((draft) => {
      const targeting = draft.targeting;
      const agent = getAgent(draft, targeting?.agentId);
      if (!targeting || targeting.kind !== "skill" || !agent || !targeting.skillId) return;
      const definition = AGENTS[agent.name].skills.find((item) => item.id === targeting.skillId);
      if (!definition) return;
      const isValid = definition.target === "any"
        || (definition.target === "adjacent" && (GRAPH.get(agent.region) ?? []).includes(region))
        || (definition.target === "range2" && distance(agent.region, region) <= 2);
      if (!isValid) return;

      const enemies = draft.teams[otherSide(agent.team)].agents.filter((enemy) => enemy.alive && enemy.region === region);
      const deployableId = () => `${targeting.skillId}-${Date.now()}-${region}`;
      switch (targeting.skillId) {
        case "paint":
          enemies.forEach((enemy) => { enemy.waitDirs = []; applyDamage(draft, agent, enemy, 1, "페인트탄"); });
          draft.deployables = draft.deployables.filter((item) => item.region !== region);
          break;
        case "blast":
          agent.waitDirs = [];
          cancelProgress(draft, agent);
          agent.region = region;
          agent.status.moveBonus += 1;
          addLog(draft, `${agent.name}이 폭발 팩으로 ${regionName(region)}에 진입했습니다.`);
          break;
        case "curve":
        case "flash":
          enemies.forEach((enemy) => { enemy.status.aimPenalty = Math.max(enemy.status.aimPenalty, 3); });
          break;
        case "hot":
          draft.fires.push({ id: deployableId(), owner: agent.team, region, expiresCycle: draft.cycle + 1 });
          break;
        case "relay":
          enemies.forEach((enemy) => { enemy.status.priorityPenalty = Math.max(1, enemy.status.priorityPenalty); });
          break;
        case "trip":
          draft.deployables.push({ id: deployableId(), kind: "trip", owner: agent.team, region: agent.region, to: region });
          break;
        case "turret":
          draft.deployables.push({ id: deployableId(), kind: "turret", owner: agent.team, region: agent.region, to: region });
          break;
        case "recon": {
          const scanned = new Set([region, ...(GRAPH.get(region) ?? [])]);
          const waitingEnemy = enemies.filter((enemy) => enemy.waitDirs.length).sort((a, b) => a.waitStamp - b.waitStamp)[0];
          if (waitingEnemy) {
            draft.trade = { enemyId: waitingEnemy.id, team: agent.team, sourceId: agent.id };
            addLog(draft, `${waitingEnemy.name}이 정찰 화살을 파괴했습니다. 총기 ${WEAPONS[waitingEnemy.weapon].name} 확인 / 트레이드 표식.`);
          } else {
            draft.teams[otherSide(agent.team)].agents.filter((enemy) => scanned.has(enemy.region)).forEach((enemy) => { enemy.detected = true; });
            addLog(draft, `정찰 성공: ${regionName(region)} 주변의 적이 탐지됐습니다.`);
          }
          break;
        }
        case "shock": {
          const target = enemies[0];
          if (target) applyDamage(draft, agent, target, 1, "충격 화살");
          else {
            const device = draft.deployables.find((item) => item.region === region && item.owner !== agent.team);
            if (device) draft.deployables = draft.deployables.filter((item) => item.id !== device.id);
          }
          break;
        }
        case "aftershock":
          enemies.forEach((enemy) => { enemy.waitDirs = []; cancelProgress(draft, enemy); applyDamage(draft, agent, enemy, 2, "여진"); });
          break;
        case "smoke": {
          const path = shortestPath(agent.region, region);
          if (path.length > 1) draft.smokes.push({ key: edgeKey(path[0], path[1]), owner: agent.team, expiresCycle: draft.cycle + 1 });
          break;
        }
        case "dark": {
          const neighbor = (GRAPH.get(region) ?? [])[0];
          if (neighbor) {
            draft.smokes = draft.smokes.filter((smoke) => smoke.owner !== agent.team);
            draft.smokes.push({ key: edgeKey(region, neighbor), owner: agent.team, expiresCycle: draft.cycle + 1 });
          }
          break;
        }
        case "shadow":
          moveAgent(draft, agent, region, "shadow");
          break;
      }
      if (targeting.skillId !== "recon") addLog(draft, `${agent.name} 스킬 — ${definition.name} 사용.`);
      agent.extraActions = Math.max(0, agent.extraActions - 1);
      agent.skills[targeting.skillId] = Math.max(0, (agent.skills[targeting.skillId] ?? 0) - 1);
      draft.targeting = null;
      checkWinner(draft);
    });
  };

  const useSkill = (definition: SkillDefinition) => {
    if (!selectedAgent || selectedAgent.extraActions < 1 || (selectedAgent.skills[definition.id] ?? 0) < 1 || game.winner) return;
    if (definition.target !== "self") {
      mutate((draft) => {
        draft.targeting = { kind: "skill", agentId: selectedAgent.id, skillId: definition.id };
        draft.selectedCardId = null;
      });
      return;
    }
    mutate((draft) => {
      const agent = getAgent(draft, selectedAgent.id)!;
      if (definition.id === "tailwind") agent.status.evadeReady = true;
      if (definition.id === "updraft" || definition.id === "gear") {
        agent.status.moveBonus += 1;
        agent.status.moveRangeBonus += 1;
      }
      if (definition.id === "camera") draft.deployables.push({ id: `camera-${Date.now()}`, kind: "camera", owner: agent.team, region: agent.region });
      if (definition.id === "alarm") draft.deployables.push({ id: `alarm-${Date.now()}`, kind: "alarm", owner: agent.team, region: agent.region });
      if (definition.id === "stim") draft.stims.push({ id: `stim-${Date.now()}`, owner: agent.team, region: agent.region, expiresCycle: draft.cycle + 1 });
      agent.extraActions -= 1;
      agent.skills[definition.id] -= 1;
      addLog(draft, `${agent.name} 스킬 — ${definition.name} 사용.`);
    });
  };

  const handleRegionClick = (region: number) => {
    if (game.winner) return;
    if (game.pendingWait) { finishWait(region); return; }
    if (game.targeting?.kind === "skill") { if (validTargets.has(region)) resolveSkillTarget(region); return; }
    if (game.targeting?.kind === "special") {
      mutate((draft) => {
        const state = draft.targeting;
        if (!state || state.kind !== "special") return;
        if (!state.origin) {
          if (!draft.teams[draft.turnSide].agents.some((agent) => agent.alive && agent.region === region)) return;
          state.origin = region;
          addLog(draft, `${state.special === "rush" ? "러쉬" : "커버"} 출발 구역 선택: ${regionName(region)}.`);
          return;
        }
        if (!(GRAPH.get(state.origin) ?? []).includes(region)) return;
        const movers = draft.teams[draft.turnSide].agents.filter((agent) => agent.alive && agent.region === state.origin);
        movers.forEach((agent) => moveAgent(draft, agent, region, "special"));
        if (state.special === "rush") draft.teams.attack.rushUsed = true;
        else draft.teams.defense.cover = false;
        addLog(draft, `${state.special === "rush" ? "러쉬" : "커버"}: ${movers.length}명 단체 이동.`);
        draft.targeting = null;
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
        draft.waitCounter += 1;
        agent.waitDirs = selected.slice(0, 2);
        agent.waitStamp = draft.waitCounter;
        useCard(draft, card, agent);
      });
      return;
    }
    if (!selectedAgent || !selectedCard || !validTargets.has(region) || !canUseCard(selectedCard, selectedAgent)) return;
    if (selectedCard.kind === "control") {
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
      moveAgent(draft, agent, region, card.kind);
      useCard(draft, card, agent);
      if (card.kind === "basic" && agent.alive) draft.pendingWait = agent.id;
    });
  };

  const quickAction = (type: "plant" | "half" | "final" | "pickup" | "spike") => {
    if (!selectedAgent || selectedAgent.extraActions < 1) return;
    mutate((draft) => {
      const agent = getAgent(draft, selectedAgent.id);
      if (!agent || !agent.alive || agent.extraActions < 1) return;
      if (type === "plant") {
        const region = REGIONS.find((item) => item.id === agent.region);
        if (agent.team !== "attack" || !region?.site || draft.spike.carrierId !== agent.id || draft.spike.status !== "carried") return;
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
        agent.detected = false;
        agent.status.aimPenalty = 0;
        agent.status.priorityPenalty = 0;
        agent.status.vulnerable = false;
      }
      drawFive(endingTeam, draft.cycle * 31 + (endingSide === "attack" ? 7 : 3));
      draft.trade = null;
      draft.revealedEnemyIds = [];
      draft.combatQueue = [];
      draft.pendingWait = null;
      draft.targeting = null;
      draft.selectedCardId = null;
      draft.actionsUsed = 0;

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
      const startingTeam = draft.teams[newSide];
      draft.selectedAgentId = startingTeam.agents.find((agent) => agent.alive)?.id ?? null;
      draft.fires = draft.fires.filter((zone) => zone.expiresCycle > draft.cycle);
      draft.stims = draft.stims.filter((zone) => zone.expiresCycle > draft.cycle);
      draft.smokes = draft.smokes.filter((smoke) => smoke.expiresCycle > draft.cycle);

      if (newSide === "attack" && draft.spike.status === "planting") {
        const planter = getAgent(draft, draft.spike.actorId);
        if (planter?.alive && planter.region === draft.spike.region) {
          draft.spike.status = "planted";
          draft.spike.installedCycle = draft.cycle;
          draft.spike.carrierId = null;
          draft.teams.defense.cover = true;
          addLog(draft, `스파이크 설치 완료. 폭발까지 8라운드 · 수비팀 커버 카드 생성.`);
        }
      }

      if (newSide === "defense") {
        if (draft.spike.status === "defusing") {
          const defuser = getAgent(draft, draft.spike.actorId);
          if (defuser?.alive && defuser.region === draft.spike.region) {
            draft.spike.status = "defused";
            draft.winner = "defense";
            draft.winReason = "최종 해체 완료";
            addLog(draft, `해체 완료 — 마지막 순간 클러치 성공.`);
            return;
          }
          draft.spike.status = "half";
        }
        if (["planted", "half", "defusing"].includes(draft.spike.status) && draft.spike.installedCycle !== null && draft.cycle > draft.spike.installedCycle) {
          draft.spike.explosion -= 1;
          if (draft.spike.explosion <= 0) {
            draft.spike.status = "exploded";
            draft.winner = "attack";
            draft.winReason = "스파이크 폭발";
            return;
          }
        }
      }
      addLog(draft, `${SIDE_LABEL[newSide]} 턴 시작 · 행동카드 3장.`);
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

  const cancelTargeting = () => mutate((draft) => { draft.targeting = null; draft.selectedCardId = null; });
  const skipWait = () => mutate((draft) => { const agent = getAgent(draft, draft.pendingWait); if (agent) agent.waitDirs = []; draft.pendingWait = null; });
  const dismissCombat = () => mutate((draft) => { draft.combatQueue.shift(); });
  const selectedRegion = selectedAgent ? REGIONS.find((region) => region.id === selectedAgent.region) : null;
  const droppedHere = selectedAgent ? game.droppedWeapons.find((item) => item.region === selectedAgent.region) : null;
  const canPlant = selectedAgent?.team === "attack" && selectedRegion?.site && game.spike.status === "carried" && game.spike.carrierId === selectedAgent.id;
  const canHalf = selectedAgent?.team === "defense" && game.spike.status === "planted" && game.spike.region === selectedAgent.region;
  const canFinal = selectedAgent?.team === "defense" && game.spike.status === "half" && game.spike.region === selectedAgent.region && game.spike.halfCycle !== game.cycle;
  const combatScene = game.combatQueue[0] ?? null;

  return (
    <main className={`game-shell side-${game.turnSide}`}>
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">V//T</span>
          <div><strong>PROTOCOL: GRID</strong><span>전술 카드게임 프로토타입</span></div>
        </div>
        <div className="round-display">
          <span className="side-name defense-name">DEF</span>
          <div className="round-core">
            <span>매치 R{game.matchRound} · 전술 {game.cycle}/16</span>
            <strong>{SIDE_LABEL[game.turnSide]} 행동</strong>
          </div>
          <span className="side-name attack-name">ATK</span>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowIntel((value) => !value)} title="정보 시야 표시 전환">{showIntel ? "시야 ON" : "시야 OFF"}</button>
          <button onClick={() => setShowHelp(true)}>규칙</button>
          <button className="reset-button" onClick={restartToTitle}>새 게임</button>
        </div>
      </header>

      <section className="battle-layout">
        <aside className="roster-panel panel">
          <div className="panel-heading">
            <div><span className="eyebrow">ACTIVE SQUAD</span><h2>{SIDE_LABEL[game.turnSide]}</h2></div>
            <span className="funds">¤ {activeTeam.funds}</span>
          </div>
          <div className="action-meter" aria-label={`행동 ${game.actionsUsed}/3`}>
            {[0, 1, 2].map((value) => <i key={value} className={value < game.actionsUsed ? "spent" : ""} />)}
            <span>{3 - game.actionsUsed} ACTIONS</span>
          </div>
          <div className="agent-list">
            {activeTeam.agents.map((agent, index) => {
              const stats = finalStats(game, agent);
              return (
                <button key={agent.id} className={`agent-row ${game.selectedAgentId === agent.id ? "selected" : ""} ${!agent.alive ? "dead" : ""}`} onClick={() => selectAgent(agent.id)}>
                  <span className={`agent-avatar role-${agent.role}`}>{agent.name.slice(0, 1)}<small>{index + 1}</small></span>
                  <span className="agent-copy"><strong>{agent.name}</strong><small>{ROLE_LABEL[agent.role]} · {WEAPONS[agent.weapon].name}</small></span>
                  <span className="agent-vitals"><b>{agent.hp + agent.armor}</b><small>A{stats.aim} / M{stats.move}</small></span>
                </button>
              );
            })}
          </div>
          <div className="enemy-summary">
            <span className="eyebrow">OPPOSITION</span>
            <div className="enemy-pips">
              {game.teams[otherSide(game.turnSide)].agents.map((agent) => { const revealed = agent.detected || game.revealedEnemyIds.includes(agent.id); return <i key={agent.id} className={`${agent.alive ? "" : "down"} ${revealed ? "detected" : ""}`} title={`${agent.name}${revealed ? " · 위치 공개" : ""}`} />; })}
            </div>
          </div>
          <button className="shop-trigger" disabled={activeTeam.buyLocked || !!game.winner} onClick={() => setShowShop(true)}>
            <span>장비 구매</span><small>{activeTeam.buyLocked ? "행동 시작 후 잠김" : "무기 · 방어구"}</small>
          </button>
          <div className="deck-status"><span>덱 {activeTeam.deck.length}</span><span>버림 {activeTeam.discard.length}</span><span>손패 5</span></div>
        </aside>

        <section className="arena-column">
          <div className="map-header">
            <div><span className="live-dot" /> LIVE TACTICAL MAP</div>
            <div className="map-legend"><span><i className="dot ally" /> 아군</span><span><i className="dot enemy" /> 적</span><span><i className="dot target" /> 행동 가능</span></div>
          </div>
          <div className={`map-board ${showIntel ? "show-all" : "fog-on"}`}>
            <div className="map-image" />
            <div className="map-vignette" />
            {EDGES.map(([a, b]) => {
              const start = REGIONS.find((region) => region.id === a)!;
              const end = REGIONS.find((region) => region.id === b)!;
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * 180 / Math.PI;
              const smoke = game.smokes.some((item) => item.key === edgeKey(a, b));
              return <span key={`${a}-${b}`} className={`map-edge ${smoke ? "smoked" : ""}`} style={{ left: `${start.x}%`, top: `${start.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />;
            })}
            {REGIONS.map((region) => {
              const allies = activeTeam.agents.filter((agent) => agent.alive && agent.region === region.id);
              const enemies = game.teams[otherSide(game.turnSide)].agents.filter((agent) => agent.alive && agent.region === region.id);
              const known = showIntel || visible.has(region.id);
              const shownEnemies = enemies.filter((agent) => known || agent.detected || game.revealedEnemyIds.includes(agent.id));
              const revealedEnemies = shownEnemies.filter((agent) => game.revealedEnemyIds.includes(agent.id));
              const isValid = validTargets.has(region.id);
              const devices = game.deployables.filter((item) => item.region === region.id);
              const fire = game.fires.some((item) => item.region === region.id);
              const stim = game.stims.some((item) => item.region === region.id);
              const hasSpike = game.spike.region === region.id;
              return (
                <button
                  key={region.id}
                  className={`region-node ${isValid ? "valid" : ""} ${region.site ? "site-node" : ""} ${!known ? "unknown" : ""}`}
                  style={{ left: `${region.x}%`, top: `${region.y}%` }}
                  onClick={() => handleRegionClick(region.id)}
                  aria-label={`${region.id}번 ${region.name}${isValid ? ", 선택 가능" : ""}`}
                >
                  <span className="node-core">{region.id}</span>
                  <span className="node-label">{region.site && <b>{region.site}</b>}{region.name}</span>
                  <span className="unit-stack ally-stack">
                    {allies.map((agent) => <i key={agent.id} className={`unit-token role-${agent.role} ${game.selectedAgentId === agent.id ? "selected" : ""}`} onClick={(event) => { event.stopPropagation(); selectAgent(agent.id); }} title={`${agent.name} · ${WEAPONS[agent.weapon].name}`}>{agent.name.slice(0, 1)}</i>)}
                  </span>
                  <span className="unit-stack enemy-stack">
                    {shownEnemies.map((agent) => { const identified = agent.detected || game.revealedEnemyIds.includes(agent.id); return <i key={agent.id} className={`unit-token hostile ${identified ? "identified" : ""}`} title={`${identified ? agent.name : "적 요원"} · ${identified ? WEAPONS[agent.weapon].name : "장비 미확인"}`}>{identified ? agent.name.slice(0, 1) : "?"}</i>; })}
                  </span>
                  {revealedEnemies.length > 0 && <span className="enemy-wait-intel">{revealedEnemies.map((agent) => <i key={agent.id}><b>{agent.name}</b>{agent.waitDirs.length ? `대기 → ${agent.waitDirs.join(" · ")}` : "대기 없음"}</i>)}</span>}
                  {(devices.length > 0 || fire || stim || hasSpike) && <span className="effect-stack">
                    {devices.map((item) => <i key={item.id} title={item.kind}>{item.kind === "trip" ? "⌁" : item.kind === "camera" ? "◉" : item.kind === "turret" ? "⌖" : "!"}</i>)}
                    {fire && <i className="fire">▲</i>}{stim && <i className="stim">+</i>}{hasSpike && <i className="spike">◆</i>}
                  </span>}
                </button>
              );
            })}
            <div className="objective-hud">
              <span className={`spike-icon status-${game.spike.status}`}>◆</span>
              <div><small>SPIKE</small><strong>{game.spike.status === "carried" ? "운반 중" : game.spike.status === "dropped" ? "회수 필요" : game.spike.status === "planting" ? "설치 진행" : game.spike.status === "planted" ? "설치됨" : game.spike.status === "half" ? "반 해체" : game.spike.status === "defusing" ? "최종 해체" : game.spike.status === "defused" ? "해체 완료" : "폭발"}</strong></div>
              {["planted", "half", "defusing"].includes(game.spike.status) && <b>{game.spike.explosion}</b>}
            </div>
            {(game.pendingWait || game.targeting) && <div className="targeting-banner">
              <strong>{game.pendingWait ? "대기 방향 선택" : game.targeting?.kind === "control" ? "두 방향을 지정" : game.targeting?.kind === "special" ? `${game.targeting.special === "rush" ? "러쉬" : "커버"} 이동` : "스킬 목표 선택"}</strong>
              <span>청록색으로 표시된 구역을 선택하세요.</span>
              <button onClick={(event) => { event.stopPropagation(); game.pendingWait ? skipWait() : cancelTargeting(); }}>취소</button>
            </div>}
          </div>

          <div className="hand-zone">
            <div className="hand-label"><span>TACTICAL HAND</span><small>카드 선택 → 요원 선택 → 지도 구역 선택</small></div>
            <div className="card-row">
              {activeTeam.hand.map((card, index) => {
                const unusable = selectedAgent ? !canUseCard(card, selectedAgent) : false;
                return (
                  <button key={card.id} className={`action-card card-${card.kind} ${game.selectedCardId === card.id ? "selected" : ""} ${card.used ? "used" : ""}`} disabled={card.used || game.actionsUsed >= 3 || !!game.pendingWait || !!game.targeting || !!game.winner} onClick={() => selectCard(card)}>
                    <span className="card-index">0{index + 1}</span><span className="card-tag">{CARD_DATA[card.kind].tag}</span>
                    <strong>{CARD_DATA[card.kind].name}</strong><p>{CARD_DATA[card.kind].description}</p>
                    <small className={unusable ? "blocked" : ""}>{unusable ? `${ROLE_LABEL[selectedAgent!.role]} 사용 불가` : `${card.source} 덱 제공`}</small>
                  </button>
                );
              })}
              {game.turnSide === "attack" && game.cycle <= 2 && !activeTeam.rushUsed && <button className="special-card rush-card" onClick={() => startSpecial("rush")} disabled={!!game.targeting || !!game.pendingWait}><span>ROUND {game.cycle}</span><strong>러쉬</strong><p>한 구역 아군 전원을 인접 구역으로 이동</p></button>}
              {game.turnSide === "defense" && activeTeam.cover && <button className="special-card cover-card" onClick={() => startSpecial("cover")} disabled={!!game.targeting || !!game.pendingWait}><span>ONE USE</span><strong>커버</strong><p>보관 가능한 단체 재진입 카드</p></button>}
            </div>
          </div>
        </section>

        <aside className="intel-panel panel">
          {selectedAgent ? <>
            <div className="selected-agent-head">
              <span className={`large-avatar role-${selectedAgent.role}`}>{selectedAgent.name.slice(0, 1)}</span>
              <div><span className="eyebrow">SELECTED AGENT</span><h2>{selectedAgent.name}</h2><p>{ROLE_LABEL[selectedAgent.role]} · {regionName(selectedAgent.region)}</p></div>
            </div>
            <div className="stat-grid">
              <div><span>체력</span><strong>{selectedAgent.hp}/2</strong></div><div><span>방어</span><strong>{selectedAgent.armor}</strong></div>
              <div><span>에임</span><strong>{finalStats(game, selectedAgent).aim}</strong></div><div><span>무빙</span><strong>{finalStats(game, selectedAgent).move}</strong></div>
            </div>
            <div className="loadout-line"><div><span className="eyebrow">PRIMARY</span><strong>{WEAPONS[selectedAgent.weapon].name}</strong></div><div className="damage-chip">{WEAPONS[selectedAgent.weapon].body}<small>BODY</small> / {WEAPONS[selectedAgent.weapon].head}<small>HEAD</small></div></div>
            <div className="extra-action-head"><span>추가행동</span><strong>{selectedAgent.extraActions}</strong></div>
            <div className="skills-list">
              {AGENTS[selectedAgent.name].skills.map((item) => (
                <button key={item.id} disabled={selectedAgent.extraActions < 1 || (selectedAgent.skills[item.id] ?? 0) < 1 || !!game.targeting || !!game.pendingWait || !!game.winner} onClick={() => useSkill(item)} title={item.description}>
                  <span className="skill-glyph">{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.description}</small></span><b>×{selectedAgent.skills[item.id] ?? 0}</b>
                </button>
              ))}
            </div>
            <div className="quick-actions">
              {canPlant && <button disabled={selectedAgent.extraActions < 1} onClick={() => quickAction("plant")}>◆ 스파이크 설치</button>}
              {canHalf && <button disabled={selectedAgent.extraActions < 1} onClick={() => quickAction("half")}>◇ 반 해체</button>}
              {canFinal && <button disabled={selectedAgent.extraActions < 1} onClick={() => quickAction("final")}>◇ 최종 해체</button>}
              {droppedHere && <button disabled={selectedAgent.extraActions < 1} onClick={() => quickAction("pickup")}>{WEAPONS[droppedHere.weapon].name} 줍기</button>}
              {selectedAgent.team === "attack" && game.spike.status === "dropped" && game.spike.region === selectedAgent.region && <button disabled={selectedAgent.extraActions < 1} onClick={() => quickAction("spike")}>◆ 스파이크 회수</button>}
            </div>
          </> : <div className="empty-inspector">요원을 선택하세요.</div>}
          <div className="combat-log">
            <div className="log-heading"><span>전투 기록</span><i>LIVE</i></div>
            <ol>{game.log.map((entry, index) => <li key={`${entry}-${index}`}><span>{String(game.log.length - index).padStart(2, "0")}</span>{entry}</li>)}</ol>
          </div>
          <button className="end-turn" disabled={!!game.pendingWait || !!game.targeting || !!game.winner} onClick={endTurn}><span>턴 종료</span><small>{game.actionsUsed}/3 카드 사용 · 미사용 카드도 버림</small></button>
        </aside>
      </section>

      {game.winner && game.combatQueue.length === 0 && <div className="modal-backdrop victory-backdrop"><div className={`victory-card winner-${game.winner}`}><span className="eyebrow">ROUND COMPLETE</span><h1>{SIDE_LABEL[game.winner]} 승리</h1><p>{game.winReason}</p><button onClick={restartToTitle}>새 작전 시작</button></div></div>}

      {combatScene && <div className="modal-backdrop combat-backdrop"><section className="combat-modal">
        <header className="combat-modal-head"><div><span className="combat-alert"><i /> ENGAGEMENT DETECTED</span><h2>교전 해결</h2></div><div><span>{game.combatQueue.length} ENCOUNTER{game.combatQueue.length > 1 ? "S" : ""}</span><b>{combatScene.simultaneous ? "동시 처리" : "우선도 처리"}</b></div></header>
        <div className="combat-location"><span>교전 구역</span><strong>{regionName(combatScene.mover.region)}</strong><i>거리 {combatScene.range}</i>{combatScene.waiting && <b>대기 공격 발동</b>}</div>
        <div className="combat-stage">
          {([combatScene.mover, combatScene.holder] as CombatFighterView[]).map((fighter, index) => {
            const shot = fighter.shot;
            const isMover = index === 0;
            const survived = fighter.hpAfter > 0;
            return <article key={fighter.id} className={`combat-fighter ${isMover ? "mover" : "holder"} ${survived ? "" : "eliminated"}`}>
              <div className="combat-side-tag">{isMover ? "진입 요원" : combatScene.waiting ? "대기 요원" : "수비 요원"}</div>
              <div className={`combat-avatar role-${fighter.role}`}>{fighter.name.slice(0, 1)}<span>{isMover ? "ACT" : "REACT"}</span></div>
              <h3>{fighter.name}</h3><p>{ROLE_LABEL[fighter.role]} · {WEAPONS[fighter.weapon].name}</p>
              <div className="combat-priority"><span>공격 우선도</span><strong>{fighter.priority}</strong></div>
              <div className="combat-vitals"><span>내구도</span><b>{fighter.hpBefore + fighter.armorBefore}</b><i>→</i><strong>{fighter.hpAfter + fighter.armorAfter}</strong></div>
              <div className={`combat-roll ${!shot ? "no-shot" : shot.hit ? shot.head ? "headshot" : "hit" : "miss"}`}>
                {shot ? <><span className="dice aim-die"><small>AIM</small><b>{shot.aimRoll}</b><i>D{shot.aimSize}</i></span><em>−</em><span className="dice move-die"><small>MOVE</small><b>{shot.moveRoll}</b><i>D{shot.moveSize}</i></span><div><strong>{shot.hit ? shot.head ? "HEADSHOT" : "BODY HIT" : "MISS"}</strong><small>{shot.hit ? `피해 ${shot.damage}` : "피해 없음"}</small></div></> : <div><strong>{combatScene.evaded ? "EVADED" : "NO ATTACK"}</strong><small>{combatScene.evaded ? "순풍으로 공격 회피" : "행동 규칙상 공격 불가"}</small></div>}
              </div>
            </article>;
          })}
          <div className="combat-versus"><span>PRIORITY</span><b>VS</b><i>{combatScene.mover.priority === combatScene.holder.priority ? "=" : combatScene.mover.priority < combatScene.holder.priority ? "←" : "→"}</i></div>
        </div>
        <div className="combat-result"><div><span>RESULT</span><strong>{combatScene.result}</strong><p>{combatScene.holder.name}의 위치와 대기 방향은 이번 {SIDE_LABEL[game.turnSide]} 턴이 끝날 때까지 지도에 공개됩니다.</p></div><div className="revealed-hold"><span>공개된 대기</span><b>{combatScene.waitDirections.length ? combatScene.waitDirections.map((region) => `${region}번`).join(" · ") : "대기 없음"}</b></div></div>
        <button className="combat-continue" onClick={dismissCombat}><span>{game.combatQueue.length > 1 ? "다음 1대1 교전" : "전장으로 복귀"}</span><small>{game.combatQueue.length > 1 ? `${game.combatQueue.length - 1}개 교전 대기 중` : "공개 정보가 지도에 표시됩니다"}</small></button>
      </section></div>}

      {showShop && <div className="modal-backdrop" onMouseDown={() => setShowShop(false)}><div className="shop-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">TEAM ARMORY</span><h2>{selectedAgent?.name} 장비 구매</h2></div><div><strong>¤ {activeTeam.funds}</strong><button onClick={() => setShowShop(false)}>닫기</button></div></div>
        <p className="shop-note">매치 3라운드 테스트: 모든 총기 해금 · 구매 자금은 팀 공동입니다. 기존 장비 환불은 없습니다.</p>
        <div className="weapon-grid">{Object.values(WEAPONS).map((weapon) => <button key={weapon.id} className={selectedAgent?.weapon === weapon.id ? "equipped" : ""} disabled={weapon.unlock > game.matchRound || weapon.price > activeTeam.funds || activeTeam.buyLocked} onClick={() => buyWeapon(weapon)}><span>{weapon.type === "sniper" ? "SNP" : weapon.type === "shotgun" ? "SG" : "RFL"}</span><strong>{weapon.name}</strong><small>몸통 {weapon.body} · 헤드 {weapon.head}</small><b>{weapon.price ? `${weapon.price}원` : "기본"}</b></button>)}</div>
        <h3>방어구</h3><div className="armor-grid"><button onClick={() => buyArmor("light", 2, 1)} disabled={activeTeam.funds < 2}><strong>소형 방어구</strong><small>방어 1 · 2원</small></button><button onClick={() => buyArmor("regen", 4, 1)} disabled={activeTeam.funds < 4}><strong>회복 방어구</strong><small>팀 턴 종료 회복 · 4원</small></button><button onClick={() => buyArmor("heavy", 6, 2)} disabled={activeTeam.funds < 6}><strong>대형 방어구</strong><small>방어 2 · 6원</small></button></div>
      </div></div>}

      {showHelp && <div className="modal-backdrop" onMouseDown={() => setShowHelp(false)}><div className="rules-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">FIELD MANUAL // V0.1</span><h2>핵심 규칙</h2></div><button onClick={() => setShowHelp(false)}>닫기</button></div>
        <div className="rules-grid">
          <article><b>01</b><h3>턴</h3><p>수비 → 공격 순서. 손패 5장 중 카드 3장을 사용하고, 턴 종료 시 손패 전부를 버리고 다시 5장을 뽑습니다.</p></article>
          <article><b>02</b><h3>교전</h3><p>대기 우선도 1, 엔트리 도착 2, 기본 이동 3. 에임 주사위−무빙 주사위가 0 이하면 빗나감, 1–4 몸통, 5+ 헤드샷입니다.</p></article>
          <article><b>03</b><h3>추가행동</h3><p>카드 한 장마다 해당 요원이 추가행동 1회를 얻습니다. 스킬, 설치·해체, 총기·스파이크 줍기에 사용합니다.</p></article>
          <article><b>04</b><h3>시야</h3><p>아군이 있는 구역과 인접 구역만 확인합니다. 연막은 시야와 대기를 끊지만 이동은 막지 않습니다.</p></article>
          <article><b>05</b><h3>트레이드</h3><p>아군 사망·이탈·정찰 장치 파괴 시 적에게 표식. 같은 턴 다음 아군의 첫 교전에 에임 +1, 우선도 1단계 향상.</p></article>
          <article><b>06</b><h3>스파이크</h3><p>설치는 다음 공격 턴 시작, 최종 해체는 다음 수비 턴 시작에 완료됩니다. 같은 시점이면 해체가 먼저입니다.</p></article>
        </div>
        <p className="prototype-note">이 버전은 한 화면에서 번갈아 조작하는 밸런스 테스트용 수직 프로토타입입니다. 중간 교전의 수동 후퇴, 다중 목표 선택, 매치 간 장비 보존은 다음 구현 단계입니다.</p>
      </div></div>}
    </main>
  );
}
