from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hair_concern', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='hairconcerns',
            name='show_home',
            field=models.BooleanField(default=False),
        ),
    ]
