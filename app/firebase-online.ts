import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  get,
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  set,
  update,
  type Unsubscribe,
} from "firebase/database";

export type OnlineSide = "attack" | "defense";
export type OnlinePhase = "lobby" | "buy_defense" | "deploy" | "buy_attack" | "setup_attack_wait" | "play" | "ended";

export interface OnlinePlayer {
  uid: string;
  side: OnlineSide;
  connected: boolean;
  joinedAt: number;
}

export interface OnlineRoom<Game> {
  meta: {
    createdAt: number;
    hostUid: string;
    hostSide: OnlineSide;
    status: "waiting" | "playing" | "ended";
    phase: OnlinePhase;
  };
  players: Partial<Record<OnlineSide, OnlinePlayer>>;
  state: {
    revision: number;
    updatedBy: string;
    game: Game;
  };
}

export interface OnlineSession {
  code: string;
  uid: string;
  side: OnlineSide;
  host: boolean;
}

const firebaseConfig = {
  apiKey: "AIzaSyByKyy7PYBIMi2K1jxH6KmzfWbE2_SsB5A",
  authDomain: "deadline-38cdb.firebaseapp.com",
  databaseURL: "https://deadline-38cdb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "deadline-38cdb",
  storageBucket: "deadline-38cdb.firebasestorage.app",
  messagingSenderId: "768255871086",
  appId: "1:768255871086:web:2e07b1ce62e35a589cbe7f",
};

const roomPath = (code: string) => `protocol_grid_rooms/${code}`;
const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
const otherSide = (side: OnlineSide): OnlineSide => side === "attack" ? "defense" : "attack";

function firebaseServices() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { auth: getAuth(app), database: getDatabase(app) };
}

async function authenticatedUser() {
  const { auth } = firebaseServices();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

function randomRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function firebaseSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function registerPresence(session: OnlineSession) {
  const { database } = firebaseServices();
  const connectedRef = ref(database, `${roomPath(session.code)}/players/${session.side}/connected`);
  await onDisconnect(connectedRef).set(false);
  await set(connectedRef, true);
}

export async function refreshOnlinePresence(session: OnlineSession) {
  const user = await authenticatedUser();
  if (user.uid !== session.uid) throw new Error("온라인 세션 인증 정보가 일치하지 않습니다.");
  await registerPresence(session);
}

export async function createOnlineRoom<Game>(side: OnlineSide, game: Game): Promise<OnlineSession> {
  const user = await authenticatedUser();
  const { database } = firebaseServices();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomRoomCode();
    const now = Date.now();
    const room: OnlineRoom<Game> = {
      meta: { createdAt: now, hostUid: user.uid, hostSide: side, status: "waiting", phase: "lobby" },
      players: { [side]: { uid: user.uid, side, connected: true, joinedAt: now } },
      state: { revision: 0, updatedBy: user.uid, game: firebaseSafe(game) },
    };
    const result = await runTransaction(ref(database, roomPath(code)), (current) => current === null ? room : undefined, { applyLocally: false });
    if (!result.committed) continue;
    const session = { code, uid: user.uid, side, host: true } satisfies OnlineSession;
    await registerPresence(session);
    return session;
  }
  throw new Error("빈 온라인 방 코드를 만들지 못했습니다. 잠시 후 다시 시도하세요.");
}

export async function joinOnlineRoom(codeInput: string): Promise<OnlineSession> {
  const code = normalizeCode(codeInput);
  if (code.length < 4) throw new Error("4~6자리 방 코드를 입력하세요.");
  const user = await authenticatedUser();
  const { database } = firebaseServices();
  const roomRef = ref(database, roomPath(code));
  const initial = await get(roomRef);
  if (!initial.exists()) throw new Error("방을 찾을 수 없습니다.");
  const room = initial.val() as OnlineRoom<unknown>;
  const existingSide = (Object.entries(room.players ?? {}) as [OnlineSide, OnlinePlayer][]).find(([, player]) => player.uid === user.uid)?.[0];
  const side = existingSide ?? otherSide(room.meta.hostSide);
  if (!existingSide && room.players?.[side]) throw new Error("이미 두 플레이어가 참가한 방입니다.");
  if (room.meta.status === "ended") throw new Error("이미 종료된 방입니다.");

  const now = Date.now();
  const claim = await runTransaction(ref(database, `${roomPath(code)}/players/${side}`), (current) => {
    if (current !== null && current.uid !== user.uid) return undefined;
    return { uid: user.uid, side, connected: true, joinedAt: current?.joinedAt ?? now } satisfies OnlinePlayer;
  }, { applyLocally: false });
  if (!claim.committed) throw new Error("다른 플레이어가 먼저 참가했습니다.");

  const session = { code, uid: user.uid, side, host: user.uid === room.meta.hostUid } satisfies OnlineSession;
  await registerPresence(session);
  return session;
}

export async function resumeOnlineSession(saved: OnlineSession): Promise<OnlineSession> {
  const code = normalizeCode(saved.code);
  if (code.length < 4) throw new Error("저장된 온라인 방 코드가 올바르지 않습니다.");
  const user = await authenticatedUser();
  const { database } = firebaseServices();
  const snapshot = await get(ref(database, roomPath(code)));
  if (!snapshot.exists()) throw new Error("다시 접속할 온라인 방을 찾을 수 없습니다.");
  const room = snapshot.val() as OnlineRoom<unknown>;
  const side = (Object.entries(room.players ?? {}) as [OnlineSide, OnlinePlayer][])
    .find(([, player]) => player.uid === user.uid)?.[0];
  if (!side) throw new Error("이 브라우저의 기존 플레이어 자리를 확인할 수 없습니다.");
  const session = { code, uid: user.uid, side, host: room.meta.hostUid === user.uid } satisfies OnlineSession;
  await registerPresence(session);
  return session;
}

export async function getOnlineRoom<Game>(codeInput: string): Promise<OnlineRoom<Game>> {
  const code = normalizeCode(codeInput);
  await authenticatedUser();
  const { database } = firebaseServices();
  const snapshot = await get(ref(database, roomPath(code)));
  if (!snapshot.exists()) throw new Error("온라인 방을 찾을 수 없습니다.");
  return snapshot.val() as OnlineRoom<Game>;
}

export function subscribeOnlineGameState<Game>(code: string, listener: (state: OnlineRoom<Game>["state"] | null) => void): Unsubscribe {
  const { database } = firebaseServices();
  return onValue(ref(database, `${roomPath(normalizeCode(code))}/state`), (snapshot) => {
    listener(snapshot.exists() ? snapshot.val() as OnlineRoom<Game>["state"] : null);
  }, (error) => {
    console.error("온라인 게임 상태 구독 실패", error);
    listener(null);
  });
}

export function subscribeOnlineRoom<Game>(code: string, listener: (room: OnlineRoom<Game> | null) => void): Unsubscribe {
  const { database } = firebaseServices();
  const path = roomPath(normalizeCode(code));
  let meta: OnlineRoom<Game>["meta"] | null | undefined;
  let players: OnlineRoom<Game>["players"] | null | undefined;
  let state: OnlineRoom<Game>["state"] | null | undefined;
  let failed = false;
  const emit = () => {
    if (failed || meta === undefined || players === undefined || state === undefined) return;
    listener(meta && players && state ? { meta, players, state } : null);
  };
  const fail = (error: Error) => {
    if (failed) return;
    failed = true;
    console.error("온라인 방 구독 실패", error);
    listener(null);
  };
  const unsubscribers = [
    onValue(ref(database, `${path}/meta`), (snapshot) => { meta = snapshot.exists() ? snapshot.val() as OnlineRoom<Game>["meta"] : null; emit(); }, fail),
    onValue(ref(database, `${path}/players`), (snapshot) => { players = snapshot.exists() ? snapshot.val() as OnlineRoom<Game>["players"] : null; emit(); }, fail),
    onValue(ref(database, `${path}/state`), (snapshot) => { state = snapshot.exists() ? snapshot.val() as OnlineRoom<Game>["state"] : null; emit(); }, fail),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function publishOnlineGame<Game>(session: OnlineSession, game: Game) {
  const { database } = firebaseServices();
  const stateRef = ref(database, `${roomPath(session.code)}/state`);
  const result = await runTransaction(stateRef, (current) => ({
    revision: Number(current?.revision ?? 0) + 1,
    updatedBy: session.uid,
    game: firebaseSafe(game),
  }), { applyLocally: false });
  if (!result.committed) throw new Error("온라인 게임 상태를 저장하지 못했습니다.");
  return Number(result.snapshot.child("revision").val() ?? 0);
}

export async function setOnlinePhase(session: OnlineSession, phase: OnlinePhase) {
  const { database } = firebaseServices();
  await update(ref(database, `${roomPath(session.code)}/meta`), {
    phase,
    status: phase === "lobby" ? "waiting" : phase === "ended" ? "ended" : "playing",
  });
}

export async function swapOnlinePlayerSides(session: OnlineSession) {
  if (!session.host) throw new Error("방장만 온라인 진영을 교대할 수 있습니다.");
  const { database } = firebaseServices();
  const result = await runTransaction(ref(database, `${roomPath(session.code)}/players`), (current) => {
    if (!current?.attack || !current?.defense) return undefined;
    return {
      attack: { ...current.defense, side: "attack" },
      defense: { ...current.attack, side: "defense" },
    };
  }, { applyLocally: false });
  if (!result.committed) throw new Error("양쪽 플레이어가 연결되어 있어야 진영을 교대할 수 있습니다.");
}

export async function leaveOnlineRoom(session: OnlineSession) {
  const { database } = firebaseServices();
  await set(ref(database, `${roomPath(session.code)}/players/${session.side}/connected`), false);
}

export { normalizeCode };
