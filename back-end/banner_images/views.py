from rest_framework import generics
from .models import ImageFile
from .serializers import ImageFileSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import  IsAuthenticated, IsAdminUser



class ImageCreateView(generics.CreateAPIView):
    queryset = ImageFile.objects.all()
    serializer_class = ImageFileSerializer
    parser_classes = (MultiPartParser, FormParser)  # <-- important


class ImageListView(generics.ListAPIView):
    serializer_class = ImageFileSerializer

    def get_queryset(self):
        queryset = ImageFile.objects.filter(is_deleted=False)

        # filter by banner_type (single or multiple)
        banner_type = self.request.query_params.get("banner_type")
        if banner_type:
            banner_types = banner_type.split(",")  
            queryset = queryset.filter(type__in=banner_types)

        # sorting
        sort_field = self.request.query_params.get("sort")
        if sort_field:
            queryset = queryset.order_by(sort_field)

        return queryset

class GroupedImageListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        images = ImageFile.objects.filter(is_deleted=False)
        all_types = [choice[0] for choice in ImageFile.TYPE_CHOICES]
        grouped = {t: [] for t in all_types}

        for img in images:
            serializer = ImageFileSerializer(img, context={"request": request}).data
            grouped[img.type].append(serializer)

        return Response(grouped)




class ImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ImageFile.objects.all()
    serializer_class = ImageFileSerializer

    # Soft delete override
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
