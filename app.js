// ============================================================
//  app.js  - 카테고리별 Todo 앱 로직
//  config.js 에서 SUPABASE_URL / SUPABASE_ANON_KEY 를 읽어 사용한다.
//  (프론트에는 anon public 키만 사용 — service_role 키는 절대 사용 금지)
// ============================================================

// Supabase 클라이언트 생성
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 화면에 들고 있을 데이터 (메모리 캐시)
let categories = [];          // [{id, name, color}]
let todos = [];               // [{id, title, checked, category_id, target_date, completed_at, categories:{name}}]
let categoryById = new Map(); // id → 카테고리 객체 (색 빠른 조회용)

// 할 일 추가 컴포저에서 현재 선택된 카테고리 id (커스텀 드롭다운이 관리)
let composerCategoryId = "";

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
//  카테고리 색상 도우미
//  - 색은 DB(categories.color)에 "키"(blue, green ...)로 저장한다.
//  - 키 → 실제 색(hex) 매핑은 아래 팔레트가 단일 소스(single source of truth)다.
//  - color 가 없는(예전) 카테고리는 이름 해시로 안정적인 기본색을 준다.
//  - 색은 글자색/배경색이 아니라 "색 점(dot)"으로만 표현한다.
// ============================================================
const CATEGORY_COLORS = [
  { key: "blue",   label: "파랑", hex: "#2383e2" },
  { key: "green",  label: "초록", hex: "#4dab6d" },
  { key: "orange", label: "주황", hex: "#e0883d" },
  { key: "red",    label: "빨강", hex: "#eb5757" },
  { key: "purple", label: "보라", hex: "#9b6dd6" },
  { key: "yellow", label: "노랑", hex: "#d9a73a" },
  { key: "pink",   label: "분홍", hex: "#dc669b" },
  { key: "gray",   label: "회색", hex: "#9b9a97" },
];
const COLOR_HEX = Object.fromEntries(CATEGORY_COLORS.map((c) => [c.key, c.hex]));

// 이름으로 안정적인 기본 색 키를 고른다(색이 지정되지 않은 카테고리용 폴백).
function colorKeyForName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length].key;
}
// 카테고리 객체 → 색 키
function categoryColorKey(cat) {
  if (cat && cat.color && COLOR_HEX[cat.color]) return cat.color;
  return colorKeyForName(cat && cat.name ? cat.name : "");
}
// 카테고리 객체 → 실제 색(hex)
function categoryHex(cat) {
  return COLOR_HEX[categoryColorKey(cat)];
}
// id 로 색(hex) 조회 (통계·할 일 목록처럼 id만 있을 때)
function categoryHexById(id) {
  return categoryHex(categoryById.get(Number(id)) || categoryById.get(id));
}
// 색 점 1개의 HTML (인라인 스타일로 색 지정)
function dotHTML(hex) {
  return `<span class="cat-dot" style="background:${hex}"></span>`;
}
// HTML 삽입 시 사용자 입력(카테고리 이름 등)을 이스케이프
function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  categoryById = new Map(categories.map((c) => [c.id, c]));
  // 컴포저에서 고른 카테고리가 사라졌으면 첫 카테고리로 되돌린다.
  if (!categories.some((c) => String(c.id) === String(composerCategoryId))) {
    composerCategoryId = categories.length ? String(categories[0].id) : "";
  }
  renderCategories();
  renderCategorySelect();
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

  // 새 카테고리에는 팔레트를 순환하며 기본 색을 준다(나중에 점을 눌러 바꿀 수 있음).
  const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length].key;
  const { error } = await sb.from("categories").insert({ name, color });
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
//  카테고리 수정 / 삭제
// ============================================================

// 카테고리 이름 수정
async function renameCategory(id, newName) {
  // 중복 검사: 자기 자신을 제외하고 같은 이름(대소문자/앞뒤공백 무시)이 있으면 막는다
  const exists = categories.some(
    (c) =>
      c.id !== id &&
      c.name.trim().toLowerCase() === newName.trim().toLowerCase()
  );
  if (exists) {
    alert(`"${newName}" 카테고리는 이미 있습니다.`);
    return;
  }

  const { error } = await sb
    .from("categories")
    .update({ name: newName })
    .eq("id", id);
  if (error) {
    // DB UNIQUE 제약(23505)에 걸린 경우도 중복 안내로 처리
    if (error.code === "23505") {
      alert(`"${newName}" 카테고리는 이미 있습니다.`);
    } else {
      alert("카테고리 수정 실패: " + error.message);
    }
    return;
  }
  await loadCategories();
  await loadTodos(); // 할 일 목록에 표시되는 카테고리 이름도 갱신
  await loadStats();
}

// 카테고리 삭제
// 주의: todos.category_id 는 ON DELETE CASCADE 라서, 카테고리를 지우면
// 그 카테고리에 속한 할 일도 DB에서 함께 삭제된다(schema.sql 참고).
async function deleteCategory(id) {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) {
    alert("카테고리 삭제 실패: " + error.message);
    return;
  }
  await loadCategories();
  await loadTodos();
  await loadStats();
}

// 카테고리 색 변경 (사이드바 색 점을 눌러 팔레트에서 고른다)
async function updateCategoryColor(id, colorKey) {
  if (!COLOR_HEX[colorKey]) return; // 팔레트에 없는 값은 무시
  const { error } = await sb
    .from("categories")
    .update({ color: colorKey })
    .eq("id", id);
  if (error) {
    alert("카테고리 색 변경 실패: " + error.message);
    return;
  }
  await loadCategories();
  await loadTodos(); // 할 일 태그의 점 색도 갱신
  await loadStats(); // 통계의 점 색도 갱신
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

    // 색 점 (누르면 색 변경 팝오버) — 사이드바가 카테고리 색의 "주인"
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "cat-dot cat-dot--btn";
    dot.style.background = categoryHex(c);
    dot.title = "색 변경";
    dot.setAttribute("aria-label", `${c.name} 색 변경`);
    dot.addEventListener("click", (e) => {
      e.stopPropagation(); // 모바일에서 사이드바가 닫히지 않도록
      openColorPopover(dot, categoryColorKey(c), (key) =>
        updateCategoryColor(c.id, key)
      );
    });

    // 카테고리 이름
    const name = document.createElement("span");
    name.className = "cat-name";
    name.textContent = c.name;

    // 수정 / 삭제 액션 (hover 시 노출)
    const actions = document.createElement("span");
    actions.className = "cat-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "cat-action";
    editBtn.title = "이름 수정";
    editBtn.setAttribute("aria-label", `${c.name} 이름 수정`);
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 모바일에서 사이드바가 닫히지 않도록
      const next = prompt("카테고리 이름 수정", c.name);
      if (next === null) return; // 취소
      const trimmed = next.trim();
      if (!trimmed || trimmed === c.name) return; // 빈 값/변경 없음
      renameCategory(c.id, trimmed);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "cat-action cat-action--danger";
    delBtn.title = "삭제";
    delBtn.setAttribute("aria-label", `${c.name} 삭제`);
    delBtn.textContent = "×";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // 이 카테고리에 속한 할 일 개수(메모리 캐시 기준)
      const linked = todos.filter((t) => t.category_id === c.id).length;
      const msg =
        linked > 0
          ? `"${c.name}" 카테고리를 삭제하면 이 카테고리의 할 일 ${linked}개도 함께 삭제됩니다.\n계속할까요?`
          : `"${c.name}" 카테고리를 삭제할까요?`;
      if (!confirm(msg)) return;
      deleteCategory(c.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(dot);
    li.appendChild(name);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

// 할 일 추가용 커스텀 카테고리 드롭다운.
// (네이티브 <select>는 항목 안에 색 점을 넣을 수 없어 직접 만든다.)
function renderCategorySelect() {
  const root = document.getElementById("todo-category");
  if (!root) return;
  root.innerHTML = "";
  root.classList.add("cat-select");

  const current =
    categoryById.get(Number(composerCategoryId)) ||
    categoryById.get(composerCategoryId) ||
    null;

  // 펼침 버튼: 현재 선택의 점 + 이름
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cat-select__btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    `<span class="cat-dot" style="background:${current ? categoryHex(current) : "transparent"}"></span>` +
    `<span class="cat-select__label">${current ? escapeHTML(current.name) : "카테고리 없음"}</span>` +
    `<span class="cat-select__caret" aria-hidden="true">▾</span>`;

  // 항목 목록
  const menu = document.createElement("ul");
  menu.className = "cat-select__menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  categories.forEach((c) => {
    const li = document.createElement("li");
    li.className = "cat-select__opt";
    li.setAttribute("role", "option");
    li.dataset.id = c.id;
    if (current && current.id === c.id) li.setAttribute("aria-selected", "true");
    li.innerHTML =
      `<span class="cat-dot" style="background:${categoryHex(c)}"></span>` +
      `<span>${escapeHTML(c.name)}</span>`;
    li.addEventListener("click", () => {
      composerCategoryId = String(c.id);
      renderCategorySelect(); // 닫고 새 선택을 반영
    });
    menu.appendChild(li);
  });

  if (categories.length === 0) {
    const li = document.createElement("li");
    li.className = "cat-select__opt cat-select__opt--empty";
    li.textContent = "카테고리를 먼저 추가하세요";
    menu.appendChild(li);
  }

  // 펼치기/접기
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers(); // 다른 팝오버/드롭다운은 닫는다
    menu.hidden = !willOpen;
    btn.setAttribute("aria-expanded", String(willOpen));
  });

  root.appendChild(btn);
  root.appendChild(menu);
}

// 커스텀 드롭다운 닫기
function closeCategorySelect(root) {
  const menu = root.querySelector(".cat-select__menu");
  const btn = root.querySelector(".cat-select__btn");
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute("aria-expanded", "false");
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
    const catHex = categoryHexById(t.category_id);
    let metaText =
      `<span class="cat">${dotHTML(catHex)}${escapeHTML(catName)}</span>` +
      ` 해야 하는 날짜: ${t.target_date}`;
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
    const catHex = categoryHexById(r.category_id);
    tr.innerHTML = `
      <td><span class="cat-cell">${dotHTML(catHex)}${escapeHTML(r.category_name)}</span></td>
      <td>${r.remaining_count}</td>
      <td>${r.done_count}</td>
      <td>${speed}</td>`;
    tbody.appendChild(tr);
  });
}

// ============================================================
//  색 변경 팝오버 (사이드바 색 점 클릭 시)
// ============================================================

// 열려 있는 팝오버/드롭다운을 모두 닫는다.
function closeAllPopovers() {
  document.querySelectorAll(".color-popover").forEach((el) => el.remove());
  const sel = document.getElementById("todo-category");
  if (sel) closeCategorySelect(sel);
}

// anchorEl(색 점) 아래에 팔레트 스와치를 띄운다. onPick(key) 로 선택을 알린다.
function openColorPopover(anchorEl, currentKey, onPick) {
  const existing = document.querySelector(".color-popover");
  const sameAnchor = existing && existing._anchor === anchorEl;
  closeAllPopovers();
  if (sameAnchor) return; // 같은 점을 다시 누르면 닫기만 (토글)

  const pop = document.createElement("div");
  pop.className = "color-popover";
  pop.setAttribute("role", "menu");
  pop._anchor = anchorEl;

  CATEGORY_COLORS.forEach((c) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "color-swatch" + (c.key === currentKey ? " is-selected" : "");
    sw.style.background = c.hex;
    sw.title = c.label;
    sw.setAttribute("aria-label", c.label);
    sw.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllPopovers();
      onPick(c.key);
    });
    pop.appendChild(sw);
  });

  document.body.appendChild(pop);

  // 위치: 앵커 바로 아래 왼쪽 정렬 (화면 밖으로 나가면 보정)
  const r = anchorEl.getBoundingClientRect();
  let left = r.left;
  let top = r.bottom + 6;
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (left < 8) left = 8;
  if (top + ph > window.innerHeight - 8) top = r.top - ph - 6; // 위로 뒤집기
  pop.style.left = left + "px";
  pop.style.top = top + "px";
}

// 바깥을 누르거나 ESC 를 누르면 팝오버/드롭다운을 닫는다.
document.addEventListener("click", (e) => {
  if (e.target.closest(".color-popover")) return;
  if (e.target.closest(".cat-select")) return;
  if (e.target.closest(".cat-dot--btn")) return;
  closeAllPopovers();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllPopovers();
});

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
  const categoryId = composerCategoryId; // 커스텀 드롭다운이 들고 있는 값
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
