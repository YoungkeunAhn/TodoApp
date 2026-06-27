-- ============================================================
-- 기존 DB에 카테고리 "색" 컬럼을 추가하는 마이그레이션 SQL
--   이미 schema.sql 로 categories 테이블을 만든 뒤 1번만 실행한다.
--   Supabase → SQL Editor 에 붙여넣고 [Run]
--   (여러 번 실행해도 안전 — if not exists 사용)
-- ============================================================

-- 1) categories 에 color 컬럼 추가 ----------------------------
--    색은 "키"(blue/green/orange/red/purple/yellow/pink/gray)로 저장한다.
--    실제 색(hex) 매핑은 프론트(app.js)의 CATEGORY_COLORS 팔레트가 들고 있다.
--    비어 있으면(null) 프론트가 카테고리 이름으로 기본색을 자동 부여한다.
alter table categories add column if not exists color text;

-- 2) (선택) 기존 카테고리에 기본 색을 채워 넣기 -----------------
--    id 순서대로 팔레트 8색을 돌려가며 배정한다.
--    색이 비어 있는(null) 행만 채우므로, 이미 색이 있으면 건드리지 않는다.
with palette as (
  select arr, row_number() over () - 1 as idx
  from unnest(array['blue','green','orange','red','purple','yellow','pink','gray']) as arr
),
ranked as (
  select id, (row_number() over (order by id) - 1) as rn
  from categories
  where color is null
)
update categories c
set color = p.arr
from ranked r
join palette p on p.idx = (r.rn % 8)
where c.id = r.id;

-- 참고:
--  - color 는 화면 표시에만 쓰이는 값이라 NOT NULL 제약은 걸지 않는다.
--    (비어 있어도 프론트가 이름 해시로 안정적인 기본색을 보여준다.)
--  - 색을 바꾸려면 앱 사이드바에서 카테고리 색 점을 눌러 팔레트에서 고르면 된다.
