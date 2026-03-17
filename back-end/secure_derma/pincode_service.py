import csv
import math
import os
from functools import lru_cache
from pathlib import Path

import requests
from django.core.cache import cache


class PincodeLookupError(Exception):
    pass


def _normalize_pincode(raw_value):
    pincode = "".join(ch for ch in str(raw_value or "") if ch.isdigit())
    if len(pincode) != 6 or pincode.startswith("0"):
        return ""
    return pincode


def _safe_float(value):
    try:
        if value in ("", None):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _provider_timeout():
    try:
        timeout = int(os.getenv("PINCODE_PROVIDER_TIMEOUT_SECONDS", "8"))
    except ValueError:
        timeout = 8
    return max(timeout, 3)


def _cache_ttl_seconds():
    try:
        hours = int(os.getenv("PINCODE_CACHE_TTL_HOURS", "12"))
    except ValueError:
        hours = 12
    return max(hours, 1) * 3600


def _cache_key(origin_pincode, destination_pincode):
    return f"pincode_route:{origin_pincode}:{destination_pincode}"


def _warehouse_coordinates():
    lat = _safe_float(os.getenv("WAREHOUSE_LATITUDE"))
    lng = _safe_float(os.getenv("WAREHOUSE_LONGITUDE"))
    if lat is None or lng is None:
        return None, None
    return lat, lng


def _haversine_km(origin_lat, origin_lng, destination_lat, destination_lng):
    radius_km = 6371.0
    d_lat = math.radians(destination_lat - origin_lat)
    d_lng = math.radians(destination_lng - origin_lng)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(origin_lat))
        * math.cos(math.radians(destination_lat))
        * math.sin(d_lng / 2) ** 2
    )
    return round(radius_km * 2 * math.asin(math.sqrt(a)), 2)


def _estimate_eta(distance_km):
    if distance_km is None:
        return None, None
    if distance_km <= 150:
        return 1, 2
    if distance_km <= 500:
        return 2, 3
    if distance_km <= 1200:
        return 3, 5
    return 4, 7


def _lookup_india_post(pincode):
    try:
        response = requests.get(
            f"https://api.postalpincode.in/pincode/{pincode}",
            timeout=_provider_timeout(),
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise PincodeLookupError(f"India Post lookup failed: {exc}") from exc

    payload = response.json()
    if not isinstance(payload, list) or not payload:
        raise PincodeLookupError("Unexpected pincode lookup response.")

    result = payload[0] or {}
    offices = result.get("PostOffice") or []
    if result.get("Status") != "Success" or not offices:
        return None

    office = offices[0] or {}
    return {
        "location_name": str(office.get("Name") or "").strip(),
        "city": str(office.get("District") or office.get("Division") or "").strip(),
        "state": str(office.get("State") or "").strip(),
        "state_district": str(office.get("District") or office.get("Division") or "").strip(),
        "country": str(office.get("Country") or "India").strip(),
        "provider_name": "india-post",
        "raw_response": result,
    }


def _directory_file_candidates():
    configured_path = os.getenv("PINCODE_DIRECTORY_CSV", "").strip()
    default_path = Path(__file__).resolve().parent / "data" / "india_pincodes.csv"

    candidates = []
    if configured_path:
        candidates.append(Path(configured_path).expanduser())
    candidates.append(default_path)
    return candidates


def _resolve_directory_file():
    for candidate in _directory_file_candidates():
        if candidate.is_file():
            return candidate
    return None


def _get_row_value(row, *keys):
    lowered_row = {str(key).strip().lower(): value for key, value in row.items()}
    for key in keys:
        value = lowered_row.get(key.lower())
        if value not in (None, ""):
            return str(value).strip()
    return ""


@lru_cache(maxsize=4)
def _load_directory_index(csv_path, modified_time):
    del modified_time
    index = {}
    with open(csv_path, newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            pincode = _normalize_pincode(
                _get_row_value(row, "pincode", "pin code", "office_pincode", "officenamepincode")
            )
            if not pincode:
                continue

            office_name = _get_row_value(
                row, "office_name", "office name", "officename", "name", "divisionname"
            )
            district = _get_row_value(
                row, "district", "districtname", "division", "divisionname", "city"
            )
            state = _get_row_value(row, "state", "statename", "state name")
            country = _get_row_value(row, "country", "countryname") or "India"

            index.setdefault(pincode, {
                "location_name": office_name or district,
                "city": district,
                "state": state,
                "state_district": district,
                "country": country,
                "provider_name": "local-pincode-directory",
                "raw_response": row,
            })
    return index


def _lookup_local_directory(pincode):
    directory_file = _resolve_directory_file()
    if not directory_file:
        return None

    try:
        directory_index = _load_directory_index(
            str(directory_file),
            directory_file.stat().st_mtime_ns,
        )
    except OSError:
        return None

    return directory_index.get(pincode)


def _get_local_directory_suggestions(pincode, limit=3):
    directory_file = _resolve_directory_file()
    if not directory_file:
        return []

    try:
        directory_index = _load_directory_index(
            str(directory_file),
            directory_file.stat().st_mtime_ns,
        )
    except OSError:
        return []

    same_prefix_candidates = [
        (candidate_pincode, payload)
        for candidate_pincode, payload in directory_index.items()
        if candidate_pincode.startswith(pincode[:4])
    ]

    if not same_prefix_candidates:
        same_prefix_candidates = [
            (candidate_pincode, payload)
            for candidate_pincode, payload in directory_index.items()
            if candidate_pincode.startswith(pincode[:3])
        ]

    ranked = sorted(
        same_prefix_candidates,
        key=lambda item: (
            abs(int(item[0]) - int(pincode)),
            item[0],
        ),
    )[:limit]

    return [
        {
            "pincode": candidate_pincode,
            "location_name": payload.get("location_name", ""),
            "city": payload.get("city", ""),
            "state": payload.get("state", ""),
        }
        for candidate_pincode, payload in ranked
    ]


def _geocode_pincode(pincode):
    requests_to_try = [
        {
            "postalcode": pincode,
            "country": "India",
            "countrycodes": "in",
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": 1,
        },
        {
            "q": f"{pincode}, India",
            "countrycodes": "in",
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": 1,
        },
    ]

    last_failure = None

    for params in requests_to_try:
        try:
            response = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers={
                    "User-Agent": os.getenv(
                        "PINCODE_GEOCODER_USER_AGENT",
                        "secure-derma-pincode-checker/1.0",
                    )
                },
                timeout=_provider_timeout(),
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            last_failure = {
                "reason": "geocode_lookup_failed",
                "error": str(exc),
                "params": params,
            }
            continue

        payload = response.json()
        if isinstance(payload, list) and payload:
            first_result = payload[0] or {}
            return (
                _safe_float(first_result.get("lat")),
                _safe_float(first_result.get("lon")),
                first_result,
            )

        last_failure = {
            "reason": "geocode_not_found",
            "payload": payload,
            "params": params,
        }

    return None, None, last_failure or {
        "reason": "geocode_not_found",
        "payload": [],
    }


def _build_geocode_location_payload(geocode_payload):
    if not isinstance(geocode_payload, dict):
        return None

    address = geocode_payload.get("address") or {}
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("county")
        or address.get("state_district")
        or ""
    )
    state = address.get("state") or address.get("region") or ""
    state_district = address.get("state_district") or address.get("county") or ""
    location_name = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("city_district")
        or city
        or geocode_payload.get("display_name")
        or ""
    )

    if not city and not state:
        return None

    return {
        "location_name": str(location_name).strip(),
        "city": str(city).strip(),
        "state": str(state).strip(),
        "state_district": str(state_district).strip(),
        "country": str(address.get("country") or "India").strip(),
        "provider_name": "nominatim",
        "raw_response": geocode_payload,
    }


def _reverse_geocode_coordinates(latitude, longitude):
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": latitude,
                "lon": longitude,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 18,
            },
            headers={
                "User-Agent": os.getenv(
                    "PINCODE_GEOCODER_USER_AGENT",
                    "secure-derma-pincode-checker/1.0",
                )
            },
            timeout=_provider_timeout(),
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise PincodeLookupError(f"Reverse geocode failed: {exc}") from exc

    payload = response.json() or {}
    address = payload.get("address") or {}
    pincode = _normalize_pincode(address.get("postcode"))
    if not pincode:
        raise PincodeLookupError("Unable to determine pincode from current location.")

    return {
        "pincode": pincode,
        "payload": payload,
    }


def check_pincode_serviceability(destination_pincode):
    warehouse_pincode = _normalize_pincode(os.getenv("WAREHOUSE_PINCODE"))
    destination_pincode = _normalize_pincode(destination_pincode)
    if not destination_pincode:
        raise ValueError("Enter a valid 6-digit pincode.")
    if not warehouse_pincode:
        raise ValueError("Warehouse pincode is not configured.")

    local_directory_result = _lookup_local_directory(destination_pincode)

    cached_route = cache.get(_cache_key(warehouse_pincode, destination_pincode))
    if cached_route and not local_directory_result:
        return {
            **cached_route,
            "cached": True,
        }

    india_post_result = None
    india_post_error = None
    if not local_directory_result:
        try:
            india_post_result = _lookup_india_post(destination_pincode)
        except PincodeLookupError as exc:
            india_post_error = str(exc)

    warehouse_lat, warehouse_lng = _warehouse_coordinates()
    destination_lat, destination_lng, geocode_payload = _geocode_pincode(destination_pincode)
    geocode_location_result = _build_geocode_location_payload(geocode_payload)

    location_result = local_directory_result or india_post_result or geocode_location_result
    if not location_result:
        if india_post_error and geocode_payload.get("reason") == "geocode_lookup_failed":
            raise PincodeLookupError(
                f"{india_post_error}; geocode lookup failed: {geocode_payload.get('error', 'unknown error')}"
            )

        route = {
            "origin_pincode": warehouse_pincode,
            "destination_pincode": destination_pincode,
            "pincode": destination_pincode,
            "serviceable": False,
            "suggested_pincodes": _get_local_directory_suggestions(destination_pincode),
            "location_name": "",
            "city": "",
            "state": "",
            "state_district": "",
            "distance_km": None,
            "eta_min_days": None,
            "eta_max_days": None,
            "shipping_fee": 0,
            "provider_name": "india-post+nominatim",
            "source": "live",
            "raw_response": {
                "reason": "pincode_not_found",
                "india_post_error": india_post_error,
                "geocode": geocode_payload,
            },
        }
        cache.set(_cache_key(warehouse_pincode, destination_pincode), route, timeout=_cache_ttl_seconds())
        return {
            **route,
            "cached": False,
        }

    distance_km = None
    if None not in (warehouse_lat, warehouse_lng, destination_lat, destination_lng):
        distance_km = _haversine_km(warehouse_lat, warehouse_lng, destination_lat, destination_lng)

    eta_min_days, eta_max_days = _estimate_eta(distance_km)

    route = {
        "origin_pincode": warehouse_pincode,
        "destination_pincode": destination_pincode,
        "pincode": destination_pincode,
        "serviceable": True,
        "location_name": location_result["location_name"],
        "city": location_result["city"],
        "state": location_result["state"],
        "state_district": location_result.get("state_district", ""),
        "distance_km": distance_km,
        "eta_min_days": eta_min_days,
        "eta_max_days": eta_max_days,
        "shipping_fee": 0,
        "provider_name": location_result["provider_name"],
        "source": "live",
        "raw_response": {
            "india_post": india_post_result["raw_response"] if india_post_result else None,
            "india_post_error": india_post_error,
            "geocode": geocode_payload,
        },
    }
    cache.set(_cache_key(warehouse_pincode, destination_pincode), route, timeout=_cache_ttl_seconds())
    return {
        **route,
        "cached": False,
    }


def check_pincode_serviceability_for_coordinates(latitude, longitude):
    location = _reverse_geocode_coordinates(latitude, longitude)
    route = check_pincode_serviceability(location["pincode"])
    return {
        **route,
        "resolved_coordinates": {
            "latitude": latitude,
            "longitude": longitude,
        },
        "reverse_geocode": location["payload"],
    }
