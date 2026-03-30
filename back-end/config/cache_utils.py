from django.core.cache import cache


CATALOG_CACHE_VERSION_KEY = "catalog_cache_version"


def get_catalog_cache_version() -> int:
    return int(cache.get(CATALOG_CACHE_VERSION_KEY, 1))


def bump_catalog_cache_version() -> int:
    version = get_catalog_cache_version() + 1
    cache.set(CATALOG_CACHE_VERSION_KEY, version, None)
    return version
