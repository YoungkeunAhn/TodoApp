-- ============================================================
-- 기존 DB에서 카테고리 중복을 정리하고 UNIQUE 제약을 거는 SQL
--   이미 schema.sql 로 테이블을 만든 뒤(중복이 생긴 상태) 1번만 실행한다.
--   Supabase → SQL Editor 에 붙여넣고 [Run]
-- ============================================================

-- 1) 같은 이름의 중복 카테고리 중 "가장 작은 id" 하나만 남기고,
--    나머지 중복 카테고리에 달린 할 일(todos)을 남길 카테고리로 옮긴다.
update todos t
set category_id = keep.min_id
from (
  select name, min(id) as min_id
  from categories
  group by name
) keep
join categories dup on dup.name = keep.name and dup.id <> keep.min_id
where t.category_id = dup.id;

-- 2) 옮기고 난 뒤 남은 중복 카테고리(같은 이름의 큰 id들)를 삭제한다.
delete from categories c
using (
  select name, min(id) as min_id
  from categories
  group by name
) keep
where c.name = keep.name and c.id <> keep.min_id;

-- 3) 앞으로는 같은 이름이 들어오지 못하도록 UNIQUE 제약을 추가한다.
--    (이미 제약이 있으면 오류가 날 수 있는데, 그러면 이미 적용된 것이니 무시해도 된다.)
alter table categories add constraint categories_name_key unique (name);
