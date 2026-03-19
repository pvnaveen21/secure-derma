from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("send_otp", "0003_otprecord_lock_until"),
    ]

    operations = [
        migrations.AddField(
            model_name="otprecord",
            name="request_id",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
