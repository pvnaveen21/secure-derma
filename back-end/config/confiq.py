from urllib.parse import parse_qs, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

from .env import env_bool, env_int, env_str


DATABASE_URL = env_str("DATABASE_URL", default="")
DEBUG = env_bool("DJANGO_DEBUG", default=True)

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
            "CONN_MAX_AGE": env_int("DB_CONN_MAX_AGE", 600),
        }
    }
    if query.get("sslmode", [""])[0]:
        DATABASES["default"]["OPTIONS"] = {"sslmode": query["sslmode"][0]}
else:
    db_name = env_str("DB_NAME", default="securederma" if DEBUG else None)
    db_user = env_str("DB_USER", default="securederma_user" if DEBUG else None)
    db_password = env_str("DB_PASSWORD", default="securederma_pass" if DEBUG else None)
    db_host = env_str("DB_HOST", default="localhost" if DEBUG else None)
    db_port = env_str("DB_PORT", default="5433" if DEBUG else None)

    missing = [
        name
        for name, value in {
            "DB_NAME": db_name,
            "DB_USER": db_user,
            "DB_PASSWORD": db_password,
            "DB_HOST": db_host,
            "DB_PORT": db_port,
        }.items()
        if value in (None, "")
    ]
    if missing:
        raise ImproperlyConfigured(
            "Database configuration is incomplete. Set DATABASE_URL or all of: " + ", ".join(missing)
        )

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": db_user,
            "PASSWORD": db_password,
            "HOST": db_host,
            "PORT": db_port,
            "CONN_MAX_AGE": env_int("DB_CONN_MAX_AGE", 600),
        }
    }
