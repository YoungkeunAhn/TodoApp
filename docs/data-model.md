# 데이터 구조 (Data Model)

> [← 메인 문서로 돌아가기](./README.md)

이 웹앱은 두 종류의 데이터를 저장한다: **카테고리**와 **할 일**.
데이터는 Supabase(PostgreSQL)에 저장한다.

---

## 1. 카테고리 (categories)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid / 정수 | 카테고리 고유 번호 (자동 생성) |
| `name` | 텍스트 | 카테고리 이름 (예: "공부", "운동") |
| `color` | 텍스트 (비어있을 수 있음) | 색 키 (`blue`/`green`/`orange`/`red`/`purple`/`yellow`/`pink`/`gray`). 화면에서 **색 점**으로 표시 · [ADR 0010](./adr/0010-category-color.md) |
| `created_at` | 날짜시간 | 만든 시각 (자동 기록) |

## 2. 할 일 (todos)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid / 정수 | 할 일 고유 번호 (자동 생성) |
| `title` | 텍스트 | 할 일 제목 (예: "수학 문제집 풀기") |
| `category_id` | uuid / 정수 | 어떤 카테고리에 속하는지 (categories.id 참조) |
| `due_date` | 날짜 | **해야 하는 날짜** |
| `is_done` | 참/거짓 | **완료 여부** (기본값: 거짓) |
| `done_date` | 날짜 (비어있을 수 있음) | **완료한 날짜** (완료 체크할 때 기록) |
| `created_at` | 날짜시간 | 만든 시각 (자동 기록) |

## 3. 관계

```
categories (1) ────< (N) todos
       하나의 카테고리는 여러 개의 할 일을 가진다.
       하나의 할 일은 하나의 카테고리에 속한다.
```

- `todos.category_id`는 `categories.id`를 참조하며 **`ON DELETE CASCADE`** 다.
  즉 **카테고리를 삭제하면 그 카테고리의 할 일도 함께 삭제**된다
  (UI에서 삭제 전 개수를 경고한다 — [카테고리 기능](./category.md) · [ADR 0009](./adr/0009-category-edit-delete.md)).

## 4. 데이터 규칙

- `is_done`이 **거짓**이면 `done_date`는 **비어 있다(null)**.
- `is_done`이 **참**이 되는 순간 `done_date`에 **완료한 날짜**를 기록한다.
- 완료를 취소(체크 해제)하면 `is_done`을 거짓으로 되돌리고 `done_date`를 비운다.
- `due_date`는 할 일을 추가할 때 반드시 입력한다.

## 5. 예시 데이터

**categories**
| id | name | color |
| --- | --- | --- |
| 1 | 공부 | blue |
| 2 | 운동 | green |

**todos**
| id | title | category_id | due_date | is_done | done_date |
| --- | --- | --- | --- | --- | --- |
| 1 | 수학 문제집 풀기 | 1 | 2026-06-23 | true | 2026-06-24 |
| 2 | 영어 단어 외우기 | 1 | 2026-06-24 | false | (없음) |
| 3 | 30분 달리기 | 2 | 2026-06-22 | false | (없음) |
