from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import SkinConcerns
from .serializers import SkinConcernsSerializer
from rest_framework.pagination import LimitOffsetPagination


class SkinConcernsPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100

class SkinConcernsListCreateAPIView(APIView):

    def get(self, request):
        queryset = SkinConcerns.objects.filter(is_deleted=False).order_by("-id")

        # Search
        search = request.query_params.get("searchText")
        if search:
            queryset = queryset.filter(skin_concern__icontains=search)

        paginator = SkinConcernsPagination()

        # Paginate only if limit & offset are supplied
        if "limit" in request.query_params and "offset" in request.query_params:
            result_page = paginator.paginate_queryset(queryset, request)
            serializer = SkinConcernsSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = SkinConcernsSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SkinConcernsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "New Skin Concern created successfully."},
            status=status.HTTP_201_CREATED
        )


class SkinConcernsDetailAPIView(APIView):

    def get_object(self, pk):
        return get_object_or_404(SkinConcerns, pk=pk, is_deleted=False)

    def get(self, request, pk):
        item = self.get_object(pk)
        serializer = SkinConcernsSerializer(item)
        return Response(serializer.data)

    def put(self, request, pk):
        item = self.get_object(pk)
        serializer = SkinConcernsSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Skin Concern updated successfully."})

    def delete(self, request, pk):
        item = self.get_object(pk)
        item.is_deleted = True
        item.save()
        return Response({"message": "Skin Concern deleted successfully."})
