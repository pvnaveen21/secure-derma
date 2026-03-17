import { Icons } from "../shared/icons";


// const assets = Assets;
const icons = Icons



export const SideMenu: { [key: string]: any[] } = {

    "": [
        {
            title: 'Dashboard',
            icon: icons.sideMenu.layoutGrid,
            routerLink: '/dashboard',
            currentUrl: ['dashboard'],
            permissions: [1]
        },
    ],
    "Manage": [
        {
            title: 'Banners',
            icon: icons.sideMenu.presentation,
            routerLink: '/banners',
            currentUrl: ['banners'],
            permissions: [1]
        },
        {
            title: 'Brands',
            icon: icons.sideMenu.userCog,
            routerLink: '/brands',
            currentUrl: ['brands'],
            permissions: [1]
        },
        {
            title: 'Categories',
            icon: icons.sideMenu.userCog,
            routerLink: '/categories',
            currentUrl: ['categories'],
            permissions: [1]
        },
        {
            title: 'Product Type',
            icon: icons.sideMenu.userCheck,
            routerLink: '/product-type',
            currentUrl: ['product-type'],
            permissions: [1]
        },
        {
            title: 'Skin Concern',
            icon: icons.sideMenu.userCheck,
            routerLink: '/skin-concern',
            currentUrl: ['skin-concern'],
            permissions: [1]
        },
        {
            title: 'Hair Concern',
            icon: icons.sideMenu.userCheck,
            routerLink: '/hair-concern',
            currentUrl: ['hair-concern'],
            permissions: [1]
        },
        {
            title: 'Ingredient',
            icon: icons.sideMenu.userCheck,
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
            icon: icons.sideMenu.boxes,
            routerLink: '/review',
            currentUrl: ['review'],
            permissions: [1]
        },
        {
            title: 'Orders',
            icon: icons.sideMenu.package,
            routerLink: '/orders',
            currentUrl: ['orders'],
            permissions: [1]
        },
        // {
        //     title: 'Executives',
        //     icon: icons.sideMenu.userCheck,
        //     routerLink: '/executives',
        //     currentUrl: ['executives'],
        //     permissions: [1]
        // },
        // {
        //     title: 'SIS Users',
        //     icon: icons.sideMenu.warehouse,
        //     routerLink: '/sis-user',
        //     currentUrl: ['sis-user'],
        //     permissions: [1]
        // },
        // {
        //     title: 'Retailers',
        //     icon: icons.sideMenu.store,
        //     routerLink: '/retailers',
        //     currentUrl: ['retailers'],
        //     permissions: [1]
        // },
        // {
        //     title: 'Share',
        //     icon: icons.sideMenu.share2,
        //     routerLink: '/share',
        //     currentUrl: ['share'],
        //     permissions: [1, 6, 7, 9]

        // },
        // {
        //     title: 'Wishlist Approval',
        //     icon:icons.sideMenu.archive,
        //     routerLink: '/wishlist-approval',
        //     currentUrl: ['wishlist-approval']
        // },
        // {
        //     title: 'Collection Videos',
        //     icon: icons.sideMenu.video,
        //     routerLink: '/collection-videos',
        //     currentUrl: ['collection-videos'],
        //     permissions: [1]
        // },
        // {
        //     title: 'Feedback',
        //     icon: icons.sideMenu.feedback,
        //     routerLink: '/feedback',
        //     currentUrl: ['feedback'],
        //     permissions: [1]
        // }
    ],
    

    
    "Account": [
        // {
        //     title: 'Profile',
        //     icon: icons.sideMenu.user,
        //     routerLink: '/profile',
        //     currentUrl: ['profile'],
        //     permissions: [1, 6, 7, 9]
        // },
        // {
        //     title: 'Maintenance',
        //     icon: icons.sideMenu.maintenance,
        //     routerLink: '/maintenance',
        //     currentUrl: ['maintenance'],
        //     permissions: [1, 6, 7, 9]
        // },
        // {
        //     title: 'Support',
        //     icon: icons.sideMenu.help,
        //     routerLink: '/support',
        //     currentUrl: ['support'],
        //     permissions: [1, 6, 7, 9]
        // },
        {
            title: 'Logout',
            icon: icons.sideMenu.logout,
            currentUrl: ['logout'],
            permissions: [1, 6, 7, 9]

        }
    ]

}
