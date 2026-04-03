from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("send_otp", "0005_otprecord_channel_otprecord_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="otprecord",
            name="delivery_message",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="otprecord",
            name="delivery_payload",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="otprecord",
            name="delivery_status",
            field=models.CharField(default="pending", max_length=32),
        ),
        migrations.AddField(
            model_name="otprecord",
            name="delivery_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
