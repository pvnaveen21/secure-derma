import { Svgs } from '@app/shared/assets/svgs';

const images = 'assets/images';
const login = `${images}/login`;
const common = `${images}/common`;
const home = `${images}/home`;
const logo = `${images}/logo`;

export const Assets = {
  login: {
    star: Svgs.star,
    emerald_icon: Svgs.emerald_icon,
    logo: Svgs.logo,
    goldBis: `${login}/gold-bis.png`,
    goldPattern: `${login}/gold_pattern.png`,
    loginBtn: `${login}/login-btn.png`,
    changePassword: Svgs.changePassword,
    searchProduct: Svgs.searchProduct,
    backGround: `${login}/background.svg`,
    emerald: Svgs.emerald,
    favIcon: `${logo}/adminFavicon.svg`,
    aiRoundImage: Svgs.aiRoundImage,
    aiImage: Svgs.aiImage

  },
  common: {
    diamond: `${common}/diamond-icon.svg`,
    eclipse: `${common}/eclipse.svg`,
    viewAllStar: `${common}/view-all-star.svg`,
    smallStar: Svgs.small_star,
    successTick: Svgs.success_tick,
    successPop: `${common}/success-pop.gif`,
    gallery: Svgs.gallery,
    lock: `${common}/lock.svg`,
    delete: Svgs.delete_image

  },
  home: {
    exhibition: `${home}/exhibition.svg`,
    invoice: `${home}/invoice.svg`,
    dealers: `${home}/dealers.svg`,
    star: `${home}/star.svg`,
    videos: `${home}/videos.svg`,
    users: `${home}/users.svg`,
    excutives: `${home}/executive.svg`,
    retailers: `${home}/retailer.svg`,
    orders: `${home}/order.svg`,
    whishlist: `${home}/wishlist.svg`,
    banners: `${home}/banner.svg`,
    collectionVideos: `${home}/videos.svg`,
    flyers: `${home}/flyers.svg`,
    keywords: `${home}/keywords.svg`,
    exclusive: `${home}/exclusive.svg`,
    special: `${home}/special.svg`,
    product: `${home}/product.svg`,
    dealerReport: `${home}/dealerReport.svg`,
    executiveReport: `${home}/executiveReport.svg`,
    profile: `${home}/profile.svg`,
    support: `${home}/support.svg`,
    logout: `${home}/logout.svg`,
    dashboard: `${home}/dashboard.svg`,

  },
  preference: {
    add: Svgs.add_preference
  }
}
