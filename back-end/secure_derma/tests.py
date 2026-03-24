import hashlib
import hmac
from unittest.mock import Mock, patch

from django.test import TestCase
from django.utils import timezone
from datetime import date, datetime, time, timedelta
from rest_framework.test import APIClient

from brand.models import Brand
from categorie.models import Categories
from product.models import Product, ProductDetails
from product_type.models import ProductType
from skin_concern.models import SkinConcerns
from .models import OrderStatus, PaymentStatus, SecureDermaCartItem, SecureDermaOrder, SecureDermaOrderItem, SecureDermaPayment
from user.models import User


class ProductListWithFiltersAPIViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.brand = Brand.objects.create(brand_name="Acme")
        self.category = Categories.objects.create(categorie="Skin Care")
        self.product_type = ProductType.objects.create(
            categorie=self.category,
            product_type="Cleanser",
        )
        self.skin_concern = SkinConcerns.objects.create(skin_concern="Acne")

        self.skin_product = Product.objects.create(
            brand=self.brand,
            categorie=self.category,
            product_type=self.product_type,
            product_name="Skin Product",
        )
        self.skin_product.skin_concern.add(self.skin_concern)

        Product.objects.create(
            brand=self.brand,
            categorie=self.category,
            product_type=self.product_type,
            product_name="General Product",
        )

    def test_skin_filter_is_applied_with_pagination_params(self):
        response = self.client.get(
            "/api/filter-products/",
            {"filter": "skin", "limit": 5, "offset": 0},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["products"]["count"], 1)
        self.assertEqual(len(response.data["products"]["results"]), 1)
        self.assertEqual(
            response.data["products"]["results"][0]["product_name"],
            "Skin Product",
        )


class RazorpayPaymentFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.brand = Brand.objects.create(brand_name="Acme")
        self.category = Categories.objects.create(categorie="Skin Care")
        self.product_type = ProductType.objects.create(
            categorie=self.category,
            product_type="Cleanser",
        )
        self.product = Product.objects.create(
            brand=self.brand,
            categorie=self.category,
            product_type=self.product_type,
            product_name="Skin Product",
        )
        self.detail = ProductDetails.objects.create(
            product=self.product,
            product_weight="100",
            weight_type="ml",
            combo=1,
            original_price=599,
            selling_price=499,
            available_stock_count=10,
            discount_price=100,
        )
        self.user = User.objects.create_user(
            email="buyer@example.com",
            password="buyerpass123",
        )
        self.customer_payload = {
            "name": "Naveen Kumar",
            "email": "naveen@example.com",
            "contact": "9876543210",
            "address": "12 Lake View Road, Sector 4",
            "address_line_2": "Near City Clinic",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
        }

    @patch.dict(
        "os.environ",
        {"RAZORPAY_KEY_ID": "rzp_test_123", "RAZORPAY_KEY_SECRET": "secret_123"},
        clear=False,
    )
    @patch("secure_derma.views.requests.post")
    def test_create_order_persists_secure_derma_order(self, mock_post):
        self.client.force_authenticate(user=self.user)
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": "order_razorpay_123",
                "currency": "INR",
                "receipt": "securederma_testreceipt",
            },
            content=b'{}',
        )

        response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 2,
                    }
                ],
                "customer": self.customer_payload,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["amount"], 998)

        order = SecureDermaOrder.objects.get(razorpay_order_id="order_razorpay_123")
        self.assertEqual(order.status, OrderStatus.PAYMENT_PENDING)
        self.assertEqual(order.amount_rupees, 998)
        self.assertEqual(order.customer_name, "Naveen Kumar")
        self.assertEqual(order.customer_address, self.customer_payload["address"])
        self.assertEqual(order.customer_postal_code, self.customer_payload["postal_code"])
        self.assertEqual(order.items.count(), 1)

        payment = SecureDermaPayment.objects.get(order=order)
        self.assertEqual(payment.status, PaymentStatus.CREATED)

    def test_guest_cannot_create_payment_order(self):
        response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 1,
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    @patch.dict(
        "os.environ",
        {"RAZORPAY_KEY_ID": "rzp_test_123", "RAZORPAY_KEY_SECRET": "secret_123"},
        clear=False,
    )
    @patch("secure_derma.views.send_order_confirmation_email")
    @patch("secure_derma.views.requests.post")
    def test_create_order_allows_missing_customer_email(self, mock_post, mock_send_order_email):
        self.client.force_authenticate(user=self.user)
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": "order_razorpay_optional_email",
                "currency": "INR",
                "receipt": "securederma_testreceipt",
            },
            content=b"{}",
        )

        response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 1,
                    }
                ],
                "customer": {
                    **self.customer_payload,
                    "email": "",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order = SecureDermaOrder.objects.get(razorpay_order_id="order_razorpay_optional_email")
        self.assertEqual(order.customer_email, "")
        mock_send_order_email.assert_not_called()

    @patch.dict(
        "os.environ",
        {"RAZORPAY_KEY_ID": "rzp_test_123", "RAZORPAY_KEY_SECRET": "secret_123"},
        clear=False,
    )
    def test_create_order_requires_complete_customer_details(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 1,
                    }
                ],
                "customer": {
                    "name": "Naveen",
                    "email": "not-an-email",
                    "contact": "123",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Enter a valid customer email address.")

    @patch.dict(
        "os.environ",
        {"RAZORPAY_KEY_ID": "rzp_test_123", "RAZORPAY_KEY_SECRET": "secret_123"},
        clear=False,
    )
    @patch("secure_derma.views.requests.post")
    @patch("secure_derma.views.send_order_confirmation_email")
    def test_verify_payment_marks_order_paid(self, mock_send_order_email, mock_post):
        self.client.force_authenticate(user=self.user)
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": "order_razorpay_456",
                "currency": "INR",
                "receipt": "securederma_testreceipt",
            },
            content=b'{}',
        )

        create_response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 1,
                    }
                ],
                "customer": self.customer_payload,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 200)

        razorpay_order_id = create_response.data["order_id"]
        razorpay_payment_id = "pay_123456"
        razorpay_signature = hmac.new(
            b"secret_123",
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        verify_response = self.client.post(
            "/api/payments/verify/",
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            },
            format="json",
        )

        self.assertEqual(verify_response.status_code, 200)

        order = SecureDermaOrder.objects.get(razorpay_order_id=razorpay_order_id)
        self.detail.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.PAID)
        self.assertEqual(order.razorpay_payment_id, razorpay_payment_id)
        self.assertTrue(order.stock_deducted)
        self.assertEqual(self.detail.available_stock_count, 9)

        self.assertTrue(
            SecureDermaPayment.objects.filter(
                order=order,
                razorpay_payment_id=razorpay_payment_id,
                status=PaymentStatus.VERIFIED,
            ).exists()
        )
        mock_send_order_email.assert_called_once()

    @patch.dict(
        "os.environ",
        {"RAZORPAY_KEY_ID": "rzp_test_123", "RAZORPAY_KEY_SECRET": "secret_123"},
        clear=False,
    )
    @patch("secure_derma.views.requests.post")
    @patch("secure_derma.views.get_order_recipient", return_value="")
    @patch("secure_derma.views.send_order_confirmation_email")
    def test_verify_payment_skips_email_when_order_has_no_email(self, mock_send_order_email, mock_get_recipient, mock_post):
        self.client.force_authenticate(user=self.user)
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": "order_razorpay_no_email",
                "currency": "INR",
                "receipt": "securederma_testreceipt",
            },
            content=b'{}',
        )

        create_response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 1,
                    }
                ],
                "customer": self.customer_payload,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 200)
        razorpay_order_id = create_response.data["order_id"]
        razorpay_payment_id = "pay_skip_email_123"
        razorpay_signature = hmac.new(
            b"secret_123",
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        verify_response = self.client.post(
            "/api/payments/verify/",
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            },
            format="json",
        )

        self.assertEqual(verify_response.status_code, 200)
        mock_send_order_email.assert_not_called()


class SecureDermaCartAPIViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(brand_name="Acme")
        self.category = Categories.objects.create(categorie="Skin Care")
        self.product_type = ProductType.objects.create(
            categorie=self.category,
            product_type="Cleanser",
        )
        self.product = Product.objects.create(
            brand=self.brand,
            categorie=self.category,
            product_type=self.product_type,
            product_name="Cart Product",
        )
        self.detail = ProductDetails.objects.create(
            product=self.product,
            product_weight="100",
            weight_type="ml",
            combo=1,
            original_price=599,
            selling_price=499,
            available_stock_count=10,
            discount_price=100,
        )
        self.user = User.objects.create_user(
            email="cartuser@example.com",
            password="buyerpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.customer_payload = {
            "name": "Cart User",
            "email": "cartuser@example.com",
            "contact": "9876543210",
            "address": "44 Residency Road, Block B",
            "address_line_2": "Opposite Metro Gate",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
        }

    def test_sync_guest_cart_creates_cart_items(self):
        response = self.client.post(
            "/api/cart/sync/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 2,
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["synced"])
        self.assertEqual(response.data["total_quantity"], 2)
        self.assertEqual(SecureDermaCartItem.objects.filter(user=self.user).count(), 1)
        self.assertEqual(
            SecureDermaCartItem.objects.get(user=self.user, product_detail=self.detail).quantity,
            2,
        )

    def test_cart_item_crud_flow(self):
        create_response = self.client.post(
            "/api/cart/items/",
            {"detailId": self.detail.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(create_response.status_code, 200)
        self.assertEqual(create_response.data["total_quantity"], 1)

        update_response = self.client.patch(
            f"/api/cart/items/{self.detail.id}/",
            {"quantity": 3},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["total_quantity"], 3)

        list_response = self.client.get("/api/cart/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["count"], 1)

        delete_response = self.client.delete(f"/api/cart/items/{self.detail.id}/")
        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.data["count"], 0)

    @patch.dict(
        "os.environ",
        {"RAZORPAY_KEY_ID": "rzp_test_123", "RAZORPAY_KEY_SECRET": "secret_123"},
        clear=False,
    )
    @patch("secure_derma.views.requests.post")
    def test_verify_payment_is_idempotent_for_same_payment_id(self, mock_post):
        self.client.force_authenticate(user=self.user)
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": "order_razorpay_789",
                "currency": "INR",
                "receipt": "securederma_testreceipt",
            },
            content=b'{}',
        )

        create_response = self.client.post(
            "/api/payments/create-order/",
            {
                "items": [
                    {
                        "detailId": self.detail.id,
                        "quantity": 1,
                    }
                ],
                "customer": self.customer_payload,
            },
            format="json",
        )

        razorpay_order_id = create_response.data["order_id"]
        razorpay_payment_id = "pay_repeat_123"
        razorpay_signature = hmac.new(
            b"secret_123",
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        first_response = self.client.post(
            "/api/payments/verify/",
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            },
            format="json",
        )
        second_response = self.client.post(
            "/api/payments/verify/",
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            },
            format="json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertTrue(second_response.data["already_processed"])

        self.detail.refresh_from_db()
        self.assertEqual(self.detail.available_stock_count, 9)
        self.assertEqual(
            SecureDermaPayment.objects.filter(
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                status=PaymentStatus.VERIFIED,
            ).count(),
            1,
        )


class AdminOrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="adminpass123",
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.order = SecureDermaOrder.objects.create(
            user=self.admin_user,
            order_number="securederma_order_001",
            razorpay_order_id="order_admin_001",
            razorpay_payment_id="pay_admin_001",
            amount_rupees=1499,
            amount_paise=149900,
            currency="INR",
            status=OrderStatus.PAID,
            customer_name="Admin Test",
            customer_email="customer@example.com",
            customer_phone="9876543210",
            customer_address="221B Baker Street",
            customer_address_line_2="Near Central Park",
            customer_city="Bengaluru",
            customer_state="Karnataka",
            customer_postal_code="560001",
            items_snapshot=[],
        )
        SecureDermaOrderItem.objects.create(
            order=self.order,
            product=Product.objects.create(
                brand=Brand.objects.create(brand_name="Detail Brand"),
                categorie=Categories.objects.create(categorie="Detail Cat"),
                product_type=ProductType.objects.create(
                    categorie=Categories.objects.get(categorie="Detail Cat"),
                    product_type="Serum",
                ),
                product_name="Detail Product",
            ),
            product_detail=ProductDetails.objects.create(
                product=Product.objects.get(product_name="Detail Product"),
                product_weight="50",
                weight_type="ml",
                combo=1,
                original_price=1599,
                selling_price=1499,
                available_stock_count=5,
                discount_price=100,
            ),
            product_name="Detail Product",
            quantity=1,
            unit_price=1499,
            line_total=1499,
        )
        SecureDermaPayment.objects.create(
            order=self.order,
            razorpay_order_id=self.order.razorpay_order_id,
            razorpay_payment_id=self.order.razorpay_payment_id,
            status=PaymentStatus.VERIFIED,
            payload={},
        )

    def test_admin_order_summary_returns_paid_order_metrics(self):
        response = self.client.get("/api/admin/orders/summary/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_orders"], 1)
        self.assertEqual(response.data["summary"]["total_revenue"], 1499)
        self.assertEqual(response.data["summary"]["pending_orders"], 0)

    def test_admin_order_list_returns_paid_orders(self):
        response = self.client.get("/api/admin/orders/", {"status": "paid", "limit": 5, "offset": 0})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["order_number"], self.order.order_number)
        self.assertEqual(response.data["results"][0]["customer_postal_code"], self.order.customer_postal_code)

    def test_admin_order_detail_returns_items_and_payments(self):
        response = self.client.get(f"/api/admin/orders/{self.order.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["order_number"], self.order.order_number)
        self.assertEqual(response.data["customer_address"], self.order.customer_address)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(len(response.data["payments"]), 1)


class UserOrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="buyer@example.com",
            password="buyerpass123",
            username="Buyer User",
            phone="9876543210",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="otherpass123",
            username="Other User",
            phone="9123456789",
        )
        self.client.force_authenticate(user=self.user)

        self.brand = Brand.objects.create(brand_name="User Brand")
        self.category = Categories.objects.create(categorie="User Cat")
        self.product_type = ProductType.objects.create(categorie=self.category, product_type="Cleanser")
        self.product = Product.objects.create(
            brand=self.brand,
            categorie=self.category,
            product_type=self.product_type,
            product_name="User Product",
            slug="user-product",
        )
        self.detail = ProductDetails.objects.create(
            product=self.product,
            product_weight="50",
            weight_type="ml",
            combo=1,
            original_price=799,
            selling_price=699,
            available_stock_count=10,
            discount_price=100,
        )

        self.order = SecureDermaOrder.objects.create(
            user=self.user,
            order_number="securederma_user_001",
            razorpay_order_id="order_user_001",
            razorpay_payment_id="pay_user_001",
            amount_rupees=699,
            amount_paise=69900,
            currency="INR",
            status=OrderStatus.PAID,
            customer_name="Buyer User",
            customer_email="buyer@example.com",
            customer_phone="9876543210",
            customer_address="Anna Nagar",
            customer_city="Chennai",
            customer_state="Tamil Nadu",
            customer_postal_code="638301",
            shipping_name="Buyer User",
            shipping_address="Anna Nagar",
            shipping_city="Chennai",
            shipping_state="Tamil Nadu",
            shipping_pincode="638301",
            shipping_provider="manual-checkout",
            items_snapshot=[],
        )
        SecureDermaOrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_detail=self.detail,
            product_name="User Product",
            quantity=1,
            unit_price=699,
            line_total=699,
        )
        SecureDermaPayment.objects.create(
            order=self.order,
            razorpay_order_id=self.order.razorpay_order_id,
            razorpay_payment_id=self.order.razorpay_payment_id,
            status=PaymentStatus.VERIFIED,
            payload={},
        )

    def test_user_order_list_returns_only_authenticated_users_orders(self):
        SecureDermaOrder.objects.create(
            user=self.other_user,
            order_number="securederma_user_002",
            razorpay_order_id="order_user_002",
            amount_rupees=999,
            amount_paise=99900,
            currency="INR",
            status=OrderStatus.PAYMENT_PENDING,
        )

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["order_number"], self.order.order_number)
        self.assertEqual(response.data["results"][0]["items"][0]["product_slug"], "user-product")

    def test_user_order_detail_returns_authenticated_users_order(self):
        response = self.client.get(f"/api/orders/{self.order.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["order_number"], self.order.order_number)
        self.assertEqual(response.data["shipping_city"], "Chennai")
        self.assertEqual(response.data["items"][0]["product_name"], "User Product")

    def test_user_order_detail_rejects_other_users_order(self):
        other_order = SecureDermaOrder.objects.create(
            user=self.other_user,
            order_number="securederma_user_003",
            razorpay_order_id="order_user_003",
            amount_rupees=999,
            amount_paise=99900,
            currency="INR",
            status=OrderStatus.PAID,
        )

        response = self.client.get(f"/api/orders/{other_order.id}/")

        self.assertEqual(response.status_code, 404)


class AdminOrderAnalyticsAPIViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123",
        )
        self.client.force_authenticate(user=self.admin)

    def test_returns_zero_filled_daily_series_for_paid_orders(self):
        today = timezone.localdate()
        paid_dates = [today - timedelta(days=3), today - timedelta(days=1), today - timedelta(days=1)]

        for index, paid_date in enumerate(paid_dates, start=1):
            order = SecureDermaOrder.objects.create(
                order_number=f"SD-DAY-{index}",
                razorpay_order_id=f"razor-day-{index}",
                razorpay_payment_id=f"pay-day-{index}",
                amount_rupees=499,
                amount_paise=49900,
                status=OrderStatus.PAID,
            )
            SecureDermaOrder.objects.filter(pk=order.pk).update(
                created_at=timezone.make_aware(datetime.combine(paid_date, time.min)),
                updated_at=timezone.make_aware(datetime.combine(paid_date, time.min)),
            )

        response = self.client.get('/api/admin/orders/analytics/', {'grouping': 'day', 'periods': 5})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['grouping'], 'day')
        self.assertEqual(response.data['periods'], 5)
        self.assertEqual(response.data['total_orders'], 3)
        self.assertEqual(response.data['peak_orders'], 2)
        self.assertEqual(len(response.data['series']), 5)
        self.assertEqual(response.data['series'][-2]['count'], 2)
        self.assertEqual(response.data['series'][0]['count'], 0)

    def test_rejects_invalid_grouping(self):
        response = self.client.get('/api/admin/orders/analytics/', {'grouping': 'week'})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], "Grouping must be either 'day' or 'month'.")

    def test_month_grouping_accepts_anchor_month(self):
        base_date = date(2025, 6, 1)
        for index in range(2):
            order = SecureDermaOrder.objects.create(
                order_number=f"SD-MONTH-{index}",
                razorpay_order_id=f"razor-month-{index}",
                razorpay_payment_id=f"pay-month-{index}",
                amount_rupees=499,
                amount_paise=49900,
                status=OrderStatus.PAID,
            )
            paid_date = base_date.replace(day=10 + index)
            SecureDermaOrder.objects.filter(pk=order.pk).update(
                created_at=timezone.make_aware(datetime.combine(paid_date, time.min)),
                updated_at=timezone.make_aware(datetime.combine(paid_date, time.min)),
            )

        response = self.client.get('/api/admin/orders/analytics/', {'grouping': 'month', 'periods': 3, 'anchor_month': '2025-06'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['range_end'], '2025-06-01')
        self.assertEqual(response.data['series'][-1]['count'], 2)

    def test_rejects_invalid_anchor_month(self):
        response = self.client.get('/api/admin/orders/analytics/', {'grouping': 'month', 'anchor_month': '2025-13'})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'anchor_month must be in YYYY-MM format.')
