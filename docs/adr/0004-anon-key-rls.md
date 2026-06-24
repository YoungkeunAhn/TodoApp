# ADR 0004 — anon key + RLS로 데이터 접근 제어

- 상태: **채택됨**
- 관련: [0001 Supabase 백엔드](./0001-supabase-backend.md), [schema.sql](../schema.sql)

## 맥락 (Context)

- 프론트엔드가 브라우저에서 직접 Supabase에 접속하므로 **접속 키가 코드에 노출**된다.
- Supabase는 두 종류의 키를 준다: `anon public`(공개용)과 `service_role`(전체 권한 비밀키).
- 키가 노출돼도 데이터가 함부로 조작되지 않도록 보호 장치가 필요하다.

## 결정 (Decision)

- 프론트에는 **`anon public` 키만** 사용한다. `service_role` 키는 절대 코드/깃허브에 넣지 않는다.
- 두 테이블(`categories`, `todos`)에 **RLS(Row Level Security)를 켜고** 정책으로 접근을 제어한다.
- 강의 실습 단계에서는 학습 편의를 위해 select/insert/update/delete를 모두 허용하는 정책을 둔다.

## 결과 (Consequences)

**좋은 점**
- anon key는 공개돼도 안전하므로 GitHub Pages 배포와 잘 맞는다.
- 실제 접근 제어는 DB 정책이 담당 → 키 노출 자체가 곧 위험이 아니다.

**감수하는 점**
- 현재 정책은 "누구나 가능"이라 **실서비스에는 부적절**하다.
  추후 로그인(Auth)을 붙여 "본인 데이터만" 접근하도록 정책을 좁혀야 한다.
- 보안의 책임이 코드가 아니라 **RLS 정책 설계**로 옮겨간다.
