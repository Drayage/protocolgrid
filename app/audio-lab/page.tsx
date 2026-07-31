"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { configureTacticalAudio, playTacticalSound, unlockTacticalAudio, type TacticalAudioProfile } from "../game-audio";

const WEAPON_SAMPLES = [
  { id: "classic", name: "클래식", type: "권총" },
  { id: "sheriff", name: "셰리프", type: "중권총" },
  { id: "bucky", name: "버키", type: "샷건" },
  { id: "judge", name: "저지", type: "자동 샷건" },
  { id: "spectre", name: "스펙터", type: "기관단총" },
  { id: "bulldog", name: "불독", type: "소총" },
  { id: "phantom", name: "팬텀", type: "저소음 소총" },
  { id: "vandal", name: "밴달", type: "고화력 소총" },
  { id: "outlaw", name: "아웃로", type: "저격총" },
  { id: "operator", name: "오퍼레이터", type: "중저격총" },
] as const;

const UTILITY_SAMPLES = [
  { id: "tailwind", kind: "self", name: "순풍", agent: "제트", note: "압축 공기·고속 이탈" },
  { id: "updraft", kind: "self", name: "상승 기류", agent: "제트", note: "바닥 충격·상승 풍압" },
  { id: "paint", kind: "throw", name: "페인트탄", agent: "레이즈", note: "안전핀·비행·다단 폭발" },
  { id: "blast", kind: "deploy", name: "폭발 팩", agent: "레이즈", note: "부착·평면 충격파" },
  { id: "curve", kind: "throw", name: "커브볼", agent: "피닉스", note: "회전 비행·섬광 파열" },
  { id: "hot", kind: "throw", name: "뜨거운 손", agent: "피닉스", note: "점화·화염 확산" },
  { id: "gear", kind: "self", name: "고속 기어", agent: "네온", note: "전기 모터 가속" },
  { id: "relay", kind: "throw", name: "릴레이 볼트", agent: "네온", note: "비행·이중 전기 충격" },
  { id: "trip", kind: "deploy", name: "함정 철선", agent: "사이퍼", note: "와이어 장력·래치" },
  { id: "camera", kind: "deploy", name: "스파이캠", agent: "사이퍼", note: "렌즈 서보·셔터" },
  { id: "turret", kind: "deploy", name: "포탑", agent: "킬조이", note: "라쳇·서보·타깃 잠금" },
  { id: "alarm", kind: "deploy", name: "알람봇", agent: "킬조이", note: "센서 전개·무장" },
  { id: "recon", kind: "scan", name: "정찰 화살", agent: "소바", note: "활시위·전개·3회 스캔" },
  { id: "shock", kind: "throw", name: "충격 화살", agent: "소바", note: "활시위·전기 충격" },
  { id: "flash", kind: "burst", name: "섬광 폭발", agent: "브리치", note: "벽면 장전·압력 파열" },
  { id: "aftershock", kind: "burst", name: "여진", agent: "브리치", note: "3단 구조 충격" },
  { id: "smoke", kind: "smoke", name: "공중 연막", agent: "브림스톤", note: "발사기·비행·가스 분출" },
  { id: "stim", kind: "deploy", name: "전투 자극제", agent: "브림스톤", note: "투척·가압 장치 작동" },
  { id: "dark", kind: "smoke", name: "어둠의 장막", agent: "오멘", note: "공간 수축·저역 압력" },
  { id: "shadow", kind: "teleport", name: "어둠의 발걸음", agent: "오멘", note: "진공 흡입·재구성" },
] as const;

export default function AudioLabPage() {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [profile, setProfile] = useState<TacticalAudioProfile>("headset");
  const [lastPlayed, setLastPlayed] = useState("대기 중");
  const demoTimers = useRef<number[]>([]);

  useEffect(() => {
    configureTacticalAudio(enabled, volume / 100, profile);
  }, [enabled, volume, profile]);

  useEffect(() => {
    const timers = demoTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const play = (label: string, sound: Parameters<typeof playTacticalSound>[0]) => {
    unlockTacticalAudio();
    configureTacticalAudio(true, volume / 100, profile);
    setEnabled(true);
    setLastPlayed(label);
    playTacticalSound(sound);
  };

  const playDemo = () => {
    demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    const sequence: Array<[number, string, Parameters<typeof playTacticalSound>[0]]> = [
      [0, "교전 진입", { type: "encounter" }],
      [600, "밴달 몸통", { type: "shot", weapon: "vandal", hit: true, head: false }],
      [1350, "팬텀 빗나감", { type: "shot", weapon: "phantom", hit: false, head: false }],
      [2050, "오퍼레이터 헤드샷", { type: "shot", weapon: "operator", hit: true, head: true }],
      [3000, "정찰 화살", { type: "skill", skillId: "recon", kind: "scan" }],
      [3800, "3연속 처치", { type: "kill", count: 3 }],
      [4550, "라운드 승리", { type: "round", winner: "defense" }],
    ];
    sequence.forEach(([delay, label, sound]) => {
      const timer = window.setTimeout(() => play(label, sound), delay);
      demoTimers.current.push(timer);
    });
  };

  return <main className="audio-lab">
    <header className="audio-lab-hero">
      <div><span>PROTOCOL: GRID // SOUND REVIEW</span><h1>TACTICAL AUDIO LAB</h1><p>새 효과음 후보를 본 게임에 넣기 전에 직접 확인하는 청음실입니다.</p></div>
      <Link href="/">게임으로 돌아가기</Link>
    </header>

    <section className="audio-console">
      <div className="audio-master">
        <button className="audio-demo" onClick={playDemo}><b>전체 데모 재생</b><small>교전부터 라운드 결과까지</small></button>
        <label><span>MASTER VOLUME</span><b>{volume}%</b><input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
        <div className="lab-profile-switch"><button className={profile === "headset" ? "active" : ""} onClick={() => setProfile("headset")}>HEADSET</button><button className={profile === "speakers" ? "active" : ""} onClick={() => setProfile("speakers")}>SPEAKER</button></div>
        <button className={enabled ? "audio-toggle on" : "audio-toggle"} onClick={() => setEnabled((value) => !value)}>{enabled ? "SOUND ON" : "MUTED"}</button>
      </div>
      <div className="audio-now"><i /><span>LAST SIGNAL</span><strong>{lastPlayed}</strong><small>첫 재생은 브라우저 정책상 버튼을 눌러야 시작됩니다.</small></div>
    </section>

    <section className="audio-section">
      <header><span>01</span><div><h2>총기·피격</h2><p>총구 파열, 압력 몸통, 고유 기계 작동의 세 박자로 총기를 구분합니다.</p></div></header>
      <div className="weapon-sample-grid">
        {WEAPON_SAMPLES.map((weapon) => <article key={weapon.id}>
          <div><span>{weapon.type}</span><strong>{weapon.name}</strong></div>
          <button onClick={() => play(`${weapon.name} 몸통`, { type: "shot", weapon: weapon.id, hit: true, head: false })}>BODY</button>
          <button onClick={() => play(`${weapon.name} 헤드샷`, { type: "shot", weapon: weapon.id, hit: true, head: true })}>HEAD</button>
          <button onClick={() => play(`${weapon.name} 빗나감`, { type: "shot", weapon: weapon.id, hit: false, head: false })}>MISS</button>
        </article>)}
        <article className="turret-sample"><div><span>설치물</span><strong>킬조이 포탑</strong></div><button onClick={() => play("포탑 명중", { type: "shot", weapon: "classic", hit: true, head: false, turret: true })}>HIT</button><button onClick={() => play("포탑 빗나감", { type: "shot", weapon: "classic", hit: false, head: false, turret: true })}>MISS</button></article>
      </div>
    </section>

    <section className="audio-section">
      <header><span>02</span><div><h2>스킬</h2><p>공기·폭약·전기·감시장치·벽면 충격·공간 왜곡을 서로 다른 재질로 분리했습니다.</p></div></header>
      <div className="utility-sample-grid">
        {UTILITY_SAMPLES.map((sample) => <button key={sample.id} onClick={() => play(`${sample.agent} · ${sample.name}`, { type: "skill", skillId: sample.id, kind: sample.kind })}><span>{sample.agent.toUpperCase()}</span><strong>{sample.name}</strong><small>{sample.note}</small><i>▶</i></button>)}
      </div>
    </section>

    <section className="audio-section audio-objectives">
      <header><span>03</span><div><h2>전황·목표·연속킬</h2><p>킬 단계는 위로 상승하고, 라운드 결과는 낮은 충격과 열린 5도로 장엄하게 닫힙니다.</p></div></header>
      <div className="signal-groups">
        <article><h3>COMBAT</h3><button onClick={() => play("교전 진입", { type: "encounter" })}>교전 진입</button><button onClick={() => play("공격팀 턴", { type: "turn", side: "attack" })}>공격 턴</button><button onClick={() => play("수비팀 턴", { type: "turn", side: "defense" })}>수비 턴</button></article>
        <article><h3>SPIKE</h3><button onClick={() => play("스파이크 설치 시작", { type: "spike", status: "planting" })}>설치 시작</button><button onClick={() => play("스파이크 설치 완료", { type: "spike", status: "planted" })}>설치 완료</button><button onClick={() => play("스파이크 해체", { type: "spike", status: "defused" })}>해체</button><button onClick={() => play("스파이크 폭발", { type: "spike", status: "exploded" })}>폭발</button></article>
        <article><h3>MULTIKILL</h3>{[1, 2, 3, 4, 5].map((count) => <button key={count} onClick={() => play(`${count}연속 처치`, { type: "kill", count })}>{count} KILL</button>)}</article>
        <article><h3>ROUND</h3><button onClick={() => play("공격팀 승리", { type: "round", winner: "attack" })}>공격 승리</button><button onClick={() => play("수비팀 승리", { type: "round", winner: "defense" })}>수비 승리</button></article>
      </div>
    </section>

    <footer className="audio-lab-footer"><span>ORIGINAL PROCEDURAL AUDIO</span><p>실제 게임 음원은 사용하지 않았으며, 확정 전까지 본 게임에는 배포하지 않습니다.</p></footer>
  </main>;
}
