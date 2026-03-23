from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("send_otp", "0004_otprecord_request_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="otprecord",
            name="channel",
            field=models.CharField(
                choices=[("phone", "Phone"), ("email", "Email")],
                default="phone",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="otprecord",
            name="email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
    ]
