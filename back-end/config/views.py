from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils._os import safe_join


def cached_media_serve(request, path):
    if settings.USE_S3:
        raise Http404

    full_path = Path(safe_join(str(settings.MEDIA_ROOT), path))
    if not full_path.exists() or not full_path.is_file():
        raise Http404

    response = FileResponse(full_path.open('rb'))
    response['Cache-Control'] = f"public, max-age={settings.MEDIA_CACHE_TIMEOUT}, immutable"
    return response
