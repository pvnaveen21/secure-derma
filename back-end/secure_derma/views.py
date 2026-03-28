from datetime import date, timedelta
import hashlib
import hmac
import re
import uuid

import requests
from config.env import env_str
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.validators import validate_email
from django.db import transaction
from banner_images.models import ImageFile
from brand.models import Brand
from categorie.models import Categories
from hair_concern.models import HairConcerns
from ingredient.models import Ingredients
from product.models import Product, ProductDetails, ProductImage, ProductReview, ProductReviewImage
from product.serializers import CollectionProductListSerializer, ProductListSerializer
from product_type.models import ProductType
from django.db.models import Prefetch, Avg, Count, Min, Q, F, Sum, OuterRef, Subquery, IntegerField, Value, CharField
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from skin_concern.models import SkinConcerns
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import OrderStatus, PaymentStatus, SecureDermaCartItem, SecureDermaNewsletterSubscriber, SecureDermaOrder, SecureDermaOrderItem, SecureDermaPayment
from .pincode_service import (
    PincodeLookupError,
    check_pincode_serviceability,
    check_pincode_serviceability_for_coordinates,
)
from .order_email import get_order_recipient, send_order_confirmation_email
from .serializers import NewsletterSubscriberSerializer


FILTER_OPTION_NAME_FIELDS = {
    Brand: "brand_name",
    ProductType: "product_type",
    Ingredients: "ingredient",
    HairConcerns: "hair_concern",
    SkinConcerns: "skin_concern",
}


def _build_media_url(request, stored_file):
    if not stored_file:
        return ""

    try:
        if hasattr(stored_file, 'url'):
            file_url = stored_file.url
        else:
            file_url = default_storage.url(str(stored_file).lstrip('/'))
    except Exception:
        return ""

    if file_url.startswith(('http://', 'https://')):
        return file_url

    return request.build_absolute_uri(file_url)


def _build_quality_label(detail):
    if not detail:
        return ""

    weight = str(getattr(detail, "product_weight", "") or "").strip()
    weight_type = str(getattr(detail, "weight_type", "") or "").strip()
    combo = getattr(detail, "combo", 1) or 1

    unit_label = " ".join(part for part in [weight, weight_type] if part).strip()
    if combo > 1 and unit_label:
        return f"{combo} x {unit_label}"
    return unit_label


def _resolve_filter_slug_type(slug: str):
    slug_queries = [
        Brand.objects.filter(slug=slug, is_deleted=False).annotate(
            match_type=Value("brand", output_field=CharField())
        ).values_list("match_type", flat=True),
        Categories.objects.filter(slug=slug, is_deleted=False).annotate(
            match_type=Value("category", output_field=CharField())
        ).values_list("match_type", flat=True),
        ProductType.objects.filter(slug=slug, is_deleted=False).annotate(
            match_type=Value("product_type", output_field=CharField())
        ).values_list("match_type", flat=True),
        SkinConcerns.objects.filter(slug=slug, is_deleted=False).annotate(
            match_type=Value("skin_concern", output_field=CharField())
        ).values_list("match_type", flat=True),
        HairConcerns.objects.filter(slug=slug, is_deleted=False).annotate(
            match_type=Value("hair_concern", output_field=CharField())
        ).values_list("match_type", flat=True),
        Ingredients.objects.filter(slug=slug, is_deleted=False).annotate(
            match_type=Value("ingredient", output_field=CharField())
        ).values_list("match_type", flat=True),
    ]
    matches = list(slug_queries[0].union(*slug_queries[1:], all=True)[:1])
    return matches[0] if matches else None


def _serialize_cart_items(request, cart_items):
    results = []
    total_quantity = 0
    subtotal = 0

    for item in cart_items:
        detail = item.product_detail
        product = item.product
        line_total = detail.selling_price * item.quantity
        total_quantity += item.quantity
        subtotal += line_total
        results.append(
            {
                "id": item.id,
                "productId": product.id,
                "productName": product.product_name,
                "thumbnail": _build_media_url(request, product.thumbnail_image),
                "productWeight": detail.product_weight,
                "weightType": detail.weight_type,
                "qualityLabel": _build_quality_label(detail),
                "price": detail.selling_price,
                "originalPrice": detail.original_price,
                "discountPrice": detail.discount_price,
                "detailId": detail.id,
                "quantity": item.quantity,
                "availableStockCount": detail.available_stock_count,
                "lineTotal": line_total,
            }
        )

    return {
        "items": results,
        "count": len(results),
        "total_quantity": total_quantity,
        "subtotal": subtotal,
    }


def _get_user_cart_queryset(user):
    return (
        SecureDermaCartItem.objects
        .filter(user=user)
        .select_related("product", "product_detail")
        .order_by("-created_at")
    )


def _get_cart_detail_map(detail_ids):
    details = ProductDetails.objects.select_related("product").filter(
        id__in=detail_ids,
        is_deleted=False,
        product__is_deleted=False,
    )
    return {detail.id: detail for detail in details}


def _normalize_cart_quantity(raw_quantity, default=1):
    try:
        quantity = int(raw_quantity if raw_quantity is not None else default)
    except (TypeError, ValueError):
        return None
    if quantity < 1 or quantity > 10:
        return None
    return quantity


def _normalize_customer_payload(raw_customer):
    customer = raw_customer if isinstance(raw_customer, dict) else {}

    normalized_customer = {
        "name": re.sub(r"\s+", " ", str(customer.get("name", "") or "")).strip(),
        "email": str(customer.get("email", "") or "").strip().lower(),
        "contact": re.sub(r"\D", "", str(customer.get("contact", "") or ""))[:10],
        "address": re.sub(r"\s+", " ", str(customer.get("address", "") or "")).strip(),
        "address_line_2": re.sub(r"\s+", " ", str(customer.get("address_line_2", "") or "")).strip(),
        "city": re.sub(r"\s+", " ", str(customer.get("city", "") or "")).strip(),
        "state": re.sub(r"\s+", " ", str(customer.get("state", "") or "")).strip(),
        "postal_code": re.sub(r"\D", "", str(customer.get("postal_code", "") or ""))[:6],
    }

    name_pattern = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,79}$")
    location_pattern = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,79}$")

    if not name_pattern.fullmatch(normalized_customer["name"]):
        raise ValueError("Enter a valid customer name.")

    if normalized_customer["email"]:
        try:
            validate_email(normalized_customer["email"])
        except ValidationError as exc:
            raise ValueError("Enter a valid customer email address.") from exc

    if not re.fullmatch(r"^[6-9]\d{9}$", normalized_customer["contact"]):
        raise ValueError("Enter a valid 10-digit mobile number.")

    if len(normalized_customer["address"]) < 10 or len(normalized_customer["address"]) > 255:
        raise ValueError("Enter a complete delivery address.")

    if len(normalized_customer["address_line_2"]) > 255:
        raise ValueError("Address line 2 is too long.")

    if not location_pattern.fullmatch(normalized_customer["city"]):
        raise ValueError("Enter a valid city.")

    if not location_pattern.fullmatch(normalized_customer["state"]):
        raise ValueError("Enter a valid state.")

    if not re.fullmatch(r"^\d{6}$", normalized_customer["postal_code"]):
        raise ValueError("Enter a valid 6-digit postal code.")

    return normalized_customer


class SecureDermaCartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        cart_items = list(_get_user_cart_queryset(request.user))
        return Response(_serialize_cart_items(request, cart_items))

    def delete(self, request, *args, **kwargs):
        _get_user_cart_queryset(request.user).delete()
        return Response({"cleared": True, "items": [], "count": 0, "total_quantity": 0, "subtotal": 0})


class SecureDermaCartSyncAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        payload_items = request.data.get("items", [])
        if not isinstance(payload_items, list):
            return Response({"detail": "Cart items must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        normalized_items = []
        detail_ids = []
        for item in payload_items:
            detail_id = item.get("detailId")
            quantity = _normalize_cart_quantity(item.get("quantity"), default=1)
            if detail_id is None or quantity is None:
                return Response({"detail": "Invalid guest cart payload."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                detail_id = int(detail_id)
            except (TypeError, ValueError):
                return Response({"detail": "Invalid detail id in guest cart payload."}, status=status.HTTP_400_BAD_REQUEST)

            normalized_items.append({"detail_id": detail_id, "quantity": quantity})
            detail_ids.append(detail_id)

        detail_map = _get_cart_detail_map(detail_ids)
        existing_items = {
            item.product_detail_id: item
            for item in _get_user_cart_queryset(request.user)
        }
        skipped_items = []

        with transaction.atomic():
            for item in normalized_items:
                detail = detail_map.get(item["detail_id"])
                if not detail:
                    skipped_items.append({"detailId": item["detail_id"], "reason": "missing"})
                    continue

                if detail.available_stock_count < 1:
                    skipped_items.append({"detailId": item["detail_id"], "reason": "out_of_stock"})
                    continue

                existing_item = existing_items.get(detail.id)
                merged_quantity = item["quantity"] + (existing_item.quantity if existing_item else 0)
                merged_quantity = min(merged_quantity, 10, detail.available_stock_count)

                if existing_item:
                    existing_item.quantity = merged_quantity
                    existing_item.save(update_fields=["quantity", "updated_at"])
                else:
                    existing_items[detail.id] = SecureDermaCartItem.objects.create(
                        user=request.user,
                        product=detail.product,
                        product_detail=detail,
                        quantity=merged_quantity,
                    )

        cart_items = list(_get_user_cart_queryset(request.user))
        response_data = _serialize_cart_items(request, cart_items)
        response_data["synced"] = True
        response_data["skipped_items"] = skipped_items
        return Response(response_data)


class SecureDermaCartItemAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        detail_id = request.data.get("detailId")
        quantity = _normalize_cart_quantity(request.data.get("quantity"), default=1)

        if detail_id is None or quantity is None:
            return Response({"detail": "detailId and a quantity between 1 and 10 are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            detail_id = int(detail_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid detailId."}, status=status.HTTP_400_BAD_REQUEST)

        detail = _get_cart_detail_map([detail_id]).get(detail_id)
        if not detail:
            return Response({"detail": "Product detail not found."}, status=status.HTTP_404_NOT_FOUND)

        if detail.available_stock_count < 1:
            return Response({"detail": "This item is out of stock."}, status=status.HTTP_409_CONFLICT)

        cart_item = _get_user_cart_queryset(request.user).filter(product_detail_id=detail_id).first()
        new_quantity = quantity + (cart_item.quantity if cart_item else 0)

        if new_quantity > 10:
            return Response({"detail": "Quantity cannot exceed 10 for a single cart item."}, status=status.HTTP_400_BAD_REQUEST)

        if detail.available_stock_count < new_quantity:
            return Response({"detail": "Requested quantity exceeds available stock."}, status=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            if cart_item:
                cart_item.quantity = new_quantity
                cart_item.save(update_fields=["quantity", "updated_at"])
            else:
                SecureDermaCartItem.objects.create(
                    user=request.user,
                    product=detail.product,
                    product_detail=detail,
                    quantity=new_quantity,
                )

        return Response(_serialize_cart_items(request, list(_get_user_cart_queryset(request.user))))

    def patch(self, request, detail_id, *args, **kwargs):
        quantity = _normalize_cart_quantity(request.data.get("quantity"))
        if quantity is None:
            return Response({"detail": "A quantity between 1 and 10 is required."}, status=status.HTTP_400_BAD_REQUEST)

        cart_item = _get_user_cart_queryset(request.user).filter(product_detail_id=detail_id).first()
        if not cart_item:
            return Response({"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        if cart_item.product_detail.available_stock_count < quantity:
            return Response({"detail": "Requested quantity exceeds available stock."}, status=status.HTTP_409_CONFLICT)

        cart_item.quantity = quantity
        cart_item.save(update_fields=["quantity", "updated_at"])
        return Response(_serialize_cart_items(request, list(_get_user_cart_queryset(request.user))))

    def delete(self, request, detail_id, *args, **kwargs):
        deleted, _ = _get_user_cart_queryset(request.user).filter(product_detail_id=detail_id).delete()
        if not deleted:
            return Response({"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_cart_items(request, list(_get_user_cart_queryset(request.user))))


class PincodeServiceabilityAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        pincode = request.query_params.get("pincode", "")

        try:
            result = check_pincode_serviceability(pincode)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except PincodeLookupError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(result)


class CurrentLocationPincodeAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            latitude = float(request.query_params.get("lat", ""))
            longitude = float(request.query_params.get("lng", ""))
        except (TypeError, ValueError):
            return Response({"detail": "Valid lat and lng query parameters are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = check_pincode_serviceability_for_coordinates(latitude, longitude)
        except PincodeLookupError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)

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
            "id", "brand_name", "brand_image", "brand_description"
        )

        grouped_data = {}

        for brand in queryset:
            name = brand["brand_name"].strip()
            first_char = name[0].upper()

            if not first_char.isalpha():
                first_char = "A"

            image = brand["brand_image"]
            image_url = _build_media_url(request, image)

            grouped_data.setdefault(first_char, []).append({
                "id": brand["id"],
                "brand_name": name,
                "brand_image": image_url,
                "brand_description": (brand.get("brand_description") or "").strip(),
            })

        return Response(grouped_data)
    
@method_decorator(cache_page(60 * 15), name='dispatch')
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
                brand['brand_image'] = _build_media_url(request, brand['brand_image']) or None
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
                product_type['image'] = _build_media_url(request, product_type['image']) or None
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
                img['image'] = _build_media_url(request, img['image']) or None
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
                img['image'] = _build_media_url(request, img['image']) or None
            else:
                img['image'] = None

        return Response({
            'images': images_list,
            'count': len(images_list)
        })


class RazorpayCreateOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        razorpay_key_id = env_str("RAZORPAY_KEY_ID", default="")
        razorpay_key_secret = env_str("RAZORPAY_KEY_SECRET", default="")

        if not razorpay_key_id or not razorpay_key_secret:
            return Response(
                {"detail": "Razorpay credentials are not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        cart_items = request.data.get("items", [])
        if not isinstance(cart_items, list) or not cart_items:
            return Response(
                {"detail": "Cart items are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_items = []
        detail_ids = []

        for item in cart_items:
            detail_id = item.get("detailId")
            quantity = item.get("quantity", 1)

            if not detail_id:
                return Response(
                    {"detail": "Each cart item must include detailId."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                detail_id = int(detail_id)
                quantity = int(quantity)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Invalid cart item payload."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if quantity < 1 or quantity > 10:
                return Response(
                    {"detail": "Quantity must be between 1 and 10."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            normalized_items.append({"detail_id": detail_id, "quantity": quantity})
            detail_ids.append(detail_id)

        details = ProductDetails.objects.select_related("product").filter(
            id__in=detail_ids,
            is_deleted=False,
            product__is_deleted=False,
        )
        detail_map = {detail.id: detail for detail in details}

        missing_detail_ids = [item["detail_id"] for item in normalized_items if item["detail_id"] not in detail_map]
        if missing_detail_ids:
            return Response(
                {"detail": f"Some cart items are no longer available: {missing_detail_ids}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount_rupees = 0
        cart_summary = []

        for item in normalized_items:
            detail = detail_map[item["detail_id"]]
            quantity = item["quantity"]

            if detail.available_stock_count < quantity:
                return Response(
                    {
                        "detail": (
                            f"Only {detail.available_stock_count} item(s) left for "
                            f"{detail.product.product_name}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            line_total = detail.selling_price * quantity
            amount_rupees += line_total
            cart_summary.append(
                {
                    "product_id": detail.product_id,
                    "detail_id": detail.id,
                    "product_name": detail.product.product_name,
                    "product_weight": detail.product_weight,
                    "weight_type": detail.weight_type,
                    "quality_label": _build_quality_label(detail),
                    "quantity": quantity,
                    "unit_price": detail.selling_price,
                    "line_total": line_total,
                }
            )

        if amount_rupees <= 0:
            return Response(
                {"detail": "Order amount must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount_paise = amount_rupees * 100
        receipt = f"securederma_{uuid.uuid4().hex[:20]}"

        try:
            customer = _normalize_customer_payload(request.data.get("customer"))
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = {
            "customer_name": customer["name"][:255],
            "customer_email": customer["email"][:255],
            "customer_phone": customer["contact"][:20],
            "customer_postal_code": customer["postal_code"][:10],
        }

        shipping_details = {
            "shipping_name": customer["name"][:255],
            "shipping_address": customer["address"][:255],
            "shipping_landmark": customer["address_line_2"][:255],
            "shipping_city": customer["city"][:100],
            "shipping_pincode": customer["postal_code"][:10],
            "shipping_state": customer["state"][:100],
            "shipping_provider": "manual-checkout",
        }

        try:
            shipping_route = check_pincode_serviceability(customer["postal_code"])
            shipping_details["shipping_provider"] = str(
                shipping_route.get("provider_name") or shipping_details["shipping_provider"]
            )[:100]
        except (ValueError, PincodeLookupError):
            pass

        response = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(razorpay_key_id, razorpay_key_secret),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": notes,
            },
            timeout=15,
        )

        if response.status_code >= 400:
            return Response(
                {
                    "detail": "Failed to create Razorpay order.",
                    "razorpay_error": response.json() if response.content else None,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        razorpay_order = response.json()

        with transaction.atomic():
            order = SecureDermaOrder.objects.create(
                user=request.user if getattr(request.user, "is_authenticated", False) else None,
                order_number=receipt,
                razorpay_order_id=razorpay_order.get("id"),
                amount_rupees=amount_rupees,
                amount_paise=amount_paise,
                currency=razorpay_order.get("currency", "INR"),
                status=OrderStatus.PAYMENT_PENDING,
                customer_name=notes["customer_name"],
                customer_email=notes["customer_email"],
                customer_phone=notes["customer_phone"],
                customer_address=customer["address"][:255],
                customer_address_line_2=customer["address_line_2"][:255],
                customer_city=customer["city"][:100],
                customer_state=customer["state"][:100],
                customer_postal_code=customer["postal_code"][:10],
                shipping_name=shipping_details["shipping_name"],
                shipping_address=shipping_details["shipping_address"],
                shipping_landmark=shipping_details["shipping_landmark"],
                shipping_city=shipping_details["shipping_city"],
                shipping_pincode=shipping_details["shipping_pincode"],
                shipping_state=shipping_details["shipping_state"],
                shipping_provider=shipping_details["shipping_provider"],
                items_snapshot=cart_summary,
            )

            SecureDermaOrderItem.objects.bulk_create(
                [
                    SecureDermaOrderItem(
                        order=order,
                        product_id=item["product_id"],
                        product_detail_id=item["detail_id"],
                        product_name=item["product_name"],
                        quantity=item["quantity"],
                        unit_price=item["unit_price"],
                        line_total=item["line_total"],
                    )
                    for item in cart_summary
                ]
            )

            SecureDermaPayment.objects.create(
                order=order,
                razorpay_order_id=razorpay_order.get("id"),
                status=PaymentStatus.CREATED,
                payload={
                    "razorpay_order_create_response": razorpay_order,
                },
            )

        return Response(
            {
                "key_id": razorpay_key_id,
                "amount": amount_rupees,
                "amount_paise": amount_paise,
                "currency": order.currency,
                "order_id": order.razorpay_order_id,
                "receipt": order.order_number,
                "cart_summary": cart_summary,
            }
        )


class RazorpayVerifyPaymentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        razorpay_key_secret = env_str("RAZORPAY_KEY_SECRET", default="")
        if not razorpay_key_secret:
            return Response(
                {"detail": "Razorpay credentials are not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        razorpay_order_id = str(request.data.get("razorpay_order_id", "")).strip()
        razorpay_payment_id = str(request.data.get("razorpay_payment_id", "")).strip()
        razorpay_signature = str(request.data.get("razorpay_signature", "")).strip()

        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            return Response(
                {"detail": "Missing Razorpay payment verification fields."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        generated_signature = hmac.new(
            razorpay_key_secret.encode(),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        is_valid = hmac.compare_digest(generated_signature, razorpay_signature)
        with transaction.atomic():
            try:
                order = (
                    SecureDermaOrder.objects.select_for_update()
                    .prefetch_related("items")
                    .get(razorpay_order_id=razorpay_order_id)
                )
            except SecureDermaOrder.DoesNotExist:
                return Response(
                    {"detail": "Order not found for the given Razorpay order id."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if order.user_id and order.user_id != request.user.id:
                return Response(
                    {"detail": "You are not allowed to verify this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if order.status == OrderStatus.PAID:
                if order.razorpay_payment_id == razorpay_payment_id:
                    return Response(
                        {
                            "verified": True,
                            "already_processed": True,
                            "order_number": order.order_number,
                            "razorpay_order_id": razorpay_order_id,
                            "razorpay_payment_id": razorpay_payment_id,
                        }
                    )
                return Response(
                    {"detail": "This order is already finalized with a different payment id."},
                    status=status.HTTP_409_CONFLICT,
                )

            if SecureDermaPayment.objects.filter(
                razorpay_payment_id=razorpay_payment_id,
                status=PaymentStatus.VERIFIED,
            ).exists():
                return Response(
                    {"detail": "This Razorpay payment id has already been processed."},
                    status=status.HTTP_409_CONFLICT,
                )

            if not is_valid:
                SecureDermaPayment.objects.create(
                    order=order,
                    razorpay_order_id=razorpay_order_id,
                    razorpay_payment_id=razorpay_payment_id,
                    razorpay_signature=razorpay_signature,
                    status=PaymentStatus.FAILED,
                    payload=request.data,
                )
                order.status = OrderStatus.PAYMENT_FAILED
                order.razorpay_payment_id = razorpay_payment_id
                order.verification_payload = request.data
                order.save(update_fields=["status", "razorpay_payment_id", "verification_payload", "updated_at"])
                return Response(
                    {"detail": "Payment signature verification failed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not order.stock_deducted:
                item_detail_ids = [item.product_detail_id for item in order.items.all()]
                detail_map = {
                    detail.id: detail
                    for detail in ProductDetails.objects.select_for_update().filter(id__in=item_detail_ids)
                }

                for item in order.items.all():
                    detail = detail_map.get(item.product_detail_id)
                    if not detail:
                        return Response(
                            {"detail": f"Product detail {item.product_detail_id} is missing."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if detail.available_stock_count < item.quantity:
                        return Response(
                            {"detail": f"Insufficient stock to finalize {item.product_name}."},
                            status=status.HTTP_409_CONFLICT,
                        )

                for item in order.items.all():
                    detail = detail_map[item.product_detail_id]
                    detail.available_stock_count = F("available_stock_count") - item.quantity
                    detail.save(update_fields=["available_stock_count"])

            SecureDermaPayment.objects.create(
                order=order,
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature,
                status=PaymentStatus.VERIFIED,
                payload=request.data,
            )
            order.status = OrderStatus.PAID
            order.razorpay_payment_id = razorpay_payment_id
            order.stock_deducted = True
            order.verification_payload = request.data
            order.save(
                update_fields=[
                    "status",
                    "razorpay_payment_id",
                    "stock_deducted",
                    "verification_payload",
                    "updated_at",
                ]
            )

            if get_order_recipient(order):
                transaction.on_commit(lambda confirmed_order_id=order.id: _send_order_email_after_commit(confirmed_order_id))

            return Response(
                {
                    "verified": True,
                    "order_number": order.order_number,
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                }
            )


def _send_order_email_after_commit(order_id):
    order = (
        SecureDermaOrder.objects.select_related("user")
        .prefetch_related("items")
        .filter(id=order_id, status=OrderStatus.PAID)
        .first()
    )
    if not order:
        return

    try:
        send_order_confirmation_email(order)
    except Exception:
        return


class AdminOrderSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        paid_orders = SecureDermaOrder.objects.filter(status=OrderStatus.PAID)
        latest_paid_order = paid_orders.order_by("-updated_at").first()

        summary = paid_orders.aggregate(
            total_orders=Count("id"),
            total_revenue=Sum("amount_rupees"),
            average_order_value=Avg("amount_rupees"),
        )

        return Response(
            {
                "summary": {
                    "total_orders": summary["total_orders"] or 0,
                    "total_revenue": summary["total_revenue"] or 0,
                    "average_order_value": round(summary["average_order_value"] or 0, 2),
                    "pending_orders": SecureDermaOrder.objects.filter(status=OrderStatus.PAYMENT_PENDING).count(),
                    "latest_paid_at": latest_paid_order.updated_at if latest_paid_order else None,
                }
            }
        )


def _add_months(value: date, months: int) -> date:
    month_index = (value.month - 1) + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


class AdminOrderAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        grouping = request.query_params.get("grouping", "day").strip().lower() or "day"

        if grouping not in {"day", "month"}:
            return Response(
                {"detail": "Grouping must be either 'day' or 'month'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        default_periods = 14 if grouping == "day" else 12
        max_periods = 90 if grouping == "day" else 24

        try:
            periods = int(request.query_params.get("periods", default_periods))
        except ValueError:
            return Response(
                {"detail": "Periods must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if periods < 1 or periods > max_periods:
            return Response(
                {"detail": f"Periods must be between 1 and {max_periods} for {grouping} grouping."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        paid_orders = SecureDermaOrder.objects.filter(status=OrderStatus.PAID)

        anchor_month_value = request.query_params.get("anchor_month", "").strip()

        if grouping == "day":
            end_date = today
            start_date = end_date - timedelta(days=periods - 1)
            grouped_rows = (
                paid_orders
                .filter(updated_at__date__gte=start_date, updated_at__date__lte=end_date)
                .annotate(period=TruncDate("updated_at"))
                .values("period")
                .annotate(count=Count("id"))
                .order_by("period")
            )

            count_map = {row["period"].isoformat(): row["count"] for row in grouped_rows if row["period"]}
            bucket_dates = [start_date + timedelta(days=index) for index in range(periods)]
            series = [
                {
                    "key": bucket_date.isoformat(),
                    "label": bucket_date.strftime("%d %b %Y"),
                    "short_label": bucket_date.strftime("%d %b"),
                    "count": count_map.get(bucket_date.isoformat(), 0),
                }
                for bucket_date in bucket_dates
            ]
            range_start = start_date
            range_end = end_date
        else:
            if anchor_month_value:
                anchor_match = re.fullmatch(r"(\d{4})-(\d{2})", anchor_month_value)
                if not anchor_match:
                    return Response(
                        {"detail": "anchor_month must be in YYYY-MM format."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                anchor_year = int(anchor_match.group(1))
                anchor_month = int(anchor_match.group(2))
                if anchor_month < 1 or anchor_month > 12:
                    return Response(
                        {"detail": "anchor_month must be in YYYY-MM format."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                end_month = date(anchor_year, anchor_month, 1)
                current_month = today.replace(day=1)
                if end_month > current_month:
                    end_month = current_month
            else:
                end_month = today.replace(day=1)

            start_month = _add_months(end_month, -(periods - 1))
            next_month = _add_months(end_month, 1)
            grouped_rows = (
                paid_orders
                .filter(updated_at__date__gte=start_month, updated_at__date__lt=next_month)
                .annotate(period=TruncMonth("updated_at"))
                .values("period")
                .annotate(count=Count("id"))
                .order_by("period")
            )

            count_map = {}
            for row in grouped_rows:
                raw_period = row.get("period")
                if not raw_period:
                    continue
                period_date = raw_period.date() if hasattr(raw_period, "date") else raw_period
                count_map[period_date.isoformat()] = row["count"]

            bucket_months = [_add_months(start_month, index) for index in range(periods)]
            series = [
                {
                    "key": bucket_month.isoformat(),
                    "label": bucket_month.strftime("%b %Y"),
                    "short_label": bucket_month.strftime("%b"),
                    "count": count_map.get(bucket_month.isoformat(), 0),
                }
                for bucket_month in bucket_months
            ]
            range_start = start_month
            range_end = end_month

        total_orders = sum(point["count"] for point in series)
        peak_orders = max((point["count"] for point in series), default=0)

        return Response(
            {
                "grouping": grouping,
                "periods": periods,
                "range_start": range_start.isoformat(),
                "range_end": range_end.isoformat(),
                "total_orders": total_orders,
                "peak_orders": peak_orders,
                "series": series,
            }
        )


class AdminOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 10)), 100))
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            return Response(
                {"detail": "Invalid pagination values."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        search_text = request.query_params.get("searchText", "").strip()
        status_filter = request.query_params.get("status", "").strip()
        paid_on = request.query_params.get("paid_on", "").strip()

        queryset = (
            SecureDermaOrder.objects.select_related("user")
            .prefetch_related("items", "payments")
            .order_by("-created_at")
        )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if paid_on:
            try:
                paid_on_date = date.fromisoformat(paid_on)
            except ValueError:
                return Response(
                    {"detail": "paid_on must be in YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(updated_at__date=paid_on_date)

        if search_text:
            queryset = queryset.filter(
                Q(order_number__icontains=search_text)
                | Q(razorpay_order_id__icontains=search_text)
                | Q(razorpay_payment_id__icontains=search_text)
                | Q(customer_name__icontains=search_text)
                | Q(customer_email__icontains=search_text)
                | Q(customer_phone__icontains=search_text)
            )

        total_count = queryset.count()
        orders = queryset[offset: offset + limit]

        results = []
        for order in orders:
            item_count = sum(item.quantity for item in order.items.all())
            results.append(
                {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status,
                    "amount_rupees": order.amount_rupees,
                    "currency": order.currency,
                    "customer_name": order.customer_name,
                    "customer_email": order.customer_email,
                    "customer_phone": order.customer_phone,
                    "customer_address": order.customer_address,
                    "customer_address_line_2": order.customer_address_line_2,
                    "customer_city": order.customer_city,
                    "customer_state": order.customer_state,
                    "customer_postal_code": order.customer_postal_code,
                    "razorpay_order_id": order.razorpay_order_id,
                    "razorpay_payment_id": order.razorpay_payment_id,
                    "item_count": item_count,
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                }
            )

        return Response(
            {
                "count": total_count,
                "results": results,
                "limit": limit,
                "offset": offset,
            }
        )


class AdminOrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk, *args, **kwargs):
        try:
            order = (
                SecureDermaOrder.objects.select_related("user")
                .prefetch_related(
                    Prefetch(
                        "items",
                        queryset=SecureDermaOrderItem.objects.select_related("product", "product_detail"),
                    ),
                    "payments",
                )
                .get(pk=pk)
            )
        except SecureDermaOrder.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "amount_rupees": order.amount_rupees,
                "amount_paise": order.amount_paise,
                "currency": order.currency,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "customer_phone": order.customer_phone,
                "customer_address": order.customer_address,
                "customer_address_line_2": order.customer_address_line_2,
                "customer_city": order.customer_city,
                "customer_state": order.customer_state,
                "customer_postal_code": order.customer_postal_code,
                "razorpay_order_id": order.razorpay_order_id,
                "razorpay_payment_id": order.razorpay_payment_id,
                "created_at": order.created_at,
                "updated_at": order.updated_at,
                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_detail_id": item.product_detail_id,
                        "product_name": item.product_name,
                        "thumbnail": _build_media_url(request, item.product.thumbnail_image),
                        "product_weight": item.product_detail.product_weight,
                        "weight_type": item.product_detail.weight_type,
                        "quality_label": _build_quality_label(item.product_detail),
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "line_total": item.line_total,
                    }
                    for item in order.items.all()
                ],
                "payments": [
                    {
                        "id": payment.id,
                        "status": payment.status,
                        "razorpay_order_id": payment.razorpay_order_id,
                        "razorpay_payment_id": payment.razorpay_payment_id,
                        "created_at": payment.created_at,
                        "updated_at": payment.updated_at,
                    }
                    for payment in order.payments.all()
                ],
            }
        )


class UserOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        orders = (
            SecureDermaOrder.objects.filter(user=request.user, status=OrderStatus.PAID)
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=SecureDermaOrderItem.objects.select_related("product", "product_detail"),
                )
            )
            .order_by("-created_at")
        )

        results = []
        for order in orders:
            order_items = list(order.items.all())
            item_count = sum(item.quantity for item in order_items)
            savings = sum(
                max((item.product_detail.original_price or item.unit_price) - item.unit_price, 0) * item.quantity
                for item in order_items
            )

            results.append(
                {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status,
                    "amount_rupees": order.amount_rupees,
                    "currency": order.currency,
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                    "item_count": item_count,
                    "savings_rupees": savings,
                    "shipping": {
                        "name": order.shipping_name or order.customer_name,
                        "address": order.shipping_address or order.customer_address,
                        "landmark": order.shipping_landmark,
                        "city": order.shipping_city or order.customer_city,
                        "state": order.shipping_state or order.customer_state,
                        "pincode": order.shipping_pincode or order.customer_postal_code,
                    },
                    "items": [
                        {
                            "id": item.id,
                            "product_id": item.product_id,
                            "product_detail_id": item.product_detail_id,
                            "product_name": item.product_name,
                            "product_slug": item.product.slug,
                            "thumbnail": _build_media_url(request, item.product.thumbnail_image),
                            "product_weight": item.product_detail.product_weight,
                            "weight_type": item.product_detail.weight_type,
                            "quality_label": _build_quality_label(item.product_detail),
                            "quantity": item.quantity,
                            "unit_price": item.unit_price,
                            "line_total": item.line_total,
                            "original_price": item.product_detail.original_price,
                        }
                        for item in order_items
                    ],
                }
            )

        return Response(
            {
                "count": len(results),
                "results": results,
            }
        )


class UserOrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            order = (
                SecureDermaOrder.objects.filter(user=request.user, status=OrderStatus.PAID)
                .prefetch_related(
                    Prefetch(
                        "items",
                        queryset=SecureDermaOrderItem.objects.select_related("product", "product_detail"),
                    ),
                    "payments",
                )
                .get(pk=pk)
            )
        except SecureDermaOrder.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        order_items = list(order.items.all())
        verified_payment = next(
            (payment for payment in order.payments.all() if payment.status == PaymentStatus.VERIFIED),
            order.payments.first(),
        )
        original_total = sum((item.product_detail.original_price or item.unit_price) * item.quantity for item in order_items)
        savings = sum(
            max((item.product_detail.original_price or item.unit_price) - item.unit_price, 0) * item.quantity
            for item in order_items
        )

        return Response(
            {
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "amount_rupees": order.amount_rupees,
                "amount_paise": order.amount_paise,
                "currency": order.currency,
                "created_at": order.created_at,
                "updated_at": order.updated_at,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "customer_phone": order.customer_phone,
                "customer_address": order.customer_address,
                "customer_address_line_2": order.customer_address_line_2,
                "customer_city": order.customer_city,
                "customer_state": order.customer_state,
                "customer_postal_code": order.customer_postal_code,
                "shipping_name": order.shipping_name,
                "shipping_address": order.shipping_address,
                "shipping_landmark": order.shipping_landmark,
                "shipping_city": order.shipping_city,
                "shipping_state": order.shipping_state,
                "shipping_pincode": order.shipping_pincode,
                "shipping_provider": order.shipping_provider,
                "savings_rupees": savings,
                "original_total_rupees": original_total,
                "subtotal_rupees": order.amount_rupees,
                "shipping_rupees": 0,
                "payment_status": verified_payment.status if verified_payment else PaymentStatus.VERIFIED,
                "payment_id": verified_payment.razorpay_payment_id if verified_payment else order.razorpay_payment_id,
                "paid_at": verified_payment.updated_at if verified_payment else order.updated_at,
                "item_count": sum(item.quantity for item in order_items),
                "shipping": {
                    "name": order.shipping_name or order.customer_name,
                    "address": order.shipping_address or order.customer_address,
                    "landmark": order.shipping_landmark,
                    "city": order.shipping_city or order.customer_city,
                    "state": order.shipping_state or order.customer_state,
                    "pincode": order.shipping_pincode or order.customer_postal_code,
                },
                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_detail_id": item.product_detail_id,
                        "product_name": item.product_name,
                        "product_slug": item.product.slug,
                        "thumbnail": _build_media_url(request, item.product.thumbnail_image),
                        "product_weight": item.product_detail.product_weight,
                        "weight_type": item.product_detail.weight_type,
                        "quality_label": _build_quality_label(item.product_detail),
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "line_total": item.line_total,
                        "original_price": item.product_detail.original_price,
                    }
                    for item in order_items
                ],
                "payments": [
                    {
                        "id": payment.id,
                        "status": payment.status,
                        "razorpay_order_id": payment.razorpay_order_id,
                        "razorpay_payment_id": payment.razorpay_payment_id,
                        "created_at": payment.created_at,
                        "updated_at": payment.updated_at,
                    }
                    for payment in order.payments.all()
                ],
            }
        )
        
@method_decorator(cache_page(60 * 10), name='dispatch')
class TrendingProductsFastAPIView(ListAPIView):
    """Cached API for trending products with compact related data."""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        review_count_subquery = ProductReview.objects.filter(
            product_id=OuterRef('pk'),
            is_deleted=False,
        ).values('product_id').annotate(total=Count('id')).values('total')[:1]

        queryset = Product.objects.filter(
            is_deleted=False,
            trending_product=True
        ).select_related(
            'brand',
            'product_type',
            'categorie'
        ).prefetch_related(
            Prefetch(
                'product_details',
                queryset=ProductDetails.objects.filter(is_deleted=False).order_by('id'),
                to_attr='active_product_details'
            )
        ).annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
            review_count=Subquery(review_count_subquery, output_field=IntegerField())
        ).order_by('-created_at')[:50]

        products_list = []

        for product in queryset:
            active_details = getattr(product, 'active_product_details', [])
            product_details_list = [
                {
                    'id': detail.id,
                    'product_weight': detail.product_weight,
                    'weight_type': detail.weight_type,
                    'combo': detail.combo,
                    'original_price': detail.original_price,
                    'selling_price': detail.selling_price,
                    'discount_price': detail.discount_price
                }
                for detail in active_details
            ]
            min_price = min((detail.selling_price for detail in active_details), default=0)

            products_list.append({
                'id': product.id,
                'slug': product.slug,
                'product_name': product.product_name,
                'brand_name': product.brand.brand_name,
                'product_type': product.product_type.product_type,
                'category_id': product.categorie.id,
                'thumbnail_image': _build_media_url(request, product.thumbnail_image) or None,
                'hover_image': _build_media_url(request, product.hover_image) or None,
                'min_price': min_price,
                'avg_rating': round(product.avg_rating, 1) if product.avg_rating else 0,
                'review_count': product.review_count or 0,
                'product_details': product_details_list
            })

        return Response({
            'trending_products': products_list,
            'count': len(products_list)
        })


@method_decorator(cache_page(60 * 30), name='dispatch')
class ShopByConcernAPIView(ListAPIView):
    """API to get concerns enabled for the home Shop by Concern section"""
    permission_classes = [AllowAny]
    pagination_class = None

    def get(self, request, *args, **kwargs):
        skin_concerns = list(
            SkinConcerns.objects.filter(is_deleted=False, show_home=True)
            .order_by('skin_concern')
            .values('id', 'skin_concern', 'slug')
        )
        hair_concerns = list(
            HairConcerns.objects.filter(is_deleted=False, show_home=True)
            .order_by('hair_concern')
            .values('id', 'hair_concern', 'slug')
        )

        concerns = [
            {
                'id': item['id'],
                'name': item['skin_concern'],
                'slug': item.get('slug') or '',
                'type': 'skin',
            }
            for item in skin_concerns
        ] + [
            {
                'id': item['id'],
                'name': item['hair_concern'],
                'slug': item.get('slug') or '',
                'type': 'hair',
            }
            for item in hair_concerns
        ]

        concerns.sort(key=lambda item: item['name'].lower())

        return Response({
            'concerns': concerns,
            'count': len(concerns),
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
                image_url = _build_media_url(request, product_type.image) or None
            
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
            category_image_url = _build_media_url(request, hair_category.image) or None

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
                image_url = _build_media_url(request, product_type.image) or None
            
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
            category_image_url = _build_media_url(request, skin_category.image) or None
        
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
                image_url = _build_media_url(request, product_type.image) or None
            
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
            category_image_url = _build_media_url(request, supplement_category.image) or None
        
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
    """Common API for all banner types with intelligent fallback"""
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get(self, request, *args, **kwargs):
        # Get banner_type from query parameters
        banner_type = request.GET.get('bannerType')
        device = request.GET.get('device')
        
        if not banner_type:
            return Response({
                'success': False,
                'message': 'bannerType parameter is required',
                'data': []
            })
        
        # 1. Try to find specific banners for the requested type
        banners = ImageFile.objects.filter(
            type=banner_type,
            is_deleted=False
        ).order_by('-created_at')
        
        # 2. If not found, check if it's a product type and use its category banner
        if not banners.exists():
            resolved_type = None
            
            # Check if it's a ProductType slug
            pt = ProductType.objects.filter(slug=banner_type, is_deleted=False).select_related('categorie').first()
            if pt:
                # Use category slug (e.g., 'skin', 'hair')
                resolved_type = getattr(pt.categorie, 'slug', None)
            else:
                # Check if it's already a Category slug
                cat = Categories.objects.filter(slug=banner_type, is_deleted=False).first()
                if cat:
                    resolved_type = banner_type
            
            if resolved_type:
                banners = ImageFile.objects.filter(
                    type=resolved_type,
                    is_deleted=False
                ).order_by('-created_at')
                
                if banners.exists():
                    banner_type = resolved_type # Update for response info

        # 3. Last resort fallback to device-specific default banner, then legacy default banner
        if not banners.exists():
            fallback_types = []
            if device in ('web', 'mobile'):
                fallback_types.append(f'default_banner_{device}')
            fallback_types.append('default_banner')

            for fallback_type in fallback_types:
                if banner_type == fallback_type:
                    continue

                candidate_banners = ImageFile.objects.filter(
                    type=fallback_type,
                    is_deleted=False
                ).order_by('-created_at')

                if candidate_banners.exists():
                    banners = candidate_banners
                    banner_type = fallback_type
                    break

        # Build response data
        banner_list = []
        for banner in banners:
            # Build image URL
            image_url = None
            if banner.image:
                image_url = _build_media_url(request, banner.image) or None
            
            banner_list.append({
                'id': banner.id,
                'image_url': image_url,
                'type': banner.type,
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
            thumbnail_url = _build_media_url(request, product.thumbnail_image) or None

        hover_url = None
        if product.hover_image:
            hover_url = _build_media_url(request, product.hover_image) or None

        detail = product.product_details.filter(is_deleted=False).order_by("selling_price").first()

        return {
            "id": product.id,
            "slug": product.slug,
            "product_name": product.product_name,
            "brand_name": product.brand.brand_name,
            "thumbnail_image": thumbnail_url,
            "hover_image": hover_url,
            "detail_id": detail.id if detail else None,
            "price": detail.selling_price if detail else 0,
            "original_price": detail.original_price if detail else 0,
            "discount_price": detail.discount_price if detail else 0,
            "product_weight": detail.product_weight if detail else "",
            "weight_type": detail.weight_type if detail else "",
            "combo": detail.combo if detail else 1,
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


class NewsletterSubscriptionAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NewsletterSubscriberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        subscriber, created = SecureDermaNewsletterSubscriber.objects.get_or_create(
            email=email,
            defaults={
                "source": "home_newsletter",
                "is_active": True,
            },
        )

        if not created and not subscriber.is_active:
            subscriber.is_active = True
            subscriber.save(update_fields=["is_active", "updated_at"])

        return Response(
            {
                "success": True,
                "created": created,
                "message": "Subscription saved successfully." if created else "You're already subscribed.",
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
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
                    "thumbnail_image": _build_media_url(request, p.thumbnail_image) or None,
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
                        "thumbnail_image": _build_media_url(request, p.thumbnail_image) or None,
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
        cache_key = f"product_list_filters:{request.GET.urlencode()}"
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response)

        # =========================
        # HELPERS
        # =========================
        def get_list(param):
            value = request.GET.get(param, "")
            return value.split(",") if value else []

        # =========================
        # SLUG LOGIC
        # =========================
        filter_value = (request.GET.get("filter") or "").strip()
        slug = filter_value.lower() if filter_value else ""
        search_text = (request.GET.get("searchText") or "").strip()

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

            else:
                slug_filter_map = {
                    "brand": Q(brand__slug=slug),
                    "category": Q(categorie__slug=slug),
                    "product_type": Q(product_type__slug=slug),
                    "skin_concern": Q(skin_concern__slug=slug),
                    "hair_concern": Q(hair_concern__slug=slug),
                    "ingredient": Q(ingredient__slug=slug),
                }
                slug_type = _resolve_filter_slug_type(slug)
                if not slug_type:
                    return Response(
                        {"error": "Invalid filter slug"},
                        status=404
                    )
                products = products.filter(slug_filter_map[slug_type])

        filter_scope_products = products

        # =====================================================
        # EXISTING MULTI FILTERS (UNCHANGED)
        # =====================================================
        current_hair = get_list("hair_concern")
        current_skin = get_list("skin_concern")
        current_ingredient = get_list("ingredient")
        current_product_type = get_list("product_type")
        current_brand = get_list("brand")

        if search_text:
            search_query = (
                Q(product_name__icontains=search_text)
                | Q(brand__brand_name__icontains=search_text)
                | Q(product_type__product_type__icontains=search_text)
                | Q(categorie__categorie__icontains=search_text)
                | Q(skin_concern__skin_concern__icontains=search_text)
                | Q(hair_concern__hair_concern__icontains=search_text)
                | Q(ingredient__ingredient__icontains=search_text)
            )
            products = products.filter(search_query)
            filter_scope_products = filter_scope_products.filter(search_query)

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
            filter_scope_products = filter_scope_products.filter(id__in=product_ids)

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
                queryset=ProductImage.objects.filter(is_deleted=False),
                to_attr="active_images"
            )
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

            # Base queryset must stay inside the current collection/search scope
            base_qs = filter_scope_products

            # Apply ALL other current filters (except the one we're calculating)
            qs = base_qs
            for param, values in all_current_filters.items():
                if param != filter_field and values:
                    qs = qs.filter(**{f"{param}__slug__in": values})

            # Get set of applicable related object IDs after applying other filters
            applicable_ids = set(
                qs.exclude(**{f"{filter_field}__isnull": True})
                .values_list(f"{filter_field}__id", flat=True)
                .distinct()
            )

            # Fetch all objects from the model
            all_objects = model_class.objects.filter(
                is_deleted=False
            ).order_by("id")
            name_field = FILTER_OPTION_NAME_FIELDS.get(model_class)
            no_filters_applied = not (
                slug
                or search_text
                or current_hair
                or current_skin
                or current_ingredient
                or current_product_type
                or current_brand
                or request.GET.get("min_price")
                or request.GET.get("max_price")
            )

            options = []

            for obj in all_objects:
                name = getattr(obj, name_field) if name_field else str(obj)

                # Determine if this option is applicable
                is_applicable = True if no_filters_applied else obj.id in applicable_ids

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
            )
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
        serializer = CollectionProductListSerializer(
            paginated_products,
            many=True,
            context={"request": request}
        )

        response_data = {
            "success": True,
            "filters": filters,
            "products": {
                "count": total_count,
                "limit": limit,
                "offset": offset,
                "results": serializer.data
            }
        }
        cache.set(cache_key, response_data, timeout=300)
        return Response(response_data)

        
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
        
        else:
            filter_map = {
                "brand": Q(brand__slug=slug),
                "category": Q(categorie__slug=slug),
                "product_type": Q(product_type__slug=slug),
                "skin_concern": Q(skin_concern__slug=slug),
                "hair_concern": Q(hair_concern__slug=slug),
                "ingredient": Q(ingredient__slug=slug),
            }
            filter_type = _resolve_filter_slug_type(slug)
            if not filter_type:
                return Response(
                    {"error": "No matching brand, category, product type, or concern found for this slug"},
                    status=status.HTTP_404_NOT_FOUND
                )
            filter_query = filter_map[filter_type]
        
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
    Product detail API by slug.
    Uses filtered prefetches plus small aggregate queries to avoid expensive
    review x variant join explosions on the live database.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = Product.objects.select_related(
                'brand',
                'product_type',
                'categorie'
            ).prefetch_related(
                Prefetch(
                    'product_details',
                    queryset=ProductDetails.objects.filter(is_deleted=False).order_by('id'),
                    to_attr='active_product_details'
                ),
                Prefetch(
                    'images',
                    queryset=ProductImage.objects.filter(is_deleted=False).order_by('id'),
                    to_attr='active_images'
                ),
                Prefetch(
                    'skin_concern',
                    queryset=SkinConcerns.objects.filter(is_deleted=False).only('id', 'skin_concern', 'slug').order_by('id'),
                    to_attr='active_skin_concerns'
                ),
                Prefetch(
                    'hair_concern',
                    queryset=HairConcerns.objects.filter(is_deleted=False).only('id', 'hair_concern', 'slug').order_by('id'),
                    to_attr='active_hair_concerns'
                ),
                Prefetch(
                    'ingredient',
                    queryset=Ingredients.objects.filter(is_deleted=False).only('id', 'ingredient', 'slug').order_by('id'),
                    to_attr='active_ingredients'
                ),
            ).get(
                slug=slug,
                is_deleted=False
            )
        except Product.DoesNotExist:
            return Response(
                {"success": False, "error": "Product not found or has been removed."},
                status=status.HTTP_404_NOT_FOUND
            )

        review_stats = ProductReview.objects.filter(
            product_id=product.id,
            is_deleted=False,
        ).aggregate(
            avg_rating=Avg('rating'),
            review_count=Count('id'),
        )

        latest_reviews = list(
            ProductReview.objects.filter(product_id=product.id, is_deleted=False)
            .select_related('user')
            .prefetch_related(
                Prefetch(
                    'images',
                    queryset=ProductReviewImage.objects.order_by('id'),
                    to_attr='prefetched_images'
                )
            )
            .order_by('-review_date', '-created_at')[:10]
        )

        def get_image_url(image_field):
            return _build_media_url(request, image_field) or None

        active_details = getattr(product, 'active_product_details', [])
        product_details_list = [
            {
                'id': detail.id,
                'product_weight': detail.product_weight,
                'weight_type': detail.weight_type,
                'combo': detail.combo,
                'original_price': detail.original_price,
                'selling_price': detail.selling_price,
                'discount_price': detail.discount_price,
                'available_stock_count': detail.available_stock_count,
            }
            for detail in active_details
        ]

        selling_prices = [detail.selling_price for detail in active_details if detail.selling_price is not None]
        min_price = min(selling_prices) if selling_prices else 0
        max_price = max(selling_prices) if selling_prices else 0
        avg_rating = review_stats.get('avg_rating') or 0.0
        review_count = review_stats.get('review_count') or 0

        gallery_images = [
            get_image_url(image.image)
            for image in getattr(product, 'active_images', [])
        ]

        skin_concerns = [
            {'id': concern.id, 'skin_concern': concern.skin_concern, 'slug': concern.slug}
            for concern in getattr(product, 'active_skin_concerns', [])
        ]
        hair_concerns = [
            {'id': concern.id, 'hair_concern': concern.hair_concern, 'slug': concern.slug}
            for concern in getattr(product, 'active_hair_concerns', [])
        ]
        ingredients = [
            {'id': ingredient.id, 'ingredient': ingredient.ingredient, 'slug': ingredient.slug}
            for ingredient in getattr(product, 'active_ingredients', [])
        ]

        reviews_list = []
        for review in latest_reviews:
            reviewer_name = review.reviewer_name or (review.user.get_full_name() if review.user else 'Anonymous')
            reviews_list.append({
                'id': review.id,
                'reviewer_name': reviewer_name,
                'rating': review.rating,
                'review_text': review.review_text or '',
                'review_date': review.review_date.isoformat() if review.review_date else None,
                'created_at': review.created_at.isoformat(),
                'images': [get_image_url(image.image) for image in getattr(review, 'prefetched_images', [])],
            })

        product_data = {
            'id': product.id,
            'product_name': product.product_name,
            'slug': product.slug,
            'product_description': product.product_description or '',
            'key_benefits': product.key_benefits or [],
            'key_ingredients': product.key_ingredients or [],
            'how_to_use': product.how_to_use or [],
            'trending_product': product.trending_product,
            'best_seller': product.best_seller,
            'created_at': product.created_at.isoformat(),
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
            'thumbnail_image': get_image_url(product.thumbnail_image),
            'hover_image': get_image_url(product.hover_image),
            'gallery_images': gallery_images,
            'min_price': min_price,
            'max_price': max_price,
            'avg_rating': round(avg_rating, 1) if avg_rating else 0.0,
            'review_count': review_count,
            'product_details': product_details_list,
            'skin_concerns': skin_concerns,
            'hair_concerns': hair_concerns,
            'ingredients': ingredients,
            'reviews': {
                'data': reviews_list,
                'total_count': review_count,
                'avg_rating': round(avg_rating, 1) if avg_rating else 0.0,
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
        hair_concerns = [
            {
                'id': item['id'],
                'name': item['hair_concern'],
                'slug': item['slug'],
            }
            for item in HairConcerns.objects.filter(is_deleted=False)
            .values('id', 'hair_concern', 'slug')
            .order_by('id')
        ]
        skin_concerns = [
            {
                'id': item['id'],
                'name': item['skin_concern'],
                'slug': item['slug'],
            }
            for item in SkinConcerns.objects.filter(is_deleted=False)
            .values('id', 'skin_concern', 'slug')
            .order_by('id')
        ]
        ingredients = [
            {
                'id': item['id'],
                'name': item['ingredient'],
                'slug': item['slug'],
            }
            for item in Ingredients.objects.filter(is_deleted=False)
            .values('id', 'ingredient', 'slug')
            .order_by('id')
        ]
        product_types = [
            {
                'id': item['id'],
                'name': item['product_type'],
                'slug': item['slug'],
            }
            for item in ProductType.objects.filter(is_deleted=False)
            .values('id', 'product_type', 'slug')
            .order_by('id')
        ]

        return Response({
            "hair_concerns": hair_concerns,
            "skin_concerns": skin_concerns,
            "ingredients": ingredients,
            "product_types": product_types,
        })
