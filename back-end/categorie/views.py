# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.pagination import LimitOffsetPagination

from .models import Categories
from .serializers import CategoriesSerializer


class CategoryPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100


class CategoryListCreateAPIView(APIView):

    def get(self, request):
        queryset = Categories.objects.filter(is_deleted=False).order_by("-id")
        search = request.query_params.get("searchText")
        if search:
            queryset = queryset.filter(categorie__icontains=search)

        paginator = CategoryPagination()
        if "limit" in request.query_params and "offset" in request.query_params:
            result_page = paginator.paginate_queryset(queryset, request)
            serializer = CategoriesSerializer(result_page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = CategoriesSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = CategoriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "New Category created successfully."},
            status=status.HTTP_201_CREATED
        )


class CategoryDetailAPIView(APIView):

    def get_object(self, pk):
        return get_object_or_404(Categories, pk=pk, is_deleted=False)

    def get(self, request, pk):
        category = self.get_object(pk)
        serializer = CategoriesSerializer(category, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        category = self.get_object(pk)
        serializer = CategoriesSerializer(category, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Category updated successfully."})

    def delete(self, request, pk):
        category = self.get_object(pk)
        category.is_deleted = True
        category.save()
        return Response({"message": "Category deleted successfully."})