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

## GitHub Pages

`main` 브랜치에 변경이 올라오면 `.github/workflows/deploy-pages.yml`이 테스트와 정적 빌드를 수행한 뒤 Pages에 배포합니다. 저장소 설정의 Pages 소스는 `GitHub Actions`를 사용합니다.

배포 주소: <https://drayage.github.io/protocolgrid/>
