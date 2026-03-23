import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured


TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


def _parse_env_line(raw_line):
    line = raw_line.strip()
    if not line or line.startswith("#"):
        return None, None

    if line.startswith("export "):
        line = line[7:].strip()

    if "=" not in line:
        return None, None

    key, value = line.split("=", 1)
    key = key.strip()
    if not key:
        return None, None

    value = value.strip()
    if value and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]

    return key, value


def load_local_env():
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        key, value = _parse_env_line(raw_line)
        if key:
            os.environ.setdefault(key, value)


def env_str(name: str, default=None, *, required: bool = False, allow_blank: bool = False) -> str:
    value = os.getenv(name)
    if value is None:
        if required:
            raise ImproperlyConfigured(f"Environment variable {name} is required.")
        return default

    value = value.strip()
    if not value and not allow_blank:
        if required:
            raise ImproperlyConfigured(f"Environment variable {name} cannot be blank.")
        return default

    return value


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    normalized = value.strip().lower()
    if normalized in TRUE_VALUES:
        return True
    if normalized in FALSE_VALUES:
        return False

    raise ImproperlyConfigured(
        f"Environment variable {name} must be one of: {', '.join(sorted(TRUE_VALUES | FALSE_VALUES))}."
    )


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return int(value.strip())
    except (TypeError, ValueError) as exc:
        raise ImproperlyConfigured(f"Environment variable {name} must be an integer.") from exc


def env_list(name: str, default=None):
    value = os.getenv(name)
    if value is None:
        return list(default or [])

    return [item.strip() for item in value.split(",") if item.strip()]
