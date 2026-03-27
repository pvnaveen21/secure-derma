from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('secure_derma', '0008_securedermanewslettersubscriber'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SecureDermaVisit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('visitor_key', models.CharField(db_index=True, max_length=64)),
                ('path', models.CharField(db_index=True, max_length=255)),
                ('referrer', models.CharField(blank=True, max_length=500)),
                ('user_agent', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='secure_derma_visits', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'secure_derma_visits',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['path', 'created_at'], name='secure_derm_path_d02346_idx'), models.Index(fields=['visitor_key', 'created_at'], name='secure_derm_visitor_2d6d83_idx')],
            },
        ),
    ]
