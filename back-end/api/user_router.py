from django.urls import path

from secure_derma.views import BrandListAPIView, CollectionBannerAPIView, ConcernProductsAPIView, HairBannerAPIView, HomeProductTypeAPIView, ImagesAPIView, LandingPageImagesAPIView, ProductDetailAPIView, ProductListWithFiltersAPIView, ProductSideMenuAPIView, RoutineBuilderAPIView, SkinBannerAPIView, SupplementBannerAPIView, TopBrandsAPIView, TrendingProductsFastAPIView
from send_otp.views import SendOTPView, VerifyOTPView

urlpatterns = [
    path("auth/sendotp/", SendOTPView.as_view()),
    path("auth/otp-verify/", VerifyOTPView.as_view()),
    path('brands/', BrandListAPIView.as_view()),
    path('top-brands/',TopBrandsAPIView.as_view()),
    path('product-types/home/', HomeProductTypeAPIView.as_view(), name='home-product-types'),
    path('images/landing-page/', LandingPageImagesAPIView.as_view(), name='landing-page-images'),
    path('images/', ImagesAPIView.as_view(), name='images'),
    path('products/trending/', TrendingProductsFastAPIView.as_view(), name='trending-products'),
    path('hair-banner/', HairBannerAPIView.as_view(), name='combined-banner'),
    path('skin-banner/', SkinBannerAPIView.as_view(), name='combined-banner'),
    path('supplement-banner/', SupplementBannerAPIView.as_view(), name='combined-banner'),
    path('collection-banner/', CollectionBannerAPIView.as_view(), name='combined-banner'),
    path('concern-products/', ConcernProductsAPIView.as_view(), name='concern-products'),
    path('routine-builder/', RoutineBuilderAPIView.as_view(), name='routine-builder'),
    # path('filter-products/', FilterProductsAPIView.as_view(), name='filter-products'),
    path('filter-products/', ProductListWithFiltersAPIView.as_view(), name='filter-products'),
    path("products/<slug:slug>/", ProductDetailAPIView.as_view(), name="product-detail"),
    path("products-side-menu-filter/", ProductSideMenuAPIView.as_view(), name="product-side-menu"),
]
