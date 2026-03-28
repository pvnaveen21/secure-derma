from django.test import TestCase

from categorie.models import Categories
from product_type.models import ProductType


class ProductTypeSlugTests(TestCase):
    def setUp(self):
        self.category = Categories.objects.create(categorie="Skin")

    def test_slug_is_updated_when_product_type_name_changes(self):
        product_type = ProductType.objects.create(
            categorie=self.category,
            product_type="Moisturizers",
        )

        self.assertEqual(product_type.slug, "moisturizers")

        product_type.product_type = "Moisturizer"
        product_type.save()
        product_type.refresh_from_db()

        self.assertEqual(product_type.slug, "moisturizer")

    def test_slug_regeneration_remains_unique_after_rename(self):
        ProductType.objects.create(
            categorie=self.category,
            product_type="Moisturizer",
        )
        renamed_product_type = ProductType.objects.create(
            categorie=self.category,
            product_type="Moisturizers",
        )

        renamed_product_type.product_type = "Moisturizer"
        renamed_product_type.save()
        renamed_product_type.refresh_from_db()

        self.assertEqual(renamed_product_type.slug, "moisturizer-1")
