from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Brand
from .serializers import BrandSerializer
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Q


class BrandApiPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100


class BrandListCreateAPIView(APIView):
    def get(self, request):
        queryset = Brand.objects.filter(is_deleted=False).order_by("-id")

        search = request.query_params.get("searchText")
        is_top_brand = request.query_params.get("is_top_brand")

        if search:
            queryset = queryset.filter(brand_name__icontains=search)
        
        filters = Q()

        if is_top_brand and is_top_brand.lower() == "true":
            filters |= Q(is_top_brand=True)

        if filters:
            queryset = queryset.filter(filters)

        paginator = BrandApiPagination()

        if "limit" in request.query_params and "offset" in request.query_params:
            result_page = paginator.paginate_queryset(queryset, request)
            serializer = BrandSerializer(
                result_page,
                many=True,
                context={'request': request}
            )
            return paginator.get_paginated_response(serializer.data)

        serializer = BrandSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


    def post(self, request):
        serializer = BrandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "New Brand created successfully."},
            status=status.HTTP_201_CREATED
        )


class BrandDetailAPIView(APIView):
    """
    GET → Retrieve single brand
    PUT → Update brand
    DELETE → Soft delete brand
    """

    def get_object(self, pk):
        return get_object_or_404(Brand, pk=pk, is_deleted=False)

    def get(self, request, pk):
        brand = self.get_object(pk)
        serializer = BrandSerializer(brand)
        return Response(serializer.data)

    def put(self, request, pk):
        brand = self.get_object(pk)
        
        # Combine data and files properly
        data = request.data.copy()  # Make a mutable copy
        if request.FILES:
            data.update(request.FILES)
        
        serializer = BrandSerializer(brand, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Brand updated successfully."})

    def delete(self, request, pk):
        brand = self.get_object(pk)
        brand.is_deleted = True
        brand.save()
        return Response({"message": "Brand deleted successfully."})
    
    
# class TopBrandListAPIView(ListAPIView):
#     serializer_class = BrandSerializer

#     def get_queryset(self):
#         return Brand.objects.filter(
#             is_top_brand=True,
#             is_deleted=False
#         )



class AddTopBrandAPIView(APIView):

    def post(self, request, pk):
        brand = get_object_or_404(Brand, pk=pk, is_deleted=False)

        brand.is_top_brand = True
        brand.save(update_fields=['is_top_brand'])

        return Response(
            {"message": "Brand marked as top brand"},
            status=status.HTTP_200_OK
        )

class RemoveTopBrandAPIView(APIView):

    def post(self, request, pk):
        brand = get_object_or_404(Brand, pk=pk, is_deleted=False)

        brand.is_top_brand = False
        brand.save(update_fields=['is_top_brand'])

        return Response(
            {"message": "Brand removed from top brand"},
            status=status.HTTP_200_OK
        )
