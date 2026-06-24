-- ============================================================
-- category_stats View
--   카테고리별 통계를 한 번에 묶어주는 뷰(View).
--   프론트에서 매번 JOIN/집계 쿼리를 쓰지 않고
--   이 뷰를 일반 테이블처럼 select 만 하면 된다.
--
-- 사용법: Supabase → SQL Editor 에 붙여넣고 [Run]
--   (schema.sql 로 categories / todos 를 먼저 만든 뒤 실행)
-- ============================================================

create or replace view category_stats
with (security_invoker = true)   -- 조회한 사용자의 권한(RLS)을 그대로 적용
as
select
  c.id                                                        as category_id,
  c.name                                                      as category_name,
  count(t.id)                                                 as total_count,      -- 전체 개수
  count(t.id) filter (where t.checked)                        as done_count,       -- 완료 개수
  count(t.id) filter (where not t.checked)                    as remaining_count,  -- 남은 개수
  avg( (t.completed_at - t.target_date) )                                          -- 평균 달성속도(일)
    filter (where t.checked
                  and t.completed_at is not null
                  and t.target_date is not null)              as avg_speed_days
from categories c
left join todos t on t.category_id = c.id
group by c.id, c.name
order by c.name;

-- 참고:
--  - (completed_at - target_date) 는 날짜 - 날짜 라서 결과가 "일 수(정수)" 로 나온다.
--  - 음수면 마감보다 일찍, 0이면 당일, 양수면 늦게 완료한 것.
--  - 완료한 할 일이 없으면 avg_speed_days 는 NULL → 화면에서는 "기록 없음" 으로 표시.
--  - 만약 'security_invoker' 옵션에서 오류가 나면(구버전 Postgres),
--    그 줄을 지우고 다시 실행해도 실습에는 문제 없다.
