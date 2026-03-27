from django.db import migrations, models


def backfill_auth_source(apps, schema_editor):
    User = apps.get_model('user', 'User')

    for user in User.objects.all().iterator():
        if getattr(user, 'is_google_login', False):
            user.auth_source = 'google'
        elif str(getattr(user, 'email', '') or '').endswith('@phone.local'):
            user.auth_source = 'phone'
        else:
            user.auth_source = 'email'
        user.save(update_fields=['auth_source'])


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0002_alter_user_options_alter_user_managers_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='auth_source',
            field=models.CharField(
                choices=[('google', 'Google'), ('phone', 'Phone'), ('email', 'Email')],
                db_index=True,
                default='email',
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_auth_source, migrations.RunPython.noop),
    ]
