# ADR 0005 — 통계는 DB View(category_stats)로 제공

- 상태: **채택됨**
- 관련: [통계 기능](../statistics.md), [category_stats_view.sql](../category_stats_view.sql)

## 맥락 (Context)

- 카테고리별 **남은 개수 / 완료 개수 / 평균 달성속도**를 보여줘야 한다.
- 이를 프론트에서 매번 계산하면, 할 일 전체를 가져와 `filter`/`reduce`로 가공하고
  카테고리별로 묶는 코드가 반복·복잡해진다.
- 집계 로직이 화면 코드에 흩어지면 유지보수가 어렵다.

## 결정 (Decision)

- 집계를 **DB의 View `category_stats`** 로 정의한다(전체/완료/남은 개수, 평균 달성속도).
- 프론트는 이 View를 **일반 테이블처럼 `select`** 만 해서 그대로 표시한다.
- 평균 달성속도 = `avg(completed_at - target_date)` (완료된 항목만).

## 결과 (Consequences)

**좋은 점**
- 집계 로직이 한 곳(SQL)에 모여 화면 코드가 단순해진다.
- 긴 JOIN/집계 쿼리를 매번 작성하지 않아도 된다.
- 동일 통계를 다른 화면에서도 재사용하기 쉽다.

**감수하는 점**
- 통계 정의가 바뀌면 SQL(View)을 다시 배포해야 한다.
- `security_invoker` 등 View와 RLS의 상호작용을 이해해야 한다(구버전 PG 호환 주의).
