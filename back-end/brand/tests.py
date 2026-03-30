from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from brand.models import Brand
from categorie.models import Categories
from product.models import Product
from product_type.models import ProductType


@override_settings(ROOT_URLCONF="config.urls")
class BrandPublicVisibilityTests(APITestCase):
    def test_hidden_brand_is_excluded_from_public_brand_listing(self):
        Brand.objects.create(
            brand_name="Visible Brand",
            show_brand=True,
            is_top_brand=False,
        )
        Brand.objects.create(
            brand_name="Hidden Brand",
            show_brand=False,
            is_top_brand=False,
        )

        response = self.client.get("/api/brands/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        flattened_brands = [
            brand["brand_name"]
            for brand_group in response.data.values()
            for brand in brand_group
        ]
        self.assertIn("Visible Brand", flattened_brands)
        self.assertNotIn("Hidden Brand", flattened_brands)

    def test_product_detail_is_hidden_when_brand_is_disabled(self):
        hidden_brand = Brand.objects.create(
            brand_name="Hidden Brand",
            show_brand=False,
            is_top_brand=False,
        )
        category = Categories.objects.create(categorie="Skin Care")
        product_type = ProductType.objects.create(
            categorie=category,
            product_type="Cream",
        )
        product = Product.objects.create(
            brand=hidden_brand,
            categorie=category,
            product_type=product_type,
            product_name="Aquasoft FC Advanced Facial Cream",
        )

        response = self.client.get(f"/api/products/{product.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
