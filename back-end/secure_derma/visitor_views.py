from datetime import date, timedelta
from urllib.parse import urlsplit

from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from secure_derma.models import SecureDermaVisit, VisitDeviceType


def _add_months(value: date, months: int) -> date:
    month_index = (value.month - 1) + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _normalize_path(raw_path) -> str:
    value = str(raw_path or '').strip()
    if not value:
        return '/'

    parsed = urlsplit(value)
    path = parsed.path or '/'
    if not path.startswith('/'):
        path = f'/{path.lstrip("/")}'

    normalized = path[:255]
    return normalized or '/'


def _detect_device_type(user_agent: str) -> str:
    value = (user_agent or '').lower()
    if not value:
        return VisitDeviceType.OTHER
    if 'ipad' in value or 'tablet' in value or 'sm-t' in value:
        return VisitDeviceType.TABLET
    if any(token in value for token in ['mobile', 'iphone', 'android', 'phone', 'opera mini', 'iemobile']):
        return VisitDeviceType.MOBILE
    if any(token in value for token in ['windows', 'macintosh', 'mac os', 'linux', 'x11', 'cros']):
        return VisitDeviceType.DESKTOP
    return VisitDeviceType.OTHER


def _serialize_visit(visit: SecureDermaVisit):
    is_logged_in = bool(visit.user_id)
    return {
        'id': visit.id,
        'path': visit.path,
        'visitor_key': visit.visitor_key,
        'referrer': visit.referrer,
        'user_agent': visit.user_agent,
        'created_at': visit.created_at,
        'user_email': getattr(visit.user, 'email', ''),
        'visitor_type': 'logged_in' if is_logged_in else 'guest',
        'device_type': visit.device_type,
        'device_label': VisitDeviceType(visit.device_type).label if visit.device_type else VisitDeviceType.OTHER.label,
    }


class SiteVisitCreateAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        visitor_key = str(request.data.get('visitor_key', '') or '').strip()[:64]
        if not visitor_key:
            return Response({'detail': 'visitor_key is required.'}, status=status.HTTP_400_BAD_REQUEST)

        path = _normalize_path(request.data.get('path'))
        referrer = str(request.data.get('referrer', '') or '').strip()[:500]
        user_agent = str(request.META.get('HTTP_USER_AGENT', '') or '').strip()[:500]
        user = request.user if getattr(request.user, 'is_authenticated', False) else None

        visit = SecureDermaVisit.objects.create(
            user=user,
            visitor_key=visitor_key,
            path=path,
            referrer=referrer,
            user_agent=user_agent,
            device_type=_detect_device_type(user_agent),
        )

        return Response(
            {
                'tracked': True,
                'id': visit.id,
                'visitor_key': visit.visitor_key,
                'device_type': visit.device_type,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminVisitSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        today = timezone.localdate()
        visits = SecureDermaVisit.objects.all()
        latest_visit = visits.order_by('-created_at').first()
        today_visits = visits.filter(created_at__date=today)
        logged_in_visits = visits.filter(user__isnull=False)
        guest_visits = visits.filter(user__isnull=True)
        unique_logged_in_visitors = logged_in_visits.values('user_id').distinct()
        today_unique_logged_in_visitors = today_visits.filter(user__isnull=False).values('user_id').distinct()
        logged_in_visitor_keys = logged_in_visits.values('visitor_key')
        today_logged_in_visitor_keys = today_visits.filter(user__isnull=False).values('visitor_key')
        unique_guest_visitors = guest_visits.exclude(visitor_key__in=logged_in_visitor_keys).values('visitor_key').distinct()
        today_unique_guest_visitors = today_visits.filter(user__isnull=True).exclude(
            visitor_key__in=today_logged_in_visitor_keys
        ).values('visitor_key').distinct()

        return Response(
            {
                'summary': {
                    'total_visits': visits.count(),
                    'today_visits': today_visits.count(),
                    'unique_visitors': visits.values('visitor_key').distinct().count(),
                    'today_unique_visitors': today_visits.values('visitor_key').distinct().count(),
                    'tracked_pages': visits.values('path').distinct().count(),
                    'logged_in_visits': unique_logged_in_visitors.count(),
                    'guest_visits': unique_guest_visitors.count(),
                    'today_logged_in_visits': today_unique_logged_in_visitors.count(),
                    'today_guest_visits': today_unique_guest_visitors.count(),
                    'mobile_visitors': visits.filter(device_type=VisitDeviceType.MOBILE).values('visitor_key').distinct().count(),
                    'today_mobile_visitors': today_visits.filter(device_type=VisitDeviceType.MOBILE).values('visitor_key').distinct().count(),
                    'tablet_visitors': visits.filter(device_type=VisitDeviceType.TABLET).values('visitor_key').distinct().count(),
                    'today_tablet_visitors': today_visits.filter(device_type=VisitDeviceType.TABLET).values('visitor_key').distinct().count(),
                    'desktop_visitors': visits.filter(device_type=VisitDeviceType.DESKTOP).values('visitor_key').distinct().count(),
                    'today_desktop_visitors': today_visits.filter(device_type=VisitDeviceType.DESKTOP).values('visitor_key').distinct().count(),
                    'other_device_visitors': visits.filter(device_type=VisitDeviceType.OTHER).values('visitor_key').distinct().count(),
                    'today_other_device_visitors': today_visits.filter(device_type=VisitDeviceType.OTHER).values('visitor_key').distinct().count(),
                    'latest_visit_at': latest_visit.created_at if latest_visit else None,
                }
            }
        )


class AdminVisitAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        grouping = request.query_params.get('grouping', 'day').strip().lower() or 'day'

        if grouping not in {'day', 'month'}:
            return Response({'detail': "Grouping must be either 'day' or 'month'."}, status=status.HTTP_400_BAD_REQUEST)

        default_periods = 14 if grouping == 'day' else 12
        max_periods = 180 if grouping == 'day' else 36

        try:
            periods = int(request.query_params.get('periods', default_periods))
        except ValueError:
            return Response({'detail': 'Periods must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)

        if periods < 1 or periods > max_periods:
            return Response({'detail': f'Periods must be between 1 and {max_periods} for {grouping} grouping.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        visits = SecureDermaVisit.objects.all()
        anchor_month_value = request.query_params.get('anchor_month', '').strip()
        anchor_date_value = request.query_params.get('anchor_date', '').strip()

        if grouping == 'day':
            if anchor_date_value:
                try:
                    end_date = date.fromisoformat(anchor_date_value)
                except ValueError:
                    return Response({'detail': 'anchor_date must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
                if end_date > today:
                    end_date = today
            else:
                end_date = today

            start_date = end_date - timedelta(days=periods - 1)
            range_queryset = visits.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
            grouped_rows = (
                range_queryset
                .annotate(period=TruncDate('created_at'))
                .values('period')
                .annotate(visits=Count('id'), unique_visitors=Count('visitor_key', distinct=True))
                .order_by('period')
            )

            count_map = {
                row['period'].isoformat(): {
                    'visits': row['visits'],
                    'unique_visitors': row['unique_visitors'],
                }
                for row in grouped_rows if row['period']
            }
            bucket_dates = [start_date + timedelta(days=index) for index in range(periods)]
            series = [
                {
                    'key': bucket_date.isoformat(),
                    'label': bucket_date.strftime('%d %b %Y'),
                    'short_label': bucket_date.strftime('%d %b'),
                    'visits': count_map.get(bucket_date.isoformat(), {}).get('visits', 0),
                    'unique_visitors': count_map.get(bucket_date.isoformat(), {}).get('unique_visitors', 0),
                }
                for bucket_date in bucket_dates
            ]
            range_start = start_date
            range_end = end_date
            anchor_date = end_date.isoformat()
            anchor_month = end_date.strftime('%Y-%m')
        else:
            if anchor_month_value:
                try:
                    anchor_year, anchor_month_number = anchor_month_value.split('-', 1)
                    end_month = date(int(anchor_year), int(anchor_month_number), 1)
                except (TypeError, ValueError):
                    return Response({'detail': 'anchor_month must be in YYYY-MM format.'}, status=status.HTTP_400_BAD_REQUEST)
                current_month = today.replace(day=1)
                if end_month > current_month:
                    end_month = current_month
            else:
                end_month = today.replace(day=1)

            start_month = _add_months(end_month, -(periods - 1))
            next_month = _add_months(end_month, 1)
            range_queryset = visits.filter(created_at__date__gte=start_month, created_at__date__lt=next_month)
            grouped_rows = (
                range_queryset
                .annotate(period=TruncMonth('created_at'))
                .values('period')
                .annotate(visits=Count('id'), unique_visitors=Count('visitor_key', distinct=True))
                .order_by('period')
            )

            count_map = {}
            for row in grouped_rows:
                raw_period = row.get('period')
                if not raw_period:
                    continue
                period_date = raw_period.date() if hasattr(raw_period, 'date') else raw_period
                count_map[period_date.isoformat()] = {
                    'visits': row['visits'],
                    'unique_visitors': row['unique_visitors'],
                }

            bucket_months = [_add_months(start_month, index) for index in range(periods)]
            series = [
                {
                    'key': bucket_month.isoformat(),
                    'label': bucket_month.strftime('%b %Y'),
                    'short_label': bucket_month.strftime('%b'),
                    'visits': count_map.get(bucket_month.isoformat(), {}).get('visits', 0),
                    'unique_visitors': count_map.get(bucket_month.isoformat(), {}).get('unique_visitors', 0),
                }
                for bucket_month in bucket_months
            ]
            range_start = start_month
            range_end = end_month
            anchor_date = end_month.isoformat()
            anchor_month = end_month.strftime('%Y-%m')

        range_unique_visitors = range_queryset.values('visitor_key').distinct().count()
        total_visits = sum(point['visits'] for point in series)
        peak_visits = max((point['visits'] for point in series), default=0)
        peak_unique_visitors = max((point['unique_visitors'] for point in series), default=0)

        return Response(
            {
                'grouping': grouping,
                'periods': periods,
                'range_start': range_start.isoformat(),
                'range_end': range_end.isoformat(),
                'anchor_date': anchor_date,
                'anchor_month': anchor_month,
                'total_visits': total_visits,
                'range_unique_visitors': range_unique_visitors,
                'peak_visits': peak_visits,
                'peak_unique_visitors': peak_unique_visitors,
                'series': series,
            }
        )


class AdminVisitPagesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        queryset = SecureDermaVisit.objects.all()
        search_text = request.query_params.get('searchText', '').strip()
        visited_on = request.query_params.get('visited_on', '').strip()

        if search_text:
            queryset = queryset.filter(Q(path__icontains=search_text) | Q(referrer__icontains=search_text))

        if visited_on:
            try:
                visited_on_date = date.fromisoformat(visited_on)
            except ValueError:
                return Response({'detail': 'visited_on must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(created_at__date=visited_on_date)

        try:
            limit = min(max(int(request.query_params.get('limit', 10)), 1), 50)
        except ValueError:
            return Response({'detail': 'limit must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)

        rows = list(
            queryset
            .values('path')
            .annotate(
                visits=Count('id'),
                unique_visitors=Count('visitor_key', distinct=True),
                latest_visit_at=Max('created_at'),
            )
            .order_by('-visits', 'path')[:limit]
        )

        return Response({'results': rows})


class AdminVisitListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        queryset = SecureDermaVisit.objects.select_related('user').all()
        search_text = request.query_params.get('searchText', '').strip()
        visited_on = request.query_params.get('visited_on', '').strip()

        if search_text:
            queryset = queryset.filter(
                Q(path__icontains=search_text)
                | Q(referrer__icontains=search_text)
                | Q(visitor_key__icontains=search_text)
                | Q(user__email__icontains=search_text)
            )

        if visited_on:
            try:
                visited_on_date = date.fromisoformat(visited_on)
            except ValueError:
                return Response({'detail': 'visited_on must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(created_at__date=visited_on_date)

        try:
            limit = int(request.query_params.get('limit', 12))
            offset = int(request.query_params.get('offset', 0))
        except ValueError:
            return Response({'detail': 'limit and offset must be valid integers.'}, status=status.HTTP_400_BAD_REQUEST)

        if limit < 1 or limit > 100:
            return Response({'detail': 'limit must be between 1 and 100.'}, status=status.HTTP_400_BAD_REQUEST)
        if offset < 0:
            return Response({'detail': 'offset must be zero or greater.'}, status=status.HTTP_400_BAD_REQUEST)

        total = queryset.count()
        results = [_serialize_visit(visit) for visit in queryset.order_by('-created_at')[offset:offset + limit]]
        return Response({'count': total, 'results': results})
