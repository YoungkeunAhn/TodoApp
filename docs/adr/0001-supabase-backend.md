# ADR 0001 — 백엔드로 Supabase 사용

- 상태: **채택됨**
- 관련: [데이터 구조](../data-model.md), [0004 anon key + RLS](./0004-anon-key-rls.md)

## 맥락 (Context)

- 초보자 강의용 Todo 앱이라 **서버를 직접 만들고 운영하기는 부담**스럽다.
- 그래도 데이터는 브라우저 새로고침/다른 기기에서도 유지되도록 **진짜 DB에 저장**해야 한다.
- 별도 백엔드 코드(Node 서버 등) 없이 프론트에서 바로 DB를 다룰 수 있으면 좋다.

## 결정 (Decision)

- 백엔드/DB로 **Supabase**(PostgreSQL + 자동 생성 REST API + JS 클라이언트)를 사용한다.
- 프론트엔드는 `@supabase/supabase-js` 라이브러리로 DB에 직접 질의한다.

## 결과 (Consequences)

**좋은 점**
- 서버 코드를 작성·배포하지 않아도 CRUD가 된다(초보자 친화적).
- 무료 플랜으로 실습 가능, Table Editor로 데이터 확인이 쉽다.
- PostgreSQL이라 View·제약조건 등 SQL 기능을 그대로 쓸 수 있다.

**감수하는 점**
- 데이터 보호를 **RLS 정책에 의존**해야 한다(→ [ADR 0004](./0004-anon-key-rls.md)).
- 외부 서비스(Supabase)에 종속된다.
