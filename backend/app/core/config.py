import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

    APP_NAME: str = 'CarTrust AI'
    APP_ENV: str = 'development'
    API_V1_PREFIX: str = '/api/v1'
    SECRET_KEY: str = 'cartrust-super-secret-key-change-in-production-min32chars'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = 'sqlite:///./cartrust.db'
    REDIS_URL: str = 'redis://localhost:6379/0'

    SMTP_HOST: str = 'localhost'
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: str = 'no-reply@cartrust.demo'
    EMAILS_FROM_NAME: str = 'CarTrust AI'
    FRONTEND_URL: str = 'http://localhost:5173'

    UPLOAD_DIR: str = './uploads'
    MAX_UPLOAD_SIZE_MB: int = 10

    MOCK_PROVIDER_URL: str = 'http://localhost:8001'

    USE_MOCK_LLM: bool = True
    OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT_NAME: str = 'gpt-4o-mini'
    AZURE_OPENAI_API_VERSION: str = '2024-02-15-preview'

    ALLOWED_ORIGINS: str = 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173'
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',') if origin.strip()]

settings = Settings()
