import os
from pathlib import Path


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
