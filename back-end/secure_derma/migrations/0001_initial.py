from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("product", "0002_productreview_review_date"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SecureDermaOrder",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order_number", models.CharField(db_index=True, max_length=40, unique=True)),
                ("razorpay_order_id", models.CharField(db_index=True, max_length=100, unique=True)),
                ("razorpay_payment_id", models.CharField(blank=True, db_index=True, max_length=100, null=True)),
                ("amount_rupees", models.PositiveIntegerField()),
                ("amount_paise", models.PositiveIntegerField()),
                ("currency", models.CharField(default="INR", max_length=10)),
                ("status", models.CharField(choices=[("created", "Created"), ("payment_pending", "Payment Pending"), ("paid", "Paid"), ("payment_failed", "Payment Failed")], default="created", max_length=24)),
                ("customer_name", models.CharField(blank=True, max_length=255)),
                ("customer_email", models.EmailField(blank=True, max_length=254)),
                ("customer_phone", models.CharField(blank=True, max_length=20)),
                ("items_snapshot", models.JSONField(blank=True, default=list)),
                ("verification_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="secure_derma_orders", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "secure_derma_orders",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SecureDermaOrderItem",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product_name", models.CharField(max_length=255)),
                ("quantity", models.PositiveIntegerField()),
                ("unit_price", models.PositiveIntegerField()),
                ("line_total", models.PositiveIntegerField()),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="secure_derma.securedermaorder")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="secure_derma_order_items", to="product.product")),
                ("product_detail", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="secure_derma_order_items", to="product.productdetails")),
            ],
            options={
                "db_table": "secure_derma_order_items",
            },
        ),
        migrations.CreateModel(
            name="SecureDermaPayment",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("razorpay_order_id", models.CharField(db_index=True, max_length=100)),
                ("razorpay_payment_id", models.CharField(blank=True, db_index=True, max_length=100, null=True)),
                ("razorpay_signature", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("created", "Created"), ("verified", "Verified"), ("failed", "Failed")], default="created", max_length=24)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payments", to="secure_derma.securedermaorder")),
            ],
            options={
                "db_table": "secure_derma_payments",
                "ordering": ["-created_at"],
            },
        ),
    ]
