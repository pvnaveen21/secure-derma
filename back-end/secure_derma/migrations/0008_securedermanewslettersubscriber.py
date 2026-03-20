from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("secure_derma", "0007_securedermaorder_shipping_address_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SecureDermaNewsletterSubscriber",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("source", models.CharField(default="home_newsletter", max_length=50)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "secure_derma_newsletter_subscribers",
                "ordering": ["-created_at"],
            },
        ),
    ]
