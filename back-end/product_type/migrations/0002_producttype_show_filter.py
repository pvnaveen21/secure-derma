from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('product_type', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='producttype',
            name='show_filter',
            field=models.BooleanField(default=False),
        ),
    ]
