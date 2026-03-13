from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("secure_derma", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="securedermaorder",
            name="stock_deducted",
            field=models.BooleanField(default=False),
        ),
    ]
