from django.db import migrations, models
import django.utils.timezone


def backfill_review_date(apps, schema_editor):
    ProductReview = apps.get_model("product", "ProductReview")

    for review in ProductReview.objects.all():
        if review.created_at:
            review.review_date = django.utils.timezone.localtime(review.created_at).date()
        else:
            review.review_date = django.utils.timezone.localdate()
        review.save(update_fields=["review_date"])


class Migration(migrations.Migration):

    dependencies = [
        ("product", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="productreview",
            name="review_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_review_date, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="productreview",
            name="review_date",
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
    ]
