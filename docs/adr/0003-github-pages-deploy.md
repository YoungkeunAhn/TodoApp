# ADR 0003 — GitHub Pages로 배포

- 상태: **채택됨**
- 관련: [배포 가이드](../deploy-github-pages.md), [0002 정적 프론트엔드](./0002-vanilla-frontend.md)

## 맥락 (Context)

- 만든 앱을 인터넷에 공개해 다른 기기/사람이 접속할 수 있어야 한다.
- 정적 사이트라 별도 서버 호스팅이 필요 없다(→ [ADR 0002](./0002-vanilla-frontend.md)).
- 초보자가 추가 비용·계정 없이 쓸 수 있는 무료 배포처가 필요하다.

## 결정 (Decision)

- **GitHub Pages**로 `main` 브랜치 루트(`/`)를 배포한다.
- 코드 수정 후 `git push`만 하면 자동으로 재배포된다.
- 배포 주소: `https://<아이디>.github.io/<저장소>/`.

## 결과 (Consequences)

**좋은 점**
- 무료, 별도 배포 파이프라인 불필요(push = 배포).
- Git 학습(add/commit/push)과 배포가 자연스럽게 연결된다.

**감수하는 점**
- 정적 파일만 호스팅 가능(서버 로직은 불가 → Supabase가 담당).
- 진입점 파일 이름이 반드시 `index.html`이어야 한다.
- 반영까지 약 1~2분 지연이 있다.
