from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "AI Assessment MVP"

    # OpenAI
    OPENAI_API_KEY: str = ""
    MAIN_MODEL: str = "gpt-4o-mini"        # generation, scoring, feedback
    DECISION_MODEL: str = "gpt-4.1-nano"   # routing, validation, planning

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # JWT / Auth
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    JWT_EXPIRE_MINUTES: int = Field(1440, env="JWT_EXPIRE_MINUTES")
    DEBUG: bool = Field(False, env="DEBUG")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "forbid"  # keeps extra fields forbidden

settings = Settings()