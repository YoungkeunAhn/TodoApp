# ADR 0002 — 프레임워크 없이 정적 프론트엔드(HTML/CSS/JS)

- 상태: **채택됨**
- 관련: [0003 GitHub Pages 배포](./0003-github-pages-deploy.md)

## 맥락 (Context)

- 대상이 **초보자**라, React/번들러/빌드 도구를 도입하면 진입장벽이 커진다.
- 기능이 단순하다(카테고리·할 일 CRUD, 날짜 분류, 통계).
- 빌드 과정 없이 파일만 올리면 바로 배포되는 구조가 학습에 유리하다.

## 결정 (Decision)

- 빌드 없이 동작하는 **순수 HTML/CSS/JavaScript** 정적 사이트로 만든다.
- 라이브러리는 CDN `<script>`로만 불러온다(Supabase JS).
- 파일 구성: `index.html`, `style.css`, `config.js`, `app.js`.
- 디자인은 컴포넌트 라이브러리 대신 **자체 CSS**로 만든다(React 미사용이므로).
  - 초기에는 Material 느낌으로 흉내 냈으나, 이후 **Notion 스타일 + 라이트/다크**로 개편함([0008](./0008-notion-ui-light-dark.md)).

## 결과 (Consequences)

**좋은 점**
- `npm install` / 빌드 단계가 없어 따라 하기 쉽다.
- 파일을 그대로 GitHub Pages에 올리면 끝.

**감수하는 점**
- 상태관리·컴포넌트 재사용을 직접 DOM 조작으로 해야 한다.
- 규모가 커지면 코드 정리가 어려워질 수 있다(현재 범위에선 충분).
