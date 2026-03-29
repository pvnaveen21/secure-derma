from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hair_concern', '0002_hairconcerns_show_home'),
    ]

    operations = [
        migrations.AddField(
            model_name='hairconcerns',
            name='show_filter',
            field=models.BooleanField(default=False),
        ),
    ]
