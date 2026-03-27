import { Icons } from '../shared/icons';

const icons = Icons;

export const SideMenu: { [key: string]: any[] } = {
  '': [
    {
      title: 'Dashboard',
      icon: icons.sideMenu.layoutGrid,
      routerLink: '/dashboard',
      currentUrl: ['dashboard'],
      permissions: [1]
    }
  ],
  Manage: [
    {
      title: 'Users',
      icon: icons.sideMenu.userCog,
      routerLink: '/users-insights',
      currentUrl: ['users-insights'],
      permissions: [1]
    },
    {
      title: 'Banners',
      icon: icons.sideMenu.presentation,
      routerLink: '/banners',
      currentUrl: ['banners'],
      permissions: [1]
    },
    {
      title: 'Brands',
      icon: icons.sideMenu.tag,
      routerLink: '/brands',
      currentUrl: ['brands'],
      permissions: [1]
    },
    {
      title: 'Categories',
      icon: icons.sideMenu.grid2x2,
      routerLink: '/categories',
      currentUrl: ['categories'],
      permissions: [1]
    },
    {
      title: 'Product Type',
      icon: icons.sideMenu.badgePercent,
      routerLink: '/product-type',
      currentUrl: ['product-type'],
      permissions: [1]
    },
    {
      title: 'Skin Concern',
      icon: icons.sideMenu.scanSearch,
      routerLink: '/skin-concern',
      currentUrl: ['skin-concern'],
      permissions: [1]
    },
    {
      title: 'Hair Concern',
      icon: icons.sideMenu.scanSearch,
      routerLink: '/hair-concern',
      currentUrl: ['hair-concern'],
      permissions: [1]
    },
    {
      title: 'Ingredient',
      icon: icons.sideMenu.flaskConical,
      routerLink: '/ingredient',
      currentUrl: ['ingredient'],
      permissions: [1]
    },
    {
      title: 'Products',
      icon: icons.sideMenu.boxes,
      routerLink: '/products',
      currentUrl: ['products'],
      permissions: [1]
    },
    {
      title: 'Review',
      icon: icons.sideMenu.fileImage,
      routerLink: '/review',
      currentUrl: ['review'],
      permissions: [1]
    },
    {
      title: 'Orders',
      icon: icons.sideMenu.shoppingBag,
      routerLink: '/orders',
      currentUrl: ['orders'],
      permissions: [1]
    }
  ],
  Account: [
    {
      title: 'Logout',
      icon: icons.sideMenu.logout,
      currentUrl: ['logout'],
      permissions: [1, 6, 7, 9]
    }
  ]
};
