-- ============================================================
-- 카테고리별 Todo 웹앱 - Supabase 테이블 생성 SQL
-- 사용법: Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 [Run]
-- 여러 번 실행해도 안전하도록 작성됨 (drop ... if exists 사용)
-- ============================================================

-- 1) 카테고리 테이블 ------------------------------------------
create table if not exists categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,   -- 같은 이름의 카테고리는 중복 저장 불가
  created_at  timestamptz not null default now()
);

-- 2) 할 일 테이블 --------------------------------------------
create table if not exists todos (
  id            bigint generated always as identity primary key,
  title         text not null,
  checked       boolean not null default false,
  category_id   bigint not null references categories (id) on delete cascade,
  target_date   date,
  completed_at  date,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- 초보자 실습용: 누구나 select / insert / update / delete 가능
-- (실제 서비스에서는 권한을 더 좁게 잡아야 함)
-- ============================================================

alter table categories enable row level security;
alter table todos      enable row level security;

-- categories 정책 --------------------------------------------
drop policy if exists "categories_select" on categories;
drop policy if exists "categories_insert" on categories;
drop policy if exists "categories_update" on categories;
drop policy if exists "categories_delete" on categories;

create policy "categories_select" on categories for select using (true);
create policy "categories_insert" on categories for insert with check (true);
create policy "categories_update" on categories for update using (true) with check (true);
create policy "categories_delete" on categories for delete using (true);

-- todos 정책 -------------------------------------------------
drop policy if exists "todos_select" on todos;
drop policy if exists "todos_insert" on todos;
drop policy if exists "todos_update" on todos;
drop policy if exists "todos_delete" on todos;

create policy "todos_select" on todos for select using (true);
create policy "todos_insert" on todos for insert with check (true);
create policy "todos_update" on todos for update using (true) with check (true);
create policy "todos_delete" on todos for delete using (true);

-- ============================================================
-- 테스트용 예시 데이터
-- ============================================================

insert into categories (name) values
  ('공부'),
  ('운동'),
  ('집안일');

-- category_id 는 위에서 만든 카테고리 이름으로 찾아서 넣는다.
insert into todos (title, category_id, target_date, checked, completed_at) values
  ('수학 문제집 풀기',  (select id from categories where name = '공부'),   '2026-06-23', true,  '2026-06-24'),
  ('영어 단어 외우기',  (select id from categories where name = '공부'),   '2026-06-24', false, null),
  ('30분 달리기',       (select id from categories where name = '운동'),   '2026-06-22', false, null),
  ('스쿼트 50개',       (select id from categories where name = '운동'),   '2026-06-24', false, null),
  ('빨래 돌리기',       (select id from categories where name = '집안일'), '2026-06-21', true,  '2026-06-23');
