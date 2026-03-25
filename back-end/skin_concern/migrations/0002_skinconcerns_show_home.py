from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('skin_concern', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='skinconcerns',
            name='show_home',
            field=models.BooleanField(default=False),
        ),
    ]
