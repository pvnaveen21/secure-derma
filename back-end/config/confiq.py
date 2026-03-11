import os
from urllib.parse import parse_qs, unquote, urlparse


DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    query = parse_qs(parsed.query)
    engine_map = {
        "postgres": "django.db.backends.postgresql",
        "postgresql": "django.db.backends.postgresql",
        "pgsql": "django.db.backends.postgresql",
    }
    DATABASES = {
        "default": {
            "ENGINE": engine_map.get(parsed.scheme, "django.db.backends.postgresql"),
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": parsed.port or "",
            "CONN_MAX_AGE": 600,
        }
    }
    if query.get("sslmode", [""])[0]:
        DATABASES["default"]["OPTIONS"] = {"sslmode": query["sslmode"][0]}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "securederma"),
            "USER": os.getenv("DB_USER", "securederma_user"),
            "PASSWORD": os.getenv("DB_PASSWORD", "securederma_pass"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5433"),
        }
    }
