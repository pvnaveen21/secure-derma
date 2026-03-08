from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings


from banner_images.models import ImageFile
from brand.models import Brand
from categorie.models import Categories
from hair_concern.models import HairConcerns
from ingredient.models import Ingredients
from product.models import Product, ProductDetails, ProductImage, ProductReview
from product.serializers import ProductListSerializer
from product_type.models import ProductType
from django.db.models import Prefetch, Avg, Count, Min ,Q,F

from skin_concern.models import SkinConcerns
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class BrandListAPIView(ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        search_text = request.query_params.get("searchText", "").strip()

        queryset = Brand.objects.filter(is_deleted=False)

        # 🔍 Apply search filter
        if search_text:
            queryset = queryset.filter(brand_name__icontains=search_text)

        queryset = queryset.order_by("brand_name").values(
            "id", "brand_name", "brand_image"
        )

        grouped_data = {}

        for brand in queryset:
            name = brand["brand_name"].strip()
            first_char = name[0].upper()

            if not first_char.isalpha():
                first_char = "A"

            image = brand["brand_image"]
            image_url = request.build_absolute_uri(image) if image else ""

            grouped_data.setdefault(first_char, []).append({
                "id": brand["id"],
                "brand_name": name,
                "brand_image": image_url
            })

        return Response(grouped_data)
    
class TopBrandsAPIView(ListAPIView):
    """Fast API to get top brands only"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Simple and fast query for top brands
        queryset = Brand.objects.filter(
            is_deleted=False,
            is_top_brand=True,
            show_brand=True
        ).order_by('brand_name')
        
        # Minimal data for speed
        brands_list = list(queryset.values('id', 'brand_name', 'brand_image'))
        
        # Build correct absolute URLs for images
        for brand in brands_list:
            if brand['brand_image']:
                # Correct way: Prepend MEDIA_URL and then build absolute URI
                relative_path = brand['brand_image']
                # Remove any leading slash if present
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                
                # Construct the full media URL
                media_url = request.build_absolute_uri(settings.MEDIA_URL)
                brand['brand_image'] = f"{media_url}{relative_path}"
            else:
                brand['brand_image'] = None
        
        return Response({
            'top_brands': brands_list,
            'count': len(brands_list)
        })


class HomeProductTypeAPIView(ListAPIView):
    """API to get product types displayed on home page"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get only product types where show_home is True
        queryset = ProductType.objects.filter(
            is_deleted=False,
            show_home=True
        ).order_by('id')
        
        # Get minimal data
        product_types_list = list(queryset.values(
            'id', 
            'product_type', 
            'image',
            'categorie_id'
        ))
        
        # Build full image URLs
        for product_type in product_types_list:
            if product_type['image']:
                # Remove leading slash if present
                relative_path = product_type['image']
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                
                # Build absolute URL
                product_type['image'] = request.build_absolute_uri(f'/media/{relative_path}')
            else:
                product_type['image'] = None
        
        return Response({
            'home_product_types': product_types_list,
            'count': len(product_types_list)
        })


class LandingPageImagesAPIView(ListAPIView):
    """API to get landing page images"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get only landing page images
        queryset = ImageFile.objects.filter(
            is_deleted=False,
            type='landing_page'
        ).order_by('-created_at')
        
        # Get minimal data
        images_list = list(queryset.values(
            'id', 
            'image',
            'type',
            'created_at'
        ))
        
        # Build full image URLs
        for img in images_list:
            if img['image']:
                # Remove leading slash if present
                relative_path = img['image']
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                
                # Build absolute URL
                img['image'] = request.build_absolute_uri(f'/media/{relative_path}')
            else:
                img['image'] = None
        
        return Response({
            'landing_page_images': images_list,
            'count': len(images_list)
        })

class ImagesAPIView(ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None

    def get(self, request, *args, **kwargs):
        image_type = request.query_params.get('type')

        queryset = ImageFile.objects.filter(is_deleted=False)

        # filter by type if passed
        if image_type:
            queryset = queryset.filter(type=image_type)

        queryset = queryset.order_by('-created_at')

        images_list = list(
            queryset.values('id', 'image', 'type', 'created_at')
        )

        # build absolute image URL
        for img in images_list:
            if img['image']:
                relative_path = img['image']
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]

                img['image'] = request.build_absolute_uri(
                    f'/media/{relative_path}'
                )
            else:
                img['image'] = None

        return Response({
            'images': images_list,
            'count': len(images_list)
        })
        
class TrendingProductsFastAPIView(ListAPIView):
    """Ultra-fast API for trending products with product details"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get products with annotations
        queryset = Product.objects.filter(
            is_deleted=False,
            trending_product=True
        ).select_related(
            'brand',
            'product_type', 
            'categorie'
        ).prefetch_related(
            'product_details'  # Prefetch product details
        ).annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
            review_count=Count('reviews__id', filter=Q(reviews__is_deleted=False), distinct=True),
            min_price=Min('product_details__selling_price', filter=Q(product_details__is_deleted=False))
        ).order_by('-created_at')[:50]
        
        # Build response list
        products_list = []
        
        for product in queryset:
            # Build thumbnail URL
            thumbnail_url = None
            if product.thumbnail_image:
                relative_path = str(product.thumbnail_image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                thumbnail_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            # Build hover image URL
            hover_url = None
            if product.hover_image:
                relative_path = str(product.hover_image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                hover_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            # Get product details (without available_stock_count)
            product_details_list = []
            for detail in product.product_details.filter(is_deleted=False):
                product_details_list.append({
                    'id': detail.id,
                    'product_weight': detail.product_weight,
                    'weight_type': detail.weight_type,
                    'combo': detail.combo,
                    'original_price': detail.original_price,
                    'selling_price': detail.selling_price,
                    'discount_price': detail.discount_price
                })
            
            products_list.append({
                'id': product.id,
                'product_name': product.product_name,
                'brand_name': product.brand.brand_name,
                'product_type': product.product_type.product_type,
                'category_id': product.categorie.id,
                'thumbnail_image': thumbnail_url,
                'hover_image': hover_url,
                'min_price': product.min_price or 0,
                'avg_rating': round(product.avg_rating, 1) if product.avg_rating else 0,
                'review_count': product.review_count or 0,
                'product_details': product_details_list  # ✅ Added product details
            })
        
        return Response({
            'trending_products': products_list,
            'count': len(products_list)
        })


class SkinConcernsBannerAPIView(ListAPIView):
    """API to get skin concerns with show_banner=True"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get skin concerns where show_banner is True
        queryset = SkinConcerns.objects.filter(
            is_deleted=False,
            show_banner=True
        ).order_by('skin_concern')
        
        # Get minimal data
        skin_concerns_list = list(queryset.values(
            'id', 
            'skin_concern'
        ))
        
        return Response({
            'skin_concerns': skin_concerns_list,
            'count': len(skin_concerns_list)
        })
        
        
class HairConcernsBannerAPIView(ListAPIView):
    """API to get hair concerns with show_banner=True"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get hair concerns where show_banner is True
        queryset = HairConcerns.objects.filter(
            is_deleted=False,
            show_banner=True
        ).order_by('hair_concern')
        
        # Get minimal data
        hair_concerns_list = list(queryset.values(
            'id', 
            'hair_concern'
        ))
        
        return Response({
            'hair_concerns': hair_concerns_list,
            'count': len(hair_concerns_list)
        })


class HairBannerAPIView(ListAPIView):
    """Hair API for hair concerns and product types with show_banner=True"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get hair concerns where show_banner is True
        hair_queryset = HairConcerns.objects.filter(
            is_deleted=False,
            show_banner=True
        ).order_by('hair_concern')
        
        # Get product types where show_banner is True
        product_type_queryset = ProductType.objects.filter(
            is_deleted=False,
            show_banner=True,
            categorie__categorie__iexact='Hair'            
        ).select_related('categorie').order_by('product_type')
        
        # Build hair concerns list
        hair_concerns_list = list(hair_queryset.values('id', 'hair_concern'))
        
        # Build product types list
        product_types_list = []
        for product_type in product_type_queryset:
            # Build image URL
            image_url = None
            if product_type.image:
                relative_path = str(product_type.image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                image_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            product_types_list.append({
                'id': product_type.id,
                'product_type': product_type.product_type,
                'image': image_url,
                'category_id': product_type.categorie.id,
                'category_name': product_type.categorie.categorie,
                'show_home': product_type.show_home
            })
        
            hair_category = Categories.objects.filter(
                categorie__iexact='Hair',
                is_deleted=False
            ).first()
            
            if not hair_category:
                return Response({
                    'error': 'Hair category not found',
                    'category_info': None
                })
            
            # Build category image URL
            category_image_url = None
            if hair_category.image:
                relative_path = str(hair_category.image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                category_image_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            category_info = {
                'id': hair_category.id,
                'name': hair_category.categorie,
                'image': category_image_url
            }
            
        
        return Response({
            'hair_concerns': {
                'data': hair_concerns_list,
                'count': len(hair_concerns_list)
            },
            'hair_category': {
                'data': product_types_list,
                'count': len(product_types_list)
            },
             'hair_info': category_info

        })
        

class SkinBannerAPIView(ListAPIView):
    """Skin API for skin concerns and product types with show_banner=True"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get skin concerns where show_banner is True
        skin_queryset = SkinConcerns.objects.filter(
            is_deleted=False,
            show_banner=True
        ).order_by('skin_concern')
        
        # Get product types where show_banner is True
        product_type_queryset = ProductType.objects.filter(
            is_deleted=False,
            show_banner=True,
            categorie__categorie__iexact='Skin'            
        ).select_related('categorie').order_by('product_type')
        
        # Build skin concerns list
        skin_concerns_list = list(skin_queryset.values('id', 'skin_concern'))
        
        # Build product types list
        product_types_list = []
        for product_type in product_type_queryset:
            # Build image URL
            image_url = None
            if product_type.image:
                relative_path = str(product_type.image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                image_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            product_types_list.append({
                'id': product_type.id,
                'product_type': product_type.product_type,
                'image': image_url,
                'category_id': product_type.categorie.id,
                'category_name': product_type.categorie.categorie,
                'show_home': product_type.show_home
            })
        
        # Get skin category
        skin_category = Categories.objects.filter(
            categorie__iexact='Skin',
            is_deleted=False
        ).first()
        
        if not skin_category:
            return Response({
                'error': 'Skin category not found',
                'category_info': None
            })
        
        # Build category image URL
        category_image_url = None
        if skin_category.image:
            relative_path = str(skin_category.image)
            if relative_path.startswith('/'):
                relative_path = relative_path[1:]
            category_image_url = request.build_absolute_uri(f'/media/{relative_path}')
        
        category_info = {
            'id': skin_category.id,
            'name': skin_category.categorie,
            'image': category_image_url
        }
        
        return Response({
            'skin_concerns': {
                'data': skin_concerns_list,
                'count': len(skin_concerns_list)
            },
            'skin_category': {
                'data': product_types_list,
                'count': len(product_types_list)
            },
            'skin_info': category_info
        })

class SupplementBannerAPIView(ListAPIView):
    """API for supplement product types with show_banner=True"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get supplement product types where show_banner is True
        product_type_queryset = ProductType.objects.filter(
            is_deleted=False,
            show_banner=True,
            categorie__categorie__iexact='Supplements'  # Changed from 'Skin' to 'Supplement'
        ).select_related('categorie').order_by('product_type')
        
        # Build product types list
        product_types_list = []
        for product_type in product_type_queryset:
            # Build image URL
            image_url = None
            if product_type.image:
                relative_path = str(product_type.image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                image_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            product_types_list.append({
                'id': product_type.id,
                'product_type': product_type.product_type,
                'image': image_url,
                'category_id': product_type.categorie.id,
                'category_name': product_type.categorie.categorie,
                'show_home': product_type.show_home
            })
        
        # Get supplement category
        supplement_category = Categories.objects.filter(
            categorie__iexact='Supplements',  # Changed from 'Skin' to 'Supplement'
            is_deleted=False
        ).first()
        
        if not supplement_category:
            return Response({
                'error': 'Supplement category not found',
                'category_info': None
            })
        
        # Build category image URL
        category_image_url = None
        if supplement_category.image:
            relative_path = str(supplement_category.image)
            if relative_path.startswith('/'):
                relative_path = relative_path[1:]
            category_image_url = request.build_absolute_uri(f'/media/{relative_path}')
        
        category_info = {
            'id': supplement_category.id,
            'name': supplement_category.categorie,
            'image': category_image_url
        }
        
        return Response({
            'supplements': {
                'data': product_types_list,
                'count': len(product_types_list)
            },
            'category_info': category_info
        })


class CollectionBannerAPIView(ListAPIView):
    """Common API for all banner types"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get banner_type from query parameters
        banner_type = request.GET.get('bannerType')
        
        if not banner_type:
            return Response({
                'success': False,
                'message': 'bannerType parameter is required',
                'data': []
            })
        
        # Validate banner_type against choices
        valid_types = [choice[0] for choice in ImageFile.TYPE_CHOICES]
        if banner_type not in valid_types:
            return Response({
                'success': False,
                'message': f'Invalid banner type. Valid types are: {", ".join(valid_types)}',
                'data': []
            })
        
        # Filter images by type
        banners = ImageFile.objects.filter(
            type=banner_type,
            is_deleted=False
        ).order_by('-created_at')
        
        # Build response data
        banner_list = []
        for banner in banners:
            # Build image URL
            image_url = None
            if banner.image:
                relative_path = str(banner.image)
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                image_url = request.build_absolute_uri(f'/media/{relative_path}')
            
            banner_list.append({
                'id': banner.id,
                'image_url': image_url,
                'type': banner.type,
                'type_display': banner.get_type_display(),  # Human-readable type
                'created_at': banner.created_at
            })
        
        return Response({
            'success': True,
            'message': f'Banners for type "{banner_type}" retrieved successfully',
            'data': banner_list,
            'count': len(banner_list),
            'banner_type': banner_type
        })


class ConcernProductsAPIView(APIView):
    permission_classes = [AllowAny]

    def _product_payload(self, request, product):
        thumbnail_url = None
        if product.thumbnail_image:
            thumbnail_url = request.build_absolute_uri(
                f"/media/{str(product.thumbnail_image).lstrip('/')}"
            )

        hover_url = None
        if product.hover_image:
            hover_url = request.build_absolute_uri(
                f"/media/{str(product.hover_image).lstrip('/')}"
            )

        detail = product.product_details.filter(is_deleted=False).order_by("selling_price").first()

        return {
            "id": product.id,
            "slug": product.slug,
            "product_name": product.product_name,
            "brand_name": product.brand.brand_name,
            "thumbnail_image": thumbnail_url,
            "hover_image": hover_url,
            "price": detail.selling_price if detail else 0,
            "original_price": detail.original_price if detail else 0,
            "avg_rating": round(product.avg_rating, 1) if product.avg_rating else 0,
            "review_count": product.review_count or 0,
            "product_type": product.product_type.product_type,
        }

    def get(self, request):
        concern = (request.query_params.get("concern") or "").strip()
        limit = int(request.query_params.get("limit", 12))

        if not concern:
            return Response(
                {"success": False, "message": "concern query parameter is required", "products": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        concern_slug = concern.lower().replace("&", "and").replace("_", "-").replace(" ", "-")
        print("Concern Slug:", concern_slug)  # Debugging line to check slug generation
        print("Matching Skin Concerns:", SkinConcerns.objects.all().values_list('slug', flat=True))  # Debugging line to check existing slugs

        skin_match = SkinConcerns.objects.filter(
            Q(slug__iexact=concern_slug) | Q(skin_concern__iexact=concern), is_deleted=False
        ).first()
        hair_match = HairConcerns.objects.filter(
            Q(slug__iexact=concern_slug) | Q(hair_concern__iexact=concern), is_deleted=False
        ).first()

        if not skin_match and not hair_match:
            return Response(
                {"success": False, "message": "No concern found for the given value", "products": []},
                status=status.HTTP_404_NOT_FOUND,
            )

        product_q = Product.objects.filter(is_deleted=False)
        concern_type = "skin"
        concern_label = ""

        if skin_match:
            product_q = product_q.filter(skin_concern=skin_match)
            concern_label = skin_match.skin_concern
        else:
            product_q = product_q.filter(hair_concern=hair_match)
            concern_type = "hair"
            concern_label = hair_match.hair_concern

        total_count = product_q.count()

        products = (
            product_q.select_related("brand", "product_type")
            .prefetch_related("product_details")
            .annotate(
                avg_rating=Avg("reviews__rating", filter=Q(reviews__is_deleted=False)),
                review_count=Count("reviews__id", filter=Q(reviews__is_deleted=False), distinct=True),
            )
            .order_by("-created_at")[:limit]
        )

        return Response(
            {
                "success": True,
                "concern": concern_label,
                "concern_type": concern_type,
                "count": len(products),
                "total_count": total_count,
                "limit": limit,
                "products": [self._product_payload(request, p) for p in products],
            }
        )


class RoutineBuilderAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        skin_type = (request.data.get("skin_type") or "").strip()
        concern = (request.data.get("concern") or "").strip()
        budget = (request.data.get("budget") or "").strip().lower()

        if not concern:
            return Response(
                {"success": False, "message": "concern is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        concern_slug = concern.lower().replace("&", "and").replace("_", "-").replace(" ", "-")
        skin_match = SkinConcerns.objects.filter(
            Q(slug__iexact=concern_slug) | Q(skin_concern__iexact=concern), is_deleted=False
        ).first()
        hair_match = HairConcerns.objects.filter(
            Q(slug__iexact=concern_slug) | Q(hair_concern__iexact=concern), is_deleted=False
        ).first()

        if not skin_match and not hair_match:
            return Response(
                {"success": False, "message": "Concern not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        products = Product.objects.filter(is_deleted=False).select_related("brand", "product_type").prefetch_related("product_details")
        is_hair = False
        if skin_match:
            products = products.filter(skin_concern=skin_match)
        else:
            is_hair = True
            products = products.filter(hair_concern=hair_match)

        price_cap = None
        if budget == "low":
            price_cap = 500
        elif budget == "medium":
            price_cap = 1000
        elif budget == "high":
            price_cap = None

        shortlisted = []
        for p in products.order_by("-trending_product", "-best_seller", "-created_at")[:60]:
            detail = p.product_details.filter(is_deleted=False).order_by("selling_price").first()
            if not detail:
                continue
            if price_cap and detail.selling_price > price_cap:
                continue
            shortlisted.append(
                {
                    "id": p.id,
                    "slug": p.slug,
                    "product_name": p.product_name,
                    "brand_name": p.brand.brand_name,
                    "product_type": p.product_type.product_type,
                    "price": detail.selling_price,
                    "thumbnail_image": request.build_absolute_uri(f"/media/{str(p.thumbnail_image).lstrip('/')}") if p.thumbnail_image else None,
                }
            )

        if len(shortlisted) < 3:
            for p in products.order_by("-created_at")[:30]:
                detail = p.product_details.filter(is_deleted=False).order_by("selling_price").first()
                if not detail:
                    continue
                if any(item["id"] == p.id for item in shortlisted):
                    continue
                shortlisted.append(
                    {
                        "id": p.id,
                        "slug": p.slug,
                        "product_name": p.product_name,
                        "brand_name": p.brand.brand_name,
                        "product_type": p.product_type.product_type,
                        "price": detail.selling_price,
                        "thumbnail_image": request.build_absolute_uri(f"/media/{str(p.thumbnail_image).lstrip('/')}") if p.thumbnail_image else None,
                    }
                )
                if len(shortlisted) >= 5:
                    break

        routine_pool = shortlisted[:5]
        am = routine_pool[:2] if is_hair else routine_pool[:3]
        pm = routine_pool[2:4] if is_hair else routine_pool[3:5]

        if not pm and len(routine_pool) >= 3:
            pm = [routine_pool[-1]]

        return Response(
            {
                "success": True,
                "input": {
                    "skin_type": skin_type,
                    "concern": concern,
                    "budget": budget or "any",
                },
                "routine": {
                    "am": am,
                    "pm": pm,
                    "total_products": len(am) + len(pm),
                },
            }
        )



class ProductListWithFiltersAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):

        # =========================
        # HELPERS
        # =========================
        def get_list(param):
            value = request.GET.get(param, "")
            return value.split(",") if value else []

        # =========================
        # SLUG LOGIC
        # =========================
        query_params = request.GET.copy()

        # remove `filter` key before checking
        query_params.pop("filter", None)
        
        filter_value = request.GET.get("filter", "")
        if query_params and not Brand.objects.filter(
                slug__iexact=filter_value
            ).exists():
            slug = ""
        else:
          slug = filter_value.lower() if filter_value else ""

        print("Slug:", slug)
        print(Brand.objects.filter(
            slug__icontains=filter_value
        ).exists())

        # =====================================================
        # BASE PRODUCT QUERYSET
        # =====================================================
        products = Product.objects.filter(is_deleted=False)

        # =====================================================
        # APPLY SINGLE FILTER (SAME AS FilterProductsAPIView)
        # =====================================================
        if slug:

            if slug == "all":
                pass

            elif slug == "hair":
                products = products.filter(hair_concern__isnull=False)

            elif slug == "skin":
                products = products.filter(skin_concern__isnull=False)

            elif Brand.objects.filter(slug=slug, is_deleted=False).exists():
                products = products.filter(brand__slug=slug)

            elif Categories.objects.filter(slug=slug, is_deleted=False).exists():
                products = products.filter(categorie__slug=slug)

            elif ProductType.objects.filter(slug=slug, is_deleted=False).exists():
                products = products.filter(product_type__slug=slug)

            elif SkinConcerns.objects.filter(slug=slug, is_deleted=False).exists():
                products = products.filter(skin_concern__slug=slug)

            elif HairConcerns.objects.filter(slug=slug, is_deleted=False).exists():
                products = products.filter(hair_concern__slug=slug)

            elif Ingredients.objects.filter(slug=slug, is_deleted=False).exists():
                products = products.filter(ingredient__slug=slug)

            else:
                return Response(
                    {"error": "Invalid filter slug"},
                    status=404
                )

        # =====================================================
        # EXISTING MULTI FILTERS (UNCHANGED)
        # =====================================================
        current_hair = get_list("hair_concern")
        current_skin = get_list("skin_concern")
        current_ingredient = get_list("ingredient")
        current_product_type = get_list("product_type")
        current_brand = get_list("brand")

        if current_hair:
            products = products.filter(hair_concern__slug__in=current_hair)

        if current_skin:
            products = products.filter(skin_concern__slug__in=current_skin)

        if current_ingredient:
            products = products.filter(ingredient__slug__in=current_ingredient)

        if current_product_type:
            products = products.filter(product_type__slug__in=current_product_type)

        if current_brand:
            products = products.filter(brand__slug__in=current_brand)

        # =====================================================
        # PRICE FILTER (SAFE)
        # =====================================================
        min_price = request.GET.get("min_price")
        max_price = request.GET.get("max_price")

        if min_price or max_price:
            price_q = Q(is_deleted=False)

            if min_price:
                price_q &= Q(selling_price__gte=min_price)
            if max_price:
                price_q &= Q(selling_price__lte=max_price)

            product_ids = ProductDetails.objects.filter(
                price_q
            ).values_list("product_id", flat=True)

            products = products.filter(id__in=product_ids)

        # =====================================================
        # ANNOTATIONS + PREFETCH (SAME AS FILTER API)
        # =====================================================
        products = products.annotate(
            avg_rating_value=Avg(
                "reviews__rating",
                filter=Q(reviews__is_deleted=False)
            ),
            total_reviews=Count(
                "reviews",
                filter=Q(reviews__is_deleted=False),
                distinct=True
            )
        )

        reviews_prefetch = Prefetch(
            "reviews",
            queryset=ProductReview.objects.filter(
                is_deleted=False
            ).select_related("user"),
            to_attr="all_reviews"
        )

        products = products.select_related(
            "brand", "categorie", "product_type"
        ).prefetch_related(
            "skin_concern",
            "hair_concern",
            "ingredient",
            Prefetch(
                "product_details",
                queryset=ProductDetails.objects.filter(is_deleted=False)
            ),
            Prefetch(
                "images",
                queryset=ProductImage.objects.filter(is_deleted=False)
            ),
            reviews_prefetch
        ).distinct()

        # =====================================================
        # FILTER OPTIONS (YOUR EXISTING LOGIC – UNCHANGED)
        # =====================================================
        # ⬇️ keep your get_applicable_filter_options exactly as-is here
        def get_applicable_filter_options(
            model_class,
            filter_field,
            current_selections,
            all_current_filters
         ):
            """
            Returns list of filter options with correct 'applicable' status.
            Always returns all options (never hides any).
            """

            # Base queryset: all non-deleted products
            base_qs = Product.objects.filter(is_deleted=False)

            # Apply ALL other current filters (except the one we're calculating)
            qs = base_qs
            for param, values in all_current_filters.items():
                if param != filter_field and values:
                    qs = qs.filter(**{f"{param}__slug__in": values})

            # Get set of applicable related object IDs after applying other filters
            applicable_ids = (
                set(
                    qs.values_list(f"{filter_field}__id", flat=True).distinct()
                )
                if qs.exists()
                else set()
            )

            # Fetch all objects from the model
            all_objects = model_class.objects.filter(
                is_deleted=False
            ).order_by("id")

            options = []

            for obj in all_objects:

                # Get display name properly
                if hasattr(obj, "name"):
                    name = obj.name
                elif hasattr(obj, "brand_name"):
                    name = obj.brand_name
                elif hasattr(obj, "product_type"):
                    name = obj.product_type
                elif hasattr(obj, "ingredient"):
                    name = obj.ingredient
                elif hasattr(obj, "hair_concern"):
                    name = obj.hair_concern
                elif hasattr(obj, "skin_concern"):
                    name = obj.skin_concern
                else:
                    name = str(obj)

                # Determine if this option is applicable
                is_applicable = obj.id in applicable_ids

                # If no filters are applied at all → everything is applicable
                if not request.GET:
                    is_applicable = True

                # Crucial: If this option is currently selected, keep it applicable
                # (prevents disabling the last selected filter)
                if current_selections and obj.slug in current_selections:
                    is_applicable = True

                options.append({
                    "id": obj.id,
                    "name": name,
                    "slug": obj.slug,
                    "applicable": is_applicable
                })

            return options

      

        filters = {
            "hair_concerns": get_applicable_filter_options(
                HairConcerns, "hair_concern", current_hair, {
                    "hair_concern": current_hair,
                    "skin_concern": current_skin,
                    "ingredient": current_ingredient,
                    "product_type": current_product_type,
                    "brand": current_brand,
                }
            ),
            "skin_concerns": get_applicable_filter_options(
                SkinConcerns, "skin_concern", current_skin, {
                    "hair_concern": current_hair,
                    "skin_concern": current_skin,
                    "ingredient": current_ingredient,
                    "product_type": current_product_type,
                    "brand": current_brand,
                }
            ),
            "ingredients": get_applicable_filter_options(
                Ingredients, "ingredient", current_ingredient, {
                    "hair_concern": current_hair,
                    "skin_concern": current_skin,
                    "ingredient": current_ingredient,
                    "product_type": current_product_type,
                    "brand": current_brand,
                }
            ),
            "product_types": get_applicable_filter_options(
                ProductType, "product_type", current_product_type, {
                    "hair_concern": current_hair,
                    "skin_concern": current_skin,
                    "ingredient": current_ingredient,
                    "product_type": current_product_type,
                    "brand": current_brand,
                }
            ),
            "brands": get_applicable_filter_options(
                Brand, "brand", current_brand, {
                    "hair_concern": current_hair,
                    "skin_concern": current_skin,
                    "ingredient": current_ingredient,
                    "product_type": current_product_type,
                    "brand": current_brand,
                }
            ),
        }

        # =====================================================
        # PAGINATION
        # =====================================================
        try:
            limit = int(request.GET.get("limit", 12))
        except (TypeError, ValueError):
            limit = 12
        try:
            offset = int(request.GET.get("offset", 0))
        except (TypeError, ValueError):
            offset = 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        total_count = products.count()
        paginated_products = products[offset: offset + limit]

        # =====================================================
        # RESPONSE
        # =====================================================
        serializer = ProductListSerializer(
            paginated_products,
            many=True,
            context={"request": request}
        )

        return Response({
            "success": True,
            "filters": filters,
            "products": {
                "count": total_count,
                "limit": limit,
                "offset": offset,
                "results": serializer.data
            }
        })

        
class FilterProductsAPIView(APIView):
    
    def get(self, request):
        slug = request.query_params.get('filter', None)
        
        if not slug:
            return Response(
                {"error": "Please provide a 'filter' parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start with base queryset - exclude deleted products
        products = Product.objects.filter(is_deleted=False)
        
        # Build filter query
        filter_query = Q()
        filter_type = None
        
        # Check for 'all' filter to return all products
        if slug.lower() == 'all':
            filter_type = "all"
        
        # Check which model the slug belongs to
        elif Brand.objects.filter(slug=slug, is_deleted=False).exists():
            filter_query = Q(brand__slug=slug)
            filter_type = "brand"
        
        elif Categories.objects.filter(slug=slug, is_deleted=False).exists():
            filter_query = Q(categorie__slug=slug)
            filter_type = "category"
        
        elif ProductType.objects.filter(slug=slug, is_deleted=False).exists():
            filter_query = Q(product_type__slug=slug)
            filter_type = "product_type"
        
        elif SkinConcerns.objects.filter(slug=slug, is_deleted=False).exists():
            filter_query = Q(skin_concern__slug=slug)
            filter_type = "skin_concern"
        
        elif HairConcerns.objects.filter(slug=slug, is_deleted=False).exists():
            filter_query = Q(hair_concern__slug=slug)
            filter_type = "hair_concern"
        
        elif Ingredients.objects.filter(slug=slug, is_deleted=False).exists():
            filter_query = Q(ingredient__slug=slug)
            filter_type = "ingredient"
        
        else:
            return Response(
                {"error": "No matching brand, category, product type, or concern found for this slug"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Apply filter only if it's not 'all'
        if filter_type != "all":
            products = products.filter(filter_query)
        
        # Additional filters (optional) - MUST BE APPLIED BEFORE ANY SLICING
        trending = request.query_params.get('trending', None)
        best_seller = request.query_params.get('best_seller', None)
        min_price = request.query_params.get('min_price', None)
        max_price = request.query_params.get('max_price', None)
        
        if trending and trending.lower() == 'true':
            products = products.filter(trending_product=True)
        
        if best_seller and best_seller.lower() == 'true':
            products = products.filter(best_seller=True)
        
        # Handle price filtering differently for ManyToMany relations
        if min_price or max_price:
            # Create a subquery for products with details matching price criteria
            from django.db.models import Exists
            
            price_filter = Q()
            if min_price:
                price_filter &= Q(product_details__selling_price__gte=min_price)
            if max_price:
                price_filter &= Q(product_details__selling_price__lte=max_price)
            
            # Get product IDs that match price criteria
            product_ids_with_price = ProductDetails.objects.filter(
                price_filter & Q(is_deleted=False)
            ).values_list('product_id', flat=True).distinct()
            
            # Filter products by those IDs
            products = products.filter(id__in=product_ids_with_price)
        
        # Annotate with review statistics for better performance
        products = products.annotate(
            avg_rating_value=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
            total_reviews=Count('reviews', filter=Q(reviews__is_deleted=False))
        )
        
        # Create a Prefetch queryset for reviews WITHOUT slicing
        # Instead, we'll handle the "latest 3" in the serializer
        reviews_prefetch = Prefetch(
            'reviews',
            queryset=ProductReview.objects.filter(is_deleted=False).select_related('user'),
            to_attr='all_reviews'  # Use a different attribute name to avoid conflict
        )
        
        # Optimize query with select_related and prefetch_related
        products = products.select_related(
            'brand',
            'categorie',
            'product_type'
        ).prefetch_related(
            'skin_concern',
            'hair_concern',
            'ingredient',
            Prefetch('product_details', queryset=ProductDetails.objects.filter(is_deleted=False)),
            Prefetch('images', queryset=ProductImage.objects.filter(is_deleted=False)),
            reviews_prefetch  # Use the prefetch we created
        ).distinct()
        
        # Serialize and return - pass request context for full URLs
        serializer = ProductListSerializer(
            products, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            "filter_type": filter_type,
            "slug": slug,
            "count": products.count(),
            "products": serializer.data
        }, status=status.HTTP_200_OK)
    
   


from django.db.models import Avg, Count, Min, Max, Q


class ProductDetailAPIView(APIView):
    """
    Ultra-fast Product Detail API by slug
    Returns complete product information with minimal database queries
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            # Main optimized query
            product = Product.objects.select_related(
                'brand',
                'product_type',
                'categorie'
            ).prefetch_related(
                'skin_concern',
                'hair_concern',
                'ingredient',
                'product_details',
                'images',
                'reviews__images',
                'reviews__user'
            ).annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
                review_count=Count('reviews__id', filter=Q(reviews__is_deleted=False), distinct=True),
                min_price=Min('product_details__selling_price', filter=Q(product_details__is_deleted=False)),
                max_price=Max('product_details__selling_price', filter=Q(product_details__is_deleted=False)),
            ).get(
                slug=slug,
                is_deleted=False
            )
        except Product.DoesNotExist:
            return Response(
                {"success": False, "error": "Product not found or has been removed."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Helper to build absolute media URLs
        def get_image_url(image_field):
            if not image_field:
                return None
            relative_path = str(image_field)
            if relative_path.startswith('/'):
                relative_path = relative_path[1:]
            return request.build_absolute_uri(f'/media/{relative_path}')

        # Main images
        thumbnail_url = get_image_url(product.thumbnail_image)
        hover_url = get_image_url(product.hover_image)

        # Gallery images
        gallery_images = [
            get_image_url(img.image)
            for img in product.images.filter(is_deleted=False).order_by('id')
        ]

        # Product variants/details
        product_details_list = []
        for detail in product.product_details.filter(is_deleted=False):
            product_details_list.append({
                'id': detail.id,
                'product_weight': detail.product_weight,
                'weight_type': detail.weight_type,
                'combo': detail.combo,
                'original_price': detail.original_price,
                'selling_price': detail.selling_price,
                'discount_price': detail.discount_price,
                'available_stock_count': detail.available_stock_count,
            })

        # Concerns & Ingredients
        skin_concerns = list(
            product.skin_concern.filter(is_deleted=False)
            .values('id', 'skin_concern', 'slug')
        )

        hair_concerns = list(
            product.hair_concern.filter(is_deleted=False)
            .values('id', 'hair_concern', 'slug')
        )

        ingredients = list(
            product.ingredient.filter(is_deleted=False)
            .values('id', 'ingredient', 'slug')  # Fixed: 'ingredient' is the correct field name
        )

        # Latest 10 reviews (for performance)
        latest_reviews = product.reviews.filter(is_deleted=False).order_by('-created_at')[:10]
        reviews_list = []

        for review in latest_reviews:
            review_images = [
                get_image_url(img.image) for img in review.images.all()
            ]
            reviewer_name = (
                review.reviewer_name or
                (review.user.get_full_name() if review.user else "Anonymous")
            )

            reviews_list.append({
                'id': review.id,
                'reviewer_name': reviewer_name,
                'rating': review.rating,
                'review_text': review.review_text or "",
                'created_at': review.created_at.isoformat(),
                'images': review_images
            })

        # Build final product data
        product_data = {
            'id': product.id,
            'product_name': product.product_name,
            'slug': product.slug,
            'product_description': product.product_description or "",
            'key_benefits': product.key_benefits or [],
            'key_ingredients': product.key_ingredients or [],
            'how_to_use': product.how_to_use or [],
            'trending_product': product.trending_product,
            'best_seller': product.best_seller,
            'created_at': product.created_at.isoformat(),

            # Relations
            'brand': {
                'id': product.brand.id,
                'brand_name': product.brand.brand_name,
                'slug': getattr(product.brand, 'slug', None)
            },
            'category': {
                'id': product.categorie.id,
                'name': product.categorie.categorie,
                'slug': getattr(product.categorie, 'slug', None)
            },
            'product_type': {
                'id': product.product_type.id,
                'name': product.product_type.product_type,
                'slug': getattr(product.product_type, 'slug', None)
            },

            # Images
            'thumbnail_image': thumbnail_url,
            'hover_image': hover_url,
            'gallery_images': gallery_images,

            # Pricing & Stats
            'min_price': product.min_price or 0,
            'max_price': product.max_price or 0,
            'avg_rating': round(product.avg_rating, 1) if product.avg_rating else 0.0,
            'review_count': product.review_count or 0,

            # Variants
            'product_details': product_details_list,

            # Tags
            'skin_concerns': skin_concerns,
            'hair_concerns': hair_concerns,
            'ingredients': ingredients,

            # Reviews
            'reviews': {
                'data': reviews_list,
                'total_count': product.review_count or 0,
                'avg_rating': round(product.avg_rating, 1) if product.avg_rating else 0.0
            }
        }

        return Response({
            'success': True,
            'product': product_data
        }, status=status.HTTP_200_OK)
        

from .serializers import (
    HairConcernSerializer,
    SkinConcernSerializer,
    IngredientSerializer,
    ProductTypeSerializer
)
class ProductSideMenuAPIView(APIView):
    def get(self, request):
        hair_concerns = HairConcerns.objects.filter(is_deleted=False)
        skin_concerns = SkinConcerns.objects.filter(is_deleted=False)
        ingredients = Ingredients.objects.filter(is_deleted=False)
        product_types = ProductType.objects.filter(is_deleted=False)

        return Response({
            "hair_concerns": HairConcernSerializer(hair_concerns, many=True).data,
            "skin_concerns": SkinConcernSerializer(skin_concerns, many=True).data,
            "ingredients": IngredientSerializer(ingredients, many=True).data,
            "product_types": ProductTypeSerializer(product_types, many=True).data,
        })
