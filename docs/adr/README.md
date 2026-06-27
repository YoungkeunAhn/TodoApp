# 아키텍처 결정 기록 (ADR)

> [← 메인 문서로 돌아가기](../README.md)

ADR(Architecture Decision Record)은 "왜 이렇게 만들었는가"를 한 건씩 짧게 남기는 문서다.
나중에 다른 방식이 떠올랐을 때, 과거에 무엇을 고려했는지 다시 볼 수 있게 한다.

## 형식

각 ADR은 다음을 담는다.
- **상태(Status)**: 제안됨 / 채택됨 / 폐기됨 / 대체됨
- **맥락(Context)**: 어떤 상황·제약이 있었나
- **결정(Decision)**: 무엇을 골랐나
- **결과(Consequences)**: 그래서 좋은 점 / 감수하는 점

## 목록

| 번호 | 제목 | 상태 |
| --- | --- | --- |
| [0001](./0001-supabase-backend.md) | 백엔드로 Supabase 사용 | 채택됨 |
| [0002](./0002-vanilla-frontend.md) | 프레임워크 없이 정적 프론트엔드(HTML/CSS/JS) | 채택됨 |
| [0003](./0003-github-pages-deploy.md) | GitHub Pages로 배포 | 채택됨 |
| [0004](./0004-anon-key-rls.md) | anon key + RLS로 데이터 접근 제어 | 채택됨 |
| [0005](./0005-category-stats-view.md) | 통계는 DB View(category_stats)로 제공 | 채택됨 |
| [0006](./0006-overdue-keep-original-date.md) | 밀린 할 일은 원래 날짜를 유지 | 채택됨 |
| [0007](./0007-unique-category-name.md) | 카테고리 이름 중복 방지(UNIQUE) | 채택됨 |
| [0008](./0008-notion-ui-light-dark.md) | UI를 Notion 스타일 + 라이트/다크 테마로 개편 | 채택됨 |
| [0009](./0009-category-edit-delete.md) | 카테고리 수정·삭제(삭제는 할 일까지 CASCADE) | 채택됨 |
| [0010](./0010-category-color.md) | 카테고리 색상(색 점으로 구분, DB 저장·수정) | 채택됨 |
