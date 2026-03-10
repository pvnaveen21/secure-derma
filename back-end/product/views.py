from django.shortcuts import render
from rest_framework.parsers import MultiPartParser, FormParser

from product.models import Product, ProductDetails, ProductImage, ProductReview, ProductReviewImage
from product.serializers import ProductDetailsSerializer, ProductImageSerializer, ProductReviewSerializer, ProductSerializer ,ProductListSerializer
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Q

from rest_framework import generics, status
from rest_framework.response import Response
import json




class ProductPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100


class ProductReviewPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100

    def get_paginated_response(self, data):
        return Response({
            "count": self.count,
            "next": self.get_next_link(),
            "previous": self.get_previous_link() or "",
            "results": data,
        })


class ProductListCreateAPIView(generics.ListCreateAPIView):
    queryset = Product.objects.filter(is_deleted=False).prefetch_related("product_details", "images")
    pagination_class = ProductPagination

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductListSerializer
        return ProductSerializer  # original serializer for create

    def get_queryset(self):
        queryset = Product.objects.filter(
            is_deleted=False
        ).prefetch_related("product_details", "images")

        search_text = self.request.query_params.get("searchText")
        trending_product = self.request.query_params.get("trending_product")
        best_seller = self.request.query_params.get("best_seller")

        if search_text:
            queryset = queryset.filter(
                Q(product_name__icontains=search_text) |
                Q(brand__brand_name__icontains=search_text) |
                Q(product_type__product_type__icontains=search_text) |
                Q(categorie__categorie__icontains=search_text)
            )

        filters = Q()

        if trending_product and trending_product.lower() == "true":
            filters |= Q(trending_product=True)

        if best_seller and best_seller.lower() == "true":
            filters |= Q(best_seller=True)

        if filters:
            queryset = queryset.filter(filters)

        return queryset



class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.filter(is_deleted=False).prefetch_related("product_details", "images")
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def update(self, request, *args, **kwargs):
        product = self.get_object()

        data = request.data
        # -------------------------
        # 1) UPDATE BASIC FIELDS
        # -------------------------
        product.brand_id = data.get("brand", product.brand_id)
        product.product_type_id = data.get("product_type", product.product_type_id)
        product.categorie_id = data.get("categorie", product.categorie_id)
        product.product_name = data.get("product_name", product.product_name)
        product.product_description = data.get("product_description", product.product_description)
        key_benefits_str = data.get("key_benefits")
        product.trending_product = json.loads(data.get("trending_product"))
        product.best_seller = json.loads(data.get("best_seller"))

        
        if key_benefits_str:
            try:
                product.key_benefits = json.loads(key_benefits_str)
            except json.JSONDecodeError:
                product.key_benefits = [key_benefits_str]

        # --- Key Ingredients ---
        key_ingredients_str = data.get("key_ingredients")
        if key_ingredients_str:
            try:
                product.key_ingredients = json.loads(key_ingredients_str)
            except json.JSONDecodeError:
                product.key_ingredients = [key_ingredients_str]

        # --- How To Use ---
        how_to_use_str = data.get("how_to_use")
        if how_to_use_str:
            try:
                product.how_to_use = json.loads(how_to_use_str)
            except json.JSONDecodeError:
                product.how_to_use = [how_to_use_str]
        
        # Thumbnail update (only if file sent)
        if "thumbnail_image" in request.FILES:
            product.thumbnail_image = request.FILES["thumbnail_image"]

        # Hover image update (only if file sent)
        if "hover_image" in request.FILES:
            product.hover_image = request.FILES["hover_image"]

        product.save()

  
        skin_ids = data.getlist("skin_concern")
        hair_ids = data.getlist("hair_concern")
        ingredient_ids = data.getlist("ingredient")
        

        if skin_ids:
            product.skin_concern.set(skin_ids)
        else :
            product.skin_concern.set('')

        if hair_ids:
            product.hair_concern.set(hair_ids)
        else :
            product.hair_concern.set('')
            
        if ingredient_ids:
            product.ingredient.set(ingredient_ids)
        else :
            product.ingredient.set('')
        


        details_dict = {}
        for key, value in data.items():
            if key.startswith("details["):  
                idx = key[key.find("[") + 1:key.find("]")]
                field = key.split("].")[1]

                details_dict.setdefault(idx, {})
                details_dict[idx][field] = value

        """
        details[0].id -> existing detail id
        details[0].product_weight -> new value
        """

        for idx, item in details_dict.items():
            detail_id = item.get("id")

            # convert to int if exists
            if detail_id:
                try:
                    detail_id = int(detail_id)
                except ValueError:
                    detail_id = None

            if detail_id:
                # Update existing detail
                detail = ProductDetails.objects.get(id=detail_id, product=product)
                detail.product_weight = item.get("product_weight", detail.product_weight)
                detail.weight_type = item.get("weight_type", detail.weight_type)
                detail.combo = item.get("combo", detail.combo)
                detail.original_price = item.get("original_price", detail.original_price)
                detail.selling_price = item.get("selling_price", detail.selling_price)
                detail.available_stock_count = item.get("available_stock_count", detail.available_stock_count)
                detail.discount_price = item.get("discount_price", detail.discount_price)

                detail.save()

            else:
                # Create new detail
                ProductDetails.objects.create(
                    product=product,
                    product_weight=item.get("product_weight"),
                    weight_type=item.get("weight_type"),
                    combo=item.get("combo"),
                    original_price=item.get("original_price"),
                    selling_price=item.get("selling_price"),
                    available_stock_count=item.get("available_stock_count"),
                    discount_price=item.get("discount_price")

                )


        # -------------------------
        # 4) ADD NEW IMAGES (existing images handled by delete API)
        # -------------------------
        for img in request.FILES.getlist("images"):
            ProductImage.objects.create(product=product, image=img)

        return Response({"message": "Product updated successfully"}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
            # soft delete
            instance.is_deleted = True
            instance.save()
            instance.product_details.update(is_deleted=True)
            instance.images.update(is_deleted=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "Product deleted successfully"}, 
            status=status.HTTP_200_OK
        )
        

    




class ProductImageDeleteAPIView(generics.DestroyAPIView):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer


class ProductDetailDeleteAPIView(generics.DestroyAPIView):
    queryset = ProductDetails.objects.all()
    serializer_class = ProductDetailsSerializer


class ProductReviewListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProductReviewSerializer
    pagination_class = ProductReviewPagination
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return ProductReview.objects.filter(
            product_id=self.kwargs["product_id"],
            is_deleted=False
        ).order_by("-review_date", "-created_at", "-id")

    def perform_create(self, serializer):
        product = Product.objects.get(id=self.kwargs["product_id"])

        # Handle anonymous user
        user = self.request.user if self.request.user.is_authenticated else None

        review = serializer.save(product=product, user=user)

        # Multiple image upload
        for img in self.request.FILES.getlist("images"):
            ProductReviewImage.objects.create(review=review, image=img)


class ProductReviewRUDAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ProductReview.objects.filter(is_deleted=False)
    serializer_class = ProductReviewSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_update(self, serializer):
        review = serializer.save()

        # Add new images only (no delete)
        for img in self.request.FILES.getlist("images"):
            ProductReviewImage.objects.create(review=review, image=img)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()

        return Response(
            {"message": "Review deleted successfully"},
            status=status.HTTP_200_OK
        )

class ProductReviewImageDeleteAPIView(generics.DestroyAPIView):
    queryset = ProductReviewImage.objects.all()

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()

        # Delete the file from storage
        if instance.image:
            instance.image.delete(save=False)

        instance.delete()

        return Response(
            {"message": "Image deleted successfully"},
            status=status.HTTP_200_OK
        )
