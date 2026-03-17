from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("secure_derma", "0005_alter_securedermacartitem_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="securedermaorder",
            name="customer_address",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="securedermaorder",
            name="customer_address_line_2",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="securedermaorder",
            name="customer_city",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="securedermaorder",
            name="customer_postal_code",
            field=models.CharField(blank=True, db_index=True, max_length=10),
        ),
        migrations.AddField(
            model_name="securedermaorder",
            name="customer_state",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
