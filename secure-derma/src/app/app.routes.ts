import { Routes } from '@angular/router';
import { PortalComponent } from './portal/portal.component';

export const routes: Routes = [
    {
        path: '',
        component: PortalComponent,
        children: [
            {
                path: '',
                loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
            },

            {
                path: 'collections',
                loadComponent: () => import('./collections/collections-landing.component').then(m => m.CollectionsLandingComponent),
            },

            {
                path: 'collections/:slug',
                loadComponent: () => import('./collections/collections.component').then(m => m.CollectionsComponent),
            },
            {
                path: 'products/:slug',
                loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent),
            },
            {
                path: 'checkout',
                loadComponent: () => import('./checkout/checkout.component').then(m => m.CheckoutComponent),
            },
            {
                path: 'account',
                loadComponent: () => import('./account/account.component').then(m => m.AccountComponent),
            },
            {
                path: 'account/login',
                loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
            },
            {
                path: 'account/orders/:orderId',
                loadComponent: () => import('./account/account.component').then(m => m.AccountComponent),
            },
            {
                path: 'account/:section',
                loadComponent: () => import('./account/account.component').then(m => m.AccountComponent),
            },
            {
                path: '**',
                loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent),
            },
        ]
    }
];
