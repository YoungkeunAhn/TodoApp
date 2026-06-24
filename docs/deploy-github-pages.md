# GitHub Pages 배포 가이드 (초보자용)

> [← 메인 문서로 돌아가기](./README.md)
>
> 완성한 Todo 앱(`index.html`, `style.css`, `config.js`, `app.js`)을
> GitHub에 올리고, GitHub Pages로 인터넷에 무료로 배포한다.

---

## 0. 먼저 보안 점검 (중요!)

**Q. Supabase의 anon key는 GitHub에 올라가도 괜찮나요?**
- ✅ **괜찮습니다.** `anon public` 키는 이름 그대로 **공개되어도 되는 키**입니다.
  브라우저(프론트엔드)에서 쓰라고 만든 키이고, 실제 데이터 보호는
  **RLS(Row Level Security) 정책**이 담당합니다.
  (그래서 `schema.sql`에서 RLS를 켜고 정책을 만든 것입니다.)

**Q. 절대 올리면 안 되는 것은?**
- ❌ `service_role` 키 — 모든 권한을 가진 **비밀 키**. 프론트/깃허브에 절대 금지.

**점검 결과(현재 프로젝트):**
- `config.js`에는 자리표시자(또는 anon key)만 있고, `service_role` 키는 없음. ✅
- 코드 어디에도 `eyJ...` 형태의 service_role 토큰이 들어 있지 않음. ✅

> 💡 참고: 실수로 키를 올리고 싶지 않다면 `config.js`를 `.gitignore`에 넣고,
> 대신 `config.example.js`만 올리는 방법도 있습니다. (anon key는 공개돼도 되므로 필수는 아님)

---

## 1. Git 시작 ~ 첫 커밋

> 프로젝트 폴더 안에서 터미널을 열고 순서대로 입력합니다.

```bash
git init                       # 이 폴더를 git 저장소로 만든다
git add .                      # 모든 파일을 커밋 대상으로 올린다(스테이징)
git commit -m "첫 커밋: Todo 앱"  # 현재 상태를 하나의 버전으로 저장한다
git log                        # 방금 만든 커밋이 잘 기록됐는지 확인한다 (q 눌러서 빠져나옴)
```

## 2. GitHub에 저장소 만들고 push

1. GitHub 접속 → 오른쪽 위 **+** → **New repository**
2. Repository name 입력(예: `my-todo`) → **Create repository**
   - ⚠️ README/.gitignore 등은 **추가하지 않은 빈 저장소**로 만드는 게 편합니다.
3. 만들어진 저장소 주소(`https://github.com/내아이디/my-todo.git`)를 복사한 뒤:

```bash
git remote add origin https://github.com/내아이디/my-todo.git
                               # 내 컴퓨터 저장소를 GitHub 저장소와 연결한다
git branch -M main             # 현재 브랜치 이름을 main 으로 정한다
git push -u origin main        # 코드를 GitHub(main 브랜치)으로 처음 올린다
```

## 3. GitHub Pages로 배포

1. GitHub 저장소 페이지 → 상단 **Settings**
2. 왼쪽 메뉴 **Pages**
3. **Build and deployment** → Source: **Deploy from a branch**
4. **Branch**: `main` 선택, 폴더는 **/ (root)** 선택 → **Save**
5. 잠시(1~2분) 기다리면 같은 Pages 화면 위쪽에 배포 주소가 나타납니다:
   ```
   https://내아이디.github.io/my-todo/
   ```
6. 그 주소로 접속해 앱이 동작하는지 확인합니다.

> ⚠️ 메인 화면 파일 이름은 반드시 **`index.html`** 이어야 자동으로 열립니다. (현재 OK)

## 4. 수정 후 다시 배포

코드를 고친 다음에는 아래 3줄만 다시 실행하면 GitHub Pages에 자동 반영됩니다.

```bash
git add .                      # 바뀐 파일을 다시 올린다
git commit -m "수정: 내용 설명"  # 바뀐 내용을 새 버전으로 저장한다
git push                       # GitHub에 올린다 → Pages가 자동으로 다시 배포
```

> 반영까지 보통 1~2분 걸립니다. 브라우저 새로고침(Ctrl+F5)으로 확인하세요.

---

## 배포 체크리스트

- [ ] `git push` 후 GitHub 저장소에 파일들이 보인다.
- [ ] Settings → Pages에서 배포 주소가 만들어졌다.
- [ ] 배포 주소로 접속하면 앱이 뜬다.
- [ ] 배포된 앱에서 카테고리/할 일 추가·완료·삭제가 동작한다. (Supabase 연결 확인)
- [ ] `service_role` 키가 올라가 있지 않다.
