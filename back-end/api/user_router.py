from django.urls import path

from secure_derma.views import BrandListAPIView, CollectionBannerAPIView, ConcernProductsAPIView, CurrentLocationPincodeAPIView, HairBannerAPIView, HomeProductTypeAPIView, ImagesAPIView, LandingPageImagesAPIView, NewsletterSubscriptionAPIView, PincodeServiceabilityAPIView, ProductDetailAPIView, ProductListWithFiltersAPIView, ProductSideMenuAPIView, RazorpayCreateOrderAPIView, RazorpayVerifyPaymentAPIView, RoutineBuilderAPIView, SecureDermaCartAPIView, SecureDermaCartItemAPIView, SecureDermaCartSyncAPIView, SkinBannerAPIView, SupplementBannerAPIView, TopBrandsAPIView, TrendingProductsFastAPIView, UserOrderDetailAPIView, UserOrderListAPIView
from send_otp.views import SendOTPView, VerifyOTPView
from user.views import UserDetailApiView, UserTokenRefreshView, google_login

urlpatterns = [
    path("auth/sendotp/", SendOTPView.as_view()),
    path("auth/otp-verify/", VerifyOTPView.as_view()),
    path("auth/token/refresh/", UserTokenRefreshView.as_view()),
    path("auth/google/", google_login),
    path("users/user/me/", UserDetailApiView.as_view()),
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
    path('newsletter-subscriptions/', NewsletterSubscriptionAPIView.as_view(), name='newsletter-subscriptions'),
    path('cart/', SecureDermaCartAPIView.as_view(), name='secure-derma-cart'),
    path('cart/sync/', SecureDermaCartSyncAPIView.as_view(), name='secure-derma-cart-sync'),
    path('cart/items/', SecureDermaCartItemAPIView.as_view(), name='secure-derma-cart-item-create'),
    path('cart/items/<int:detail_id>/', SecureDermaCartItemAPIView.as_view(), name='secure-derma-cart-item-detail'),
    path('pincode/serviceability/', PincodeServiceabilityAPIView.as_view(), name='pincode-serviceability'),
    path('pincode/current-location/', CurrentLocationPincodeAPIView.as_view(), name='pincode-current-location'),
    path('payments/create-order/', RazorpayCreateOrderAPIView.as_view(), name='razorpay-create-order'),
    path('payments/verify/', RazorpayVerifyPaymentAPIView.as_view(), name='razorpay-verify-payment'),
    path('orders/', UserOrderListAPIView.as_view(), name='user-order-list'),
    path('orders/<int:pk>/', UserOrderDetailAPIView.as_view(), name='user-order-detail'),
    # path('filter-products/', FilterProductsAPIView.as_view(), name='filter-products'),
    path('filter-products/', ProductListWithFiltersAPIView.as_view(), name='filter-products'),
    path("products/<slug:slug>/", ProductDetailAPIView.as_view(), name="product-detail"),
    path("products-side-menu-filter/", ProductSideMenuAPIView.as_view(), name="product-side-menu"),
]
