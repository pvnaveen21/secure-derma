import { Routes } from '@angular/router';
import { PortalComponent } from './portal/portal.component';

export const routes: Routes = [
  {
    path: '',
    component: PortalComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
        data: {
          seo: {
            title: 'Dermatologist Recommended Skin, Hair & Wellness Store',
            description: 'Shop dermatologist-recommended skin care, hair care, supplements, and pediatric essentials at Secure Derma with trusted brands and clear product guidance.',
            canonicalPath: '/',
            type: 'website',
            keywords: 'secure derma, skin care, hair care, supplements, pediatric care, dermatologist recommended products'
          }
        }
      },
      {
        path: 'collections',
        loadComponent: () => import('./collections/collections-landing.component').then((m) => m.CollectionsLandingComponent),
        data: {
          seo: {
            title: 'Shop Collections',
            description: 'Browse Secure Derma collections across skin care, hair care, wellness, and dermatologist-recommended routines.',
            canonicalPath: '/collections',
            type: 'website',
            keywords: 'secure derma collections, skincare collections, haircare collections, wellness products'
          }
        }
      },
      {
        path: 'collections/:slug',
        loadComponent: () => import('./collections/collections.component').then((m) => m.CollectionsComponent),
      },
      {
        path: 'products/:slug',
        loadComponent: () => import('./products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./public-page/public-page.component').then((m) => m.PublicPageComponent),
        data: {
          seo: {
            title: 'About Secure Derma',
            description: 'Learn how Secure Derma curates dermatologist-recommended skin care, hair care, wellness, and pediatric essentials.',
            canonicalPath: '/about',
            type: 'website',
            keywords: 'about secure derma, dermatologist recommended skincare store, secure derma about'
          },
          page: {
            title: 'About Secure Derma',
            eyebrow: 'Who We Are',
            summary: 'Secure Derma is built to make dermatologist-recommended skin, hair, wellness, and pediatric shopping easier to understand, easier to trust, and easier to repeat.',
            actions: [
              { label: 'Shop Collections', route: '/collections' },
              { label: 'Contact Support', route: '/contact' }
            ],
            sections: [
              {
                title: 'Curated with clinical intent',
                body: 'We focus on practical, dermatologist-aligned product discovery instead of overwhelming catalog browsing. The goal is to help shoppers move from concern to routine with less friction.'
              },
              {
                title: 'What you can shop',
                bullets: [
                  'Skin care organized by concern, product type, and brand',
                  'Hair care guided by scalp and strand needs',
                  'Wellness and supplement essentials for routine support',
                  'Pediatric care collections for everyday family needs'
                ]
              },
              {
                title: 'Why trust matters here',
                body: 'A high-performing health and beauty store is not only about design or pricing. It also needs clarity, authenticity, support accessibility, and a navigation structure that helps people find the right products fast.'
              },
              {
                title: 'How we support discovery',
                bullets: [
                  'Clear collection landing pages',
                  'Product detail pages with practical context',
                  'Support and FAQ pages for common purchase questions',
                  'Internal linking that helps both customers and search engines understand the site structure'
                ]
              }
            ]
          }
        }
      },
      {
        path: 'contact',
        loadComponent: () => import('./public-page/public-page.component').then((m) => m.PublicPageComponent),
        data: {
          seo: {
            title: 'Contact Secure Derma',
            description: 'Reach Secure Derma support for order help, delivery questions, product guidance, and general assistance.',
            canonicalPath: '/contact',
            type: 'website',
            keywords: 'contact secure derma, secure derma support, order help, delivery support'
          },
          page: {
            title: 'Contact Secure Derma',
            eyebrow: 'Support',
            summary: 'Need help with an order, delivery, returns, or product selection? Reach the Secure Derma support team through the channels below.',
            actions: [
              { label: 'Email Support', href: 'mailto:support@securederma.in' },
              { label: 'Read FAQs', route: '/faqs' }
            ],
            sections: [
              {
                title: 'Support email',
                body: 'Email support@securederma.in for order updates, delivery questions, returns guidance, and general support queries.'
              },
              {
                title: 'Support hours',
                body: 'Customer support is available Monday to Saturday from 9:00 AM to 8:00 PM.'
              },
              {
                title: 'Best reasons to contact us',
                bullets: [
                  'Order tracking or delivery updates',
                  'Returns, replacements, or damaged-order support',
                  'Product availability and routine guidance',
                  'Checkout, payment, or account-access issues'
                ]
              },
              {
                title: 'Before you write in',
                bullets: [
                  'Keep your order number ready if your query is about an existing purchase',
                  'Include the product name or page link for product-specific questions',
                  'Check the FAQ and shipping information pages for quicker answers'
                ]
              }
            ]
          }
        }
      },
      {
        path: 'faqs',
        loadComponent: () => import('./public-page/public-page.component').then((m) => m.PublicPageComponent),
        data: {
          seo: {
            title: 'Secure Derma FAQs',
            description: 'Read common Secure Derma FAQs about orders, delivery, returns, products, and account support.',
            canonicalPath: '/faqs',
            type: 'website',
            keywords: 'secure derma faqs, order faq, delivery faq, returns faq'
          },
          page: {
            title: 'Secure Derma FAQs',
            eyebrow: 'Help Center',
            summary: 'Quick answers to the most common customer questions about shopping, delivery, returns, and account support.',
            actions: [
              { label: 'Contact Support', route: '/contact' },
              { label: 'Shipping & Returns', route: '/shipping-returns' }
            ],
            sections: [
              {
                title: 'What this page covers',
                body: 'This FAQ page is designed to answer the recurring pre-purchase and post-purchase questions that customers usually search for before contacting support.'
              }
            ],
            faqs: [
              {
                question: 'How do I track my Secure Derma order?',
                answer: 'You can review your order status from your account once you are signed in. If you need additional help, contact support with your order number.'
              },
              {
                question: 'How long does delivery usually take?',
                answer: 'Delivery timelines can vary by location and serviceability. Check your pincode on the product page or contact support if you need a delivery estimate for a specific order.'
              },
              {
                question: 'Can I return or replace an item?',
                answer: 'Return and replacement eligibility depends on the product type and order condition. Review the shipping and returns page or contact support for order-specific guidance.'
              },
              {
                question: 'How do I choose the right product for my concern?',
                answer: 'Use collection pages, concern-based navigation, product details, and ingredient context to narrow choices. If you still need help, contact support with the concern and product category you are shopping.'
              },
              {
                question: 'Do I need an account to place an order?',
                answer: 'You may be prompted to sign in during checkout to complete and manage your order more easily.'
              }
            ]
          }
        }
      },
      {
        path: 'shipping-returns',
        loadComponent: () => import('./public-page/public-page.component').then((m) => m.PublicPageComponent),
        data: {
          seo: {
            title: 'Shipping and Returns',
            description: 'Read Secure Derma shipping, delivery, and returns guidance before or after placing an order.',
            canonicalPath: '/shipping-returns',
            type: 'website',
            keywords: 'secure derma shipping, secure derma returns, delivery information, return policy'
          },
          page: {
            title: 'Shipping and Returns',
            eyebrow: 'Policies',
            summary: 'A clear support page for delivery expectations, order handling, and return-related questions.',
            actions: [
              { label: 'Check FAQs', route: '/faqs' },
              { label: 'Contact Support', route: '/contact' }
            ],
            sections: [
              {
                title: 'Shipping guidance',
                bullets: [
                  'Delivery timelines vary by destination and service coverage',
                  'Certain locations may have different delivery availability depending on pincode',
                  'Customers should use the pincode checker where available for location-specific delivery support'
                ]
              },
              {
                title: 'Order handling',
                bullets: [
                  'Order confirmation and progress are best tracked through your account',
                  'If an order needs support, keep your order number ready when contacting the team',
                  'Product availability can affect dispatch timing in some cases'
                ]
              },
              {
                title: 'Returns and replacements',
                bullets: [
                  'Eligibility depends on product condition and order context',
                  'If an order arrives damaged or incorrect, contact support promptly',
                  'Support can guide you on the next steps for approved return or replacement requests'
                ]
              },
              {
                title: 'Need help with a specific order?',
                body: 'For the fastest resolution, contact Secure Derma support and include your order number, the issue category, and any relevant product details.'
              }
            ]
          }
        }
      },
      {
        path: 'checkout',
        loadComponent: () => import('./checkout/checkout.component').then((m) => m.CheckoutComponent),
        data: {
          seo: {
            title: 'Checkout',
            description: 'Review your Secure Derma cart and complete your order with a streamlined checkout experience.',
            canonicalPath: '/checkout',
            robots: 'noindex,nofollow'
          }
        }
      },
      {
        path: 'account',
        loadComponent: () => import('./account/account.component').then((m) => m.AccountComponent),
        data: {
          seo: {
            title: 'My Account',
            description: 'Access your Secure Derma orders, saved details, and account preferences.',
            canonicalPath: '/account',
            robots: 'noindex,nofollow'
          }
        }
      },
      {
        path: 'account/login',
        loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
        data: {
          seo: {
            title: 'Login',
            description: 'Sign in to Secure Derma to manage orders, addresses, and your account details.',
            canonicalPath: '/account/login',
            robots: 'noindex,nofollow'
          }
        }
      },
      {
        path: 'account/orders/:orderId',
        loadComponent: () => import('./account/account.component').then((m) => m.AccountComponent),
        data: {
          seo: {
            title: 'Order Details',
            description: 'View your Secure Derma order details and order status.',
            robots: 'noindex,nofollow'
          }
        }
      },
      {
        path: 'account/:section',
        loadComponent: () => import('./account/account.component').then((m) => m.AccountComponent),
        data: {
          seo: {
            title: 'Account Section',
            description: 'Manage your Secure Derma account settings and history.',
            robots: 'noindex,nofollow'
          }
        }
      },
      {
        path: '**',
        loadComponent: () => import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
        data: {
          seo: {
            title: 'Page Not Found',
            description: 'The page you requested could not be found on Secure Derma.',
            robots: 'noindex,follow'
          }
        }
      },
    ]
  }
];
