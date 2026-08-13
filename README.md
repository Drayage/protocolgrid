# Protocol: Grid

5대5 구역 전투, 역할별 행동 덱, 장비 경제, 스킬, 설치·해체 목표를 한 화면에서 플레이하는 전술 카드게임 프로토타입입니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다.

## 검증

```bash
npm run lint
npm test
```

## Firebase 온라인 대전

온라인 사람 vs 사람은 `deadline-38cdb` 프로젝트의 Realtime Database와 익명 로그인을 사용합니다.

1. Firebase Console의 Authentication에서 `익명` 로그인 제공업체를 활성화합니다.
2. Realtime Database의 규칙에 [firebase-database.rules.json](./firebase-database.rules.json)을 적용합니다.
3. Spark 무료 플랜을 유지하고 Cloud Billing 계정을 연결하지 않습니다.

Firebase CLI에 로그인되어 있다면 프로젝트 루트에서 다음 명령으로 규칙만 배포할 수 있습니다.

```bash
npx firebase-tools deploy --only database
```

방장이 양 팀 조합과 자기 진영을 정해 6자리 방을 만들고, 참가자는 코드만 입력하면 반대 진영으로 참가합니다. 구매·배치·전술 턴·교전 반응의 조작권과 게임 상태가 실시간으로 동기화됩니다.

## GitHub Pages

`main` 브랜치에 변경이 올라오면 `.github/workflows/deploy-pages.yml`이 테스트와 정적 빌드를 수행한 뒤 Pages에 배포합니다. 저장소 설정의 Pages 소스는 `GitHub Actions`를 사용합니다.

배포 주소: <https://drayage.github.io/protocolgrid/>
