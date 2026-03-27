from django.db import migrations, models


def classify_device(user_agent: str) -> str:
    value = (user_agent or '').lower()
    if not value:
        return 'other'
    if 'ipad' in value or 'tablet' in value or 'sm-t' in value:
        return 'tablet'
    if any(token in value for token in ['mobile', 'iphone', 'android', 'phone', 'opera mini', 'iemobile']):
        return 'mobile'
    if any(token in value for token in ['windows', 'macintosh', 'mac os', 'linux', 'x11', 'cros']):
        return 'desktop'
    return 'other'


def populate_device_type(apps, schema_editor):
    SecureDermaVisit = apps.get_model('secure_derma', 'SecureDermaVisit')
    for visit in SecureDermaVisit.objects.all().iterator():
        visit.device_type = classify_device(getattr(visit, 'user_agent', ''))
        visit.save(update_fields=['device_type'])


class Migration(migrations.Migration):

    dependencies = [
        ('secure_derma', '0009_securedermavisit'),
    ]

    operations = [
        migrations.AddField(
            model_name='securedermavisit',
            name='device_type',
            field=models.CharField(choices=[('mobile', 'Mobile'), ('tablet', 'Tablet'), ('desktop', 'Desktop'), ('other', 'Other')], db_index=True, default='other', max_length=20),
        ),
        migrations.RunPython(populate_device_type, migrations.RunPython.noop),
    ]
