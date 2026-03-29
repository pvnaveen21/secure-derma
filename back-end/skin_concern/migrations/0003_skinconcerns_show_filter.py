from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('skin_concern', '0002_skinconcerns_show_home'),
    ]

    operations = [
        migrations.AddField(
            model_name='skinconcerns',
            name='show_filter',
            field=models.BooleanField(default=False),
        ),
    ]
