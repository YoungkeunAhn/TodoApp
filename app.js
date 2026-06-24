// ============================================================
//  app.js  - 카테고리별 Todo 앱 로직
//  config.js 에서 SUPABASE_URL / SUPABASE_ANON_KEY 를 읽어 사용한다.
//  (프론트에는 anon public 키만 사용 — service_role 키는 절대 사용 금지)
// ============================================================

// Supabase 클라이언트 생성
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 화면에 들고 있을 데이터 (메모리 캐시)
let categories = [];   // [{id, name}]
let todos = [];        // [{id, title, checked, category_id, target_date, completed_at, categories:{name}}]

// 현재 화면 기준 날짜 (YYYY-MM-DD 문자열)
let selectedDate = todayStr();

// ---------- 날짜 도우미 ----------
// Date 객체를 "로컬 시간 기준" YYYY-MM-DD 문자열로 만든다.
// (toISOString()은 UTC로 바꿔버려서 시차만큼 날짜가 어긋나므로 쓰지 않는다.)
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() {
  return fmtDate(new Date());
}
function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00"); // 로컬 자정으로 해석
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}
function diffDays(a, b) {
  // a - b (일 수)
  return Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);
}

// ============================================================
//  데이터 불러오기
// ============================================================

// 카테고리 조회
async function loadCategories() {
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("name");
  if (error) { alert("카테고리 불러오기 실패: " + error.message); return; }
  categories = data;
  renderCategories();
  renderCategoryOptions();
}

// 할 일 조회 (categories 와 JOIN 해서 카테고리 이름까지 가져온다)
async function loadTodos() {
  const { data, error } = await sb
    .from("todos")
    .select("id, title, checked, category_id, target_date, completed_at, categories ( name )")
    .order("target_date", { ascending: true });
  if (error) { alert("할 일 불러오기 실패: " + error.message); return; }
  todos = data;
  renderTodos();
}

// 카테고리별 통계 조회 (category_stats View 를 일반 테이블처럼 조회)
async function loadStats() {
  const { data, error } = await sb
    .from("category_stats")
    .select("*")
    .order("category_name");
  if (error) { alert("통계 불러오기 실패: " + error.message); return; }
  renderStats(data);
}

// ============================================================
//  카테고리 추가
// ============================================================
async function addCategory(name) {
  // 중복 검사: 이미 같은 이름(대소문자/앞뒤공백 무시)의 카테고리가 있으면 막는다
  const exists = categories.some(
    (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (exists) {
    alert(`"${name}" 카테고리는 이미 있습니다.`);
    return;
  }

  const { error } = await sb.from("categories").insert({ name });
  if (error) {
    // DB UNIQUE 제약에 걸린 경우(코드 23505)도 중복 안내로 처리
    if (error.code === "23505") {
      alert(`"${name}" 카테고리는 이미 있습니다.`);
    } else {
      alert("카테고리 추가 실패: " + error.message);
    }
    return;
  }
  await loadCategories();
  await loadStats();
}

// ============================================================
//  할 일 추가 / 완료토글 / 삭제
// ============================================================
async function addTodo(title, categoryId, targetDate) {
  const { error } = await sb.from("todos").insert({
    title,
    category_id: categoryId,
    target_date: targetDate,
    checked: false,
    completed_at: null,
  });
  if (error) { alert("할 일 추가 실패: " + error.message); return; }
  await loadTodos();
  await loadStats();
}

// 완료 체크 토글: 켜면 checked=true, completed_at=오늘 / 끄면 false, null
async function toggleTodo(id, isChecked) {
  const patch = isChecked
    ? { checked: true, completed_at: todayStr() }
    : { checked: false, completed_at: null };
  const { error } = await sb.from("todos").update(patch).eq("id", id);
  if (error) { alert("완료 처리 실패: " + error.message); return; }
  await loadTodos();
  await loadStats();
}

async function deleteTodo(id) {
  const { error } = await sb.from("todos").delete().eq("id", id);
  if (error) { alert("삭제 실패: " + error.message); return; }
  await loadTodos();
  await loadStats();
}

// ============================================================
//  화면 그리기
// ============================================================
function renderCategories() {
  const ul = document.getElementById("category-list");
  ul.innerHTML = "";
  categories.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c.name;
    ul.appendChild(li);
  });
}

function renderCategoryOptions() {
  const sel = document.getElementById("todo-category");
  sel.innerHTML = "";
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function renderTodos() {
  document.getElementById("selected-date-text").textContent = selectedDate;

  // 밀린 할 일: 미완료 + target_date 가 기준 날짜보다 이전
  const overdue = todos.filter(
    (t) => !t.checked && t.target_date && t.target_date < selectedDate
  );
  // 오늘(기준 날짜) 할 일: target_date 가 기준 날짜와 같음
  const today = todos.filter((t) => t.target_date === selectedDate);

  drawList("overdue-list", overdue, true);
  drawList("today-list", today, false);
}

function drawList(elId, list, showOverdueBadge) {
  const ul = document.getElementById(elId);
  ul.innerHTML = "";
  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "없음";
    ul.appendChild(li);
    return;
  }
  list.forEach((t) => {
    const li = document.createElement("li");

    // 완료 체크박스
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.checked;
    cb.addEventListener("change", () => toggleTodo(t.id, cb.checked));

    // 제목 + 메타정보
    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.title;
    if (t.checked) title.style.textDecoration = "line-through";

    const meta = document.createElement("div");
    meta.className = "meta";
    const catName = t.categories ? t.categories.name : "(카테고리 없음)";
    let metaText = `<span class="cat">${catName}</span>해야 하는 날짜: ${t.target_date}`;
    // 밀린 할 일이면 며칠 밀렸는지 표시 (원래 날짜는 그대로 둠)
    if (showOverdueBadge) {
      const late = diffDays(selectedDate, t.target_date);
      metaText += ` · <strong>${late}일 밀림</strong>`;
    }
    meta.innerHTML = metaText;

    info.appendChild(title);
    info.appendChild(meta);

    // 삭제 버튼
    const del = document.createElement("button");
    del.className = "del-btn";
    del.textContent = "삭제";
    del.addEventListener("click", () => deleteTodo(t.id));

    li.appendChild(cb);
    li.appendChild(info);
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function renderStats(rows) {
  const tbody = document.getElementById("stats-body");
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const speed =
      r.avg_speed_days === null || r.avg_speed_days === undefined
        ? "기록 없음"
        : `${Number(r.avg_speed_days).toFixed(1)}일`;
    tr.innerHTML = `
      <td>${r.category_name}</td>
      <td>${r.remaining_count}</td>
      <td>${r.done_count}</td>
      <td>${speed}</td>`;
    tbody.appendChild(tr);
  });
}

// ============================================================
//  이벤트 연결
// ============================================================
document.getElementById("category-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("category-name");
  const name = input.value.trim();
  if (!name) return;
  addCategory(name);
  input.value = "";
});

document.getElementById("todo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("todo-title").value.trim();
  const categoryId = document.getElementById("todo-category").value;
  const date = document.getElementById("todo-date").value;
  if (!title || !categoryId || !date) {
    alert("제목, 카테고리, 날짜를 모두 입력하세요.");
    return;
  }
  addTodo(title, categoryId, date);
  document.getElementById("todo-title").value = "";
});

// 날짜 이동 버튼
function setDate(dateStr) {
  selectedDate = dateStr;
  document.getElementById("pick-day").value = dateStr;
  renderTodos();
}
document.getElementById("prev-day").addEventListener("click", () => setDate(shiftDate(selectedDate, -1)));
document.getElementById("next-day").addEventListener("click", () => setDate(shiftDate(selectedDate, +1)));
document.getElementById("today-day").addEventListener("click", () => setDate(todayStr()));
document.getElementById("pick-day").addEventListener("change", (e) => setDate(e.target.value));

// ============================================================
//  처음 열 때 실행
// ============================================================
async function init() {
  // 날짜 입력칸 기본값을 오늘로
  document.getElementById("todo-date").value = todayStr();
  document.getElementById("pick-day").value = selectedDate;
  document.getElementById("selected-date-text").textContent = selectedDate;

  await loadCategories();
  await loadTodos();
  await loadStats();
}

init();
