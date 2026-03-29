from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import ProductType
from .serializers import ProductTypeSerializer
from rest_framework.pagination import LimitOffsetPagination


class ProductTypePagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100



class ProductTypeListCreateAPIView(APIView):

    def get(self, request):
        queryset = ProductType.objects.filter(is_deleted=False).order_by("-id")
        search = request.query_params.get("searchText")
        if search:
            queryset = queryset.filter(product_type__icontains=search)
        
        paginator = ProductTypePagination()
        if "limit" in request.query_params and "offset" in request.query_params:
            result_page = paginator.paginate_queryset(queryset, request)
            serializer = ProductTypeSerializer(result_page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        
        serializer = ProductTypeSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = ProductTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "New Product Type created successfully."},
            status=status.HTTP_201_CREATED
        )


class ProductTypeDetailAPIView(APIView):

    def get_object(self, pk):
        return get_object_or_404(ProductType, pk=pk, is_deleted=False)

    def get(self, request, pk):
        product_type = self.get_object(pk)
        serializer = ProductTypeSerializer(product_type, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        product_type = self.get_object(pk)
        serializer = ProductTypeSerializer(product_type, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Product Type updated successfully."})

    def delete(self, request, pk):
        product_type = self.get_object(pk)
        product_type.is_deleted = True
        product_type.save()
        return Response({"message": "Product Type deleted successfully."})
