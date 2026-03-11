from django.db import models

class ImageFile(models.Model):
    image = models.ImageField(upload_to='uploads/')
    type = models.CharField(max_length=100)   # store type directly
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.id}"
