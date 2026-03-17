from django.conf import settings
from django.db import models

from product.models import Product, ProductDetails


class OrderStatus(models.TextChoices):
    CREATED = "created", "Created"
    PAYMENT_PENDING = "payment_pending", "Payment Pending"
    PAID = "paid", "Paid"
    PAYMENT_FAILED = "payment_failed", "Payment Failed"


class PaymentStatus(models.TextChoices):
    CREATED = "created", "Created"
    VERIFIED = "verified", "Verified"
    FAILED = "failed", "Failed"


class SecureDermaOrder(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secure_derma_orders",
    )
    order_number = models.CharField(max_length=40, unique=True, db_index=True)
    razorpay_order_id = models.CharField(max_length=100, unique=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    amount_rupees = models.PositiveIntegerField()
    amount_paise = models.PositiveIntegerField()
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(
        max_length=24,
        choices=OrderStatus.choices,
        default=OrderStatus.CREATED,
    )
    customer_name = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_address = models.CharField(max_length=255, blank=True)
    customer_address_line_2 = models.CharField(max_length=255, blank=True)
    customer_city = models.CharField(max_length=100, blank=True)
    customer_state = models.CharField(max_length=100, blank=True)
    customer_postal_code = models.CharField(max_length=10, blank=True, db_index=True)
    shipping_name = models.CharField(max_length=255, blank=True)
    shipping_address = models.CharField(max_length=255, blank=True)
    shipping_landmark = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_pincode = models.CharField(max_length=10, blank=True, db_index=True)
    shipping_state = models.CharField(max_length=100, blank=True)
    shipping_provider = models.CharField(max_length=100, blank=True)
    stock_deducted = models.BooleanField(default=False)
    items_snapshot = models.JSONField(default=list, blank=True)
    verification_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "secure_derma_orders"
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class SecureDermaOrderItem(models.Model):
    order = models.ForeignKey(
        SecureDermaOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="secure_derma_order_items")
    product_detail = models.ForeignKey(
        ProductDetails,
        on_delete=models.PROTECT,
        related_name="secure_derma_order_items",
    )
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    unit_price = models.PositiveIntegerField()
    line_total = models.PositiveIntegerField()

    class Meta:
        db_table = "secure_derma_order_items"

    def __str__(self):
        return f"{self.order.order_number} - {self.product_name}"


class SecureDermaPayment(models.Model):
    order = models.ForeignKey(
        SecureDermaOrder,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    razorpay_order_id = models.CharField(max_length=100, db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=24,
        choices=PaymentStatus.choices,
        default=PaymentStatus.CREATED,
    )
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "secure_derma_payments"
        ordering = ["-created_at"]

    def __str__(self):
        return self.razorpay_payment_id or self.razorpay_order_id


class SecureDermaCartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="secure_derma_cart_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="secure_derma_cart_items",
    )
    product_detail = models.ForeignKey(
        ProductDetails,
        on_delete=models.CASCADE,
        related_name="secure_derma_cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "secure_derma_cart_items"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product_detail"],
                name="unique_secure_derma_cart_item_per_user_detail",
            )
        ]

    def __str__(self):
        return f"{self.user_id}-{self.product_detail_id} x {self.quantity}"
