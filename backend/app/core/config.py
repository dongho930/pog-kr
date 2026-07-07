from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    앱 전역 설정.
    .env 파일 또는 실제 환경변수에서 값을 읽어온다.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://pog:pog_password@localhost:5432/pogdb"

    RIOT_API_KEY: str = ""
    RIOT_PLATFORM_REGION: str = "kr"     # kr, jp1, na1 ...
    RIOT_ACCOUNT_REGION: str = "asia"    # asia, americas, europe

    FRONTEND_ORIGIN: str = "http://localhost:3000"
    # Vercel Preview 배포처럼 매번 URL이 바뀌는 경우를 위한 정규식 (예:
    # "https://pog-kr-.*\\.vercel\\.app"). 비워두면 FRONTEND_ORIGIN만 허용.
    FRONTEND_ORIGIN_REGEX: str = ""

    @property
    def frontend_origins(self) -> list[str]:
        """쉼표로 여러 개 지정 가능 (예: "https://pog.kr,https://www.pog.kr")."""
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]

    # DB 커넥션 풀 설정 — Windows/로컬 환경에서 asyncpg pool 초기화 문제를
    # 겪었던 경험이 있다면 이 값들을 명시적으로 관리하는 것이 디버깅에 유리하다.
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30


settings = Settings()
