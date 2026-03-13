import { Routes } from '@angular/router';
import { authGuard } from './gurds/auth.guard';
import { loginGuard } from './gurds/login.guard';

export const routes: Routes = [
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () =>
            import('@app/portal/portal.component').then(c => c.PortalComponent),
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('@app/portal/dashboard/dashboard.component')
                        .then(c => c.DashboardComponent),
                // canActivate: [AdminGuard],
            },
            {
                path: 'banners',
                loadComponent: () =>
                    import('@app/portal/banners/banners.component')
                        .then(c => c.BannersComponent),
                // canActivate: [AdminGuard],
            },
            // MANAGE
            {
                path: 'brands',
                loadComponent: () =>
                    import('@app/portal/brand/brand.component')
                        .then(c => c.BrandComponent),
                // canActivate: [AdminGuard],
            },
            {
                path: 'categories',
                loadComponent: () =>
                    import('@app/portal/categorie/categorie.component')
                        .then(c => c.CategorieComponent),
                // canActivate: [AdminGuard],
            },
            {
                path: 'product-type',
                loadComponent: () =>
                    import('@app/portal/product-type/product-type.component')
                        .then(c => c.ProductTypeComponent),
                // canActivate: [AdminGuard],
            },
            {
                path: 'products',
                loadComponent: () =>
                    import('@app/portal/products/products.component')
                        .then(c => c.ProductsComponent),
                // canActivate: [AdminGuard],

            },
            {
                path: 'skin-concern',
                loadComponent: () =>
                    import('@app/portal/skin-concern/skin-concern.component')
                        .then(c => c.SkinConcernComponent),
                // canActivate: [AdminGuard],
            },
            {
                path: 'ingredient',
                loadComponent: () =>
                    import('@app/portal/ingredient/ingredient.component')
                        .then(c => c.IngredientComponent),
                // canActivate: [AdminGuard],
            },
            {
                path: 'hair-concern',
                loadComponent: () =>
                    import('@app/portal/hair-concern/hair-concern.component')
                        .then(c => c.HairConcernComponent),
                // canActivate: [AdminGuard],
            },

            {
                path: 'review',
                loadComponent: () =>
                    import('@app/portal/review/review.component')
                        .then(c => c.ReviewComponent),
                // canActivate: [AdminGuard],

            },
            {
                path: 'orders',
                loadComponent: () =>
                    import('@app/portal/orders/orders.component')
                        .then(c => c.OrdersComponent),
            },


        ],
    },
      {
        path: 'users',
        canActivate: [loginGuard],
        loadComponent: () =>
          import('@app/auth-pages/auth-pages.component')
            .then(c => c.AuthPagesComponent),
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          {
            path: 'login',
            loadComponent: () =>
              import('@app/auth-pages/login/login.component')
                .then(c => c.LoginComponent),
          },
        ],
      },
      {
        path: '**',
        loadComponent: () =>
          import('@app/error-pages/not-found/not-found.component')
            .then(c => c.NotFoundComponent),
      },
];
