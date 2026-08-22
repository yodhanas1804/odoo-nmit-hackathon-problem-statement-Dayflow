from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dayflow HRMS"
    environment: str = "development"
    frontend_origin: str = "http://localhost:5173"
    database_url: str = "postgresql://dayflow:dayflow@localhost:5432/dayflow"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
