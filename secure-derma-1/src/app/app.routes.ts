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
                path: 'collections/:slug',
                loadComponent: () => import('./collections/collections.component').then(m => m.CollectionsComponent),
            },
            {
                path: 'products/:slug',
                loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent),
            },
            {
                path: 'account/login',
                loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
            },
        ]
    }
];
