from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Ingredients
from .serializers import IngredientSerializer
from rest_framework.pagination import LimitOffsetPagination


class IngredientPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100

class IngredientListCreateAPIView(APIView):

    def get(self, request):
        queryset = Ingredients.objects.filter(is_deleted=False).order_by("-id")

        # Search
        search = request.query_params.get("searchText")
        if search:
            queryset = queryset.filter(ingredient__icontains=search)

        paginator = IngredientPagination()

        # Paginate only if limit & offset are supplied
        if "limit" in request.query_params and "offset" in request.query_params:
            result_page = paginator.paginate_queryset(queryset, request)
            serializer = IngredientSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = IngredientSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = IngredientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "New Ingredient Concern created successfully."},
            status=status.HTTP_201_CREATED
        )


class IngredientDetailAPIView(APIView):

    def get_object(self, pk):
        return get_object_or_404(Ingredients, pk=pk, is_deleted=False)

    def get(self, request, pk):
        item = self.get_object(pk)
        serializer = IngredientSerializer(item)
        return Response(serializer.data)

    def put(self, request, pk):
        item = self.get_object(pk)
        serializer = IngredientSerializer(item, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Ingredient Concern updated successfully."})

    def delete(self, request, pk):
        item = self.get_object(pk)
        item.is_deleted = True
        item.save()
        return Response({"message": "Ingredient Concern deleted successfully."})
