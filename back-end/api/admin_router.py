from django.urls import path
from banner_images.views import GroupedImageListView, ImageCreateView, ImageDetailView, ImageListView
from brand.views import AddTopBrandAPIView, BrandDetailAPIView, BrandListCreateAPIView, RemoveTopBrandAPIView
from categorie.views import CategoryDetailAPIView, CategoryListCreateAPIView
from hair_concern.views import HairConcernsDetailAPIView, HairConcernsListCreateAPIView
from ingredient.views import IngredientDetailAPIView, IngredientListCreateAPIView
from product.views import ProductDetailAPIView, ProductDetailDeleteAPIView, ProductImageDeleteAPIView, ProductListCreateAPIView, ProductReviewImageDeleteAPIView, ProductReviewListCreateAPIView, ProductReviewRUDAPIView
from product_type.views import ProductTypeDetailAPIView, ProductTypeListCreateAPIView
from skin_concern.views import SkinConcernsDetailAPIView, SkinConcernsListCreateAPIView
from user.views import AdminLoginApiView, AdminTokenRefreshView  , AdminDetailApiView, google_login  

urlpatterns = [
    path('auth/login/', AdminLoginApiView.as_view()),
    path('auth/token/refresh/', AdminTokenRefreshView.as_view()),
    path('users/user/me/', AdminDetailApiView.as_view()),
    path('auth/google/', google_login),


    # Brands
    path('brands/', BrandListCreateAPIView.as_view()),
    path('brands/<int:pk>/', BrandDetailAPIView.as_view()),
    
    
    # Top Brand actions
    # path('brands/top/', TopBrandListAPIView.as_view()),
    path('brands/<int:pk>/add-top-brand/', AddTopBrandAPIView.as_view()),
    path('brands/<int:pk>/remove-top-brand/', RemoveTopBrandAPIView.as_view()),
    
    
    #Categories
    path('categories/', CategoryListCreateAPIView.as_view()),           
    path('categories/<int:pk>/', CategoryDetailAPIView.as_view()) ,

    # Product Type
    path('product-types/', ProductTypeListCreateAPIView.as_view()),
    path('product-types/<int:pk>/', ProductTypeDetailAPIView.as_view()),

    # Skin Concerns
    path('skin-concerns/', SkinConcernsListCreateAPIView.as_view()),
    path('skin-concerns/<int:pk>/', SkinConcernsDetailAPIView.as_view()),
    
    # Hair Concerns
    path('hair-concerns/', HairConcernsListCreateAPIView.as_view()),
    path('hair-concerns/<int:pk>/', HairConcernsDetailAPIView.as_view()),
    
    # ingredient
    path('ingredient/', IngredientListCreateAPIView.as_view()),
    path('ingredient/<int:pk>/', IngredientDetailAPIView.as_view()),

    # Images
    path('images/', ImageListView.as_view()),
    path('images/create/', ImageCreateView.as_view()),
    path("images/grouped/", GroupedImageListView.as_view()),
    path('images/<int:pk>/', ImageDetailView.as_view()),
    
    
    # Products CRUD
    path('products/', ProductListCreateAPIView.as_view()),
    path('products/<int:pk>/', ProductDetailAPIView.as_view()),

    # Delete single product detail row
    path('products/details/<int:pk>/', ProductDetailDeleteAPIView.as_view()),

    # Delete single image
    path('products/images/<int:pk>/', ProductImageDeleteAPIView.as_view()),
    
    path("products/<int:product_id>/reviews/", 
         ProductReviewListCreateAPIView.as_view(), 
         name="review-list-create"),

    # Retrieve + Update + Delete
    path("reviews/<int:pk>/", 
         ProductReviewRUDAPIView.as_view(), 
         name="review-detail"),
        # Retrieve + Update + Delete
    path("reviews/images/<int:pk>/", 
         ProductReviewImageDeleteAPIView.as_view(), 
         name="review-detail"),
]