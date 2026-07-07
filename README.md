# POG.KR

리그 오브 레전드(한국 서버 기준) 전적 검색 웹사이트. Next.js(App Router) + FastAPI + PostgreSQL.

## 포함 기능
- 소환사 전적 검색 (Riot ID: 게임명#태그)
- 매치 히스토리
- 실시간 전적 (스펙테이터 API)
- 챔피언 통계 (티어 / 승률 / 픽률 / 밴률)
- 매치별 빌드·스킬 타임라인 (아이템 구매 순서, 스킬 빌드 순서, 룬)

## 이 스캐폴드가 참고한 것 / 참고하지 않은 것
- **백엔드 구조**: op.gg의 실제 소스코드는 비공개라 접근할 수 없습니다. 대신 공개된
  FastAPI 모범 사례(`conf/src/apps/crud/endpoints/models/schemas` 형태의 도메인 분리)와
  op.gg 클론코딩 오픈소스들에서 반복적으로 나타나는 패턴(도메인별 라우터 분리, DB 캐시 +
  외부 API 갱신, URL 쿼리 기반 필터)을 반영했습니다.
- **디자인**: poro.gg 등 실제 서비스의 색상값·아이콘·레이아웃 자산을 그대로 복제하지
  않았습니다. "다크 테마 + 카드형 전적 사이트"라는 장르의 UX 관례(검색 히어로, 소환사
  카드, 탭 네비게이션, 티어리스트 테이블)만 따르고, 색상·타이포그래피·시그니처 요소(최근
  폼 점 그래프 `FormStreak`)는 pog.kr만의 오리지널로 새로 설계했습니다.

## DB 스키마가 바뀐 경우 (마이그레이션 도구 없이 수동 반영)

Alembic 같은 마이그레이션 도구가 없어서, 모델에 컬럼을 추가해도 기존 DB
테이블은 자동으로 갱신되지 않습니다. 아래처럼 `UndefinedColumnError`가 뜨면:

```
asyncpg.exceptions.UndefinedColumnError: column "double_kills" of relation
"match_participants" does not exist
```

`backend` 폴더에서 가상환경을 활성화한 뒤 아래 스크립트를 한 번 실행하세요
(기존 매치 데이터는 지워지지 않습니다):

```bash
cd backend
python scripts/add_multikill_columns.py
```

그 다음 백엔드를 재시작하면 됩니다.

### 새 컬럼을 추가했는데 예전 데이터에는 값이 채워지지 않는 경우

컬럼 자체는 추가됐어도, 이미 캐시된 매치는 그 컬럼이 생기기 전에 저장된
것이라 기본값(보통 0)만 들어있습니다. `match_sync.py`는 "이미 DB에 있는
매치는 건드리지 않는" 방식이라 자동으로 다시 채워지지 않습니다. 캐시를
지우고 다시 받아오세요 (기존 데이터가 지워지지만 다음 조회 시 Riot API에서
자동으로 다시 채워집니다):

```bash
cd backend
python scripts/clear_matches.py
```

## 실행 방법 (Windows, 한 번에 실행)

- **Docker 없이 로컬로 실행**: `run-local.bat` 더블클릭
  - `.env` 파일 자동 생성(없을 때만), 백엔드 venv/의존성 설치, 프론트엔드 npm install을
    자동으로 처리한 뒤, 백엔드와 프론트엔드를 각각 새 콘솔 창에서 띄웁니다.
  - PostgreSQL은 미리 로컬에 설치·실행되어 있어야 하며, `backend\.env`의
    `DATABASE_URL`이 실제 접속 정보와 일치해야 합니다.
- **Docker Compose로 실행**: `run-docker.bat` 더블클릭
  - Docker Desktop이 설치되어 있어야 하며, PostgreSQL 컨테이너까지 한 번에 뜹니다.

두 배치 파일 모두 최초 실행 시 `RIOT_API_KEY`를 채워야 하므로, 처음 한 번은
`backend\.env` 파일을 열어 값을 입력한 뒤 다시 실행해주세요.

## 실행 방법 (수동)

### 1) Riot API 키 발급
https://developer.riotgames.com 에서 발급 (개발키는 24시간마다 재발급 필요)

### 2) 환경변수 설정
```bash
cp backend/.env.example backend/.env      # RIOT_API_KEY, DATABASE_URL 채우기
cp frontend/.env.example frontend/.env.local
```

### 3) Docker Compose로 한 번에 실행
```bash
docker compose up --build
```
- 프론트엔드: http://localhost:3000
- 백엔드 API 문서(Swagger): http://localhost:8000/docs

### 4) 로컬 개발 (Docker 없이)
```bash
# 백엔드
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 프론트엔드 (새 터미널)
cd frontend
npm install
npm run dev
```

## asyncpg pool 관련 참고
`app/core/database.py`에서 pool 설정을 명시적으로 관리하고, `app/main.py`의
`lifespan`에서 앱 시작 시 `init_db()`를 호출해 pool을 워밍업합니다. 이전에 Windows
환경에서 겪었던 asyncpg pool 초기화 문제는 대부분 (1) 이벤트루프 정책 충돌, (2) DB가
아직 기동되지 않은 상태에서 앱이 먼저 커넥션을 시도하는 타이밍 문제였을 가능성이
높습니다. `pool_pre_ping=True`로 죽은 커넥션은 자동 감지하도록 해두었습니다.

## 배포 (GitHub + Supabase + Render + Vercel)

무료/저비용 조합으로 실제 웹에 배포하는 방법입니다. 구조는 이래요:

```
GitHub  ──(코드 저장)──┐
                       ├─ Render(백엔드: FastAPI)  ──┐
                       └─ Vercel(프론트엔드: Next.js) ┴─ Supabase(PostgreSQL)
```

### 0) 준비물
- GitHub 계정, Supabase 계정, Render 계정, Vercel 계정 (전부 무료 티어로 시작 가능)
- Riot API 키 (Development Key도 되지만 24시간마다 갱신해야 해서, 배포용으로는 Personal/Production Key를 권장)

### 1) GitHub에 코드 올리기
```bash
cd pog-kr
git init
git add .
git commit -m "initial commit"
gh repo create pog-kr --private --source=. --push
# gh CLI가 없다면: GitHub 웹에서 새 저장소 만든 뒤
# git remote add origin https://github.com/<아이디>/pog-kr.git
# git push -u origin main
```
`.gitignore`에 `.env`, `node_modules`, `.venv` 등이 이미 포함되어 있어서 비밀값이나
불필요한 파일은 안 올라가요.

### 2) Supabase — PostgreSQL 데이터베이스
1. https://supabase.com 에서 새 프로젝트 생성 (리전은 가까운 곳, 예: Northeast Asia)
2. 프로젝트 대시보드 → **Project Settings → Database → Connection string** 에서
   **URI** 값을 복사
   - 형식: `postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres`
   - **"Session pooler"가 아니라 "Direct connection"** 값을 쓰는 걸 권장해요. Render는
     서버리스가 아니라 계속 켜져있는 서버라서 direct connection으로 충분하고,
     PgBouncer 트랜잭션 풀러 특유의 prepared statement 이슈를 피할 수 있어요.
   - 그대로 쓰면 `postgresql://`로 시작하는데, 우리 앱은 asyncpg 드라이버를 쓰므로
     **`postgresql+asyncpg://`로 바꿔야 합니다.**
3. 최종 형태 예시:
   ```
   postgresql+asyncpg://postgres.abcdefgh:실제비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
   ```
   이 값을 어딘가에 잘 저장해두세요 (Render에 넣을 값이에요).

### 3) Render — FastAPI 백엔드
1. https://render.com → **New → Web Service** → GitHub 저장소(pog-kr) 연결
2. 저장소 루트에 있는 `render.yaml`을 인식하면 **"Apply"** 로 한 번에 설정되고,
   수동으로 만든다면 아래처럼 입력하세요:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Environment** 탭에서 환경변수 입력:
   | 키 | 값 |
   |---|---|
   | `DATABASE_URL` | 2번에서 만든 Supabase 연결 문자열 (`postgresql+asyncpg://...`) |
   | `RIOT_API_KEY` | Riot 개발자 포털에서 발급받은 키 |
   | `RIOT_PLATFORM_REGION` | `kr` |
   | `RIOT_ACCOUNT_REGION` | `asia` |
   | `FRONTEND_ORIGIN` | 일단 아무 값(예: `http://localhost:3000`)으로 두고 5번에서 실제 값으로 교체 |
   | `FRONTEND_ORIGIN_REGEX` | `https://pog-kr.*\.vercel\.app` (Vercel 프리뷰 배포 허용용, 프로젝트명에 맞게 수정) |
4. 배포되면 `https://pog-kr-backend.onrender.com` 같은 URL이 생겨요. **이 URL을
   기억해두세요** (프론트엔드에서 씁니다). `/health`로 접속해 `{"status":"ok"}`가
   뜨는지 확인하세요.
   - Render 무료 플랜은 트래픽이 없으면 슬립 모드로 들어가서, 첫 요청이 10~50초 정도
     걸릴 수 있어요. 유료 플랜으로 올리면 상시 구동됩니다.

### 4) Vercel — Next.js 프론트엔드
1. https://vercel.com → **Add New → Project** → GitHub 저장소(pog-kr) 연결
2. **Root Directory를 `frontend`로 설정** (모노레포라 이 설정이 꼭 필요해요)
3. Framework Preset은 Next.js로 자동 인식됩니다
4. **Environment Variables**에 추가:
   | 키 | 값 |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://pog-kr-backend.onrender.com/api` (3번에서 받은 Render URL + `/api`) |
5. Deploy 클릭 → 끝나면 `https://pog-kr.vercel.app` 같은 URL이 생겨요

### 5) 서로 연결하기 (CORS 마무리)
Render 백엔드로 돌아가서 환경변수를 실제 값으로 업데이트합니다:
- `FRONTEND_ORIGIN` → `https://pog-kr.vercel.app` (4번에서 받은 실제 Vercel URL)

저장하면 Render가 자동으로 재배포됩니다. 이 과정이 필요한 이유는, 백엔드가
"이 도메인에서 오는 요청만 허용한다"는 CORS 설정을 실제 프론트엔드 주소로
알아야 하기 때문이에요.

### 6) 첫 배포 후 확인할 것
- Render가 처음 뜰 때 `init_db()`가 Supabase에 테이블을 자동으로 만들어줘요
  (별도 마이그레이션 불필요, `create_all()` 방식이라서요)
- Vercel 배포 주소로 접속해서 소환사 검색이 실제로 동작하는지 확인
- 이후 모델에 컬럼을 추가하는 등 스키마가 바뀌면, **로컬에서 `DATABASE_URL`을
  Supabase 값으로 잠깐 바꿔서** 해당 마이그레이션 스크립트를 한 번 실행하면 돼요:
  ```bash
  cd backend
  # .env의 DATABASE_URL을 Supabase 값으로 임시 교체 후
  python scripts/add_xxx_columns.py
  ```

### 커스텀 도메인을 쓰고 싶다면
- Vercel 프로젝트 → Settings → Domains 에서 도메인 연결
- 도메인이 바뀌면 Render의 `FRONTEND_ORIGIN`도 새 도메인으로 다시 업데이트해야
  CORS가 안 막혀요

## 다음 단계로 하면 좋은 것
1. Riot API 실제 연동 후 매치 데이터를 주기적으로 수집하는 배치 워커 추가
   (매 요청마다 Riot API를 직접 호출하면 rate limit에 바로 걸립니다)
2. `champion_stats` 테이블을 채우는 집계 배치 (패치별 승률/픽률/밴률 계산)
3. Alembic으로 마이그레이션 관리 (지금은 `create_all`로 간단히 처리)
4. 챔피언/아이템 아이콘 — Riot Data Dragon(CDN)에서 정적으로 가져와 사용 가능
