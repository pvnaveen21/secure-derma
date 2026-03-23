import { ArrowRightIcon, BadgeCheckIcon, BadgeIndianRupeeIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, HandbagIcon, HouseIcon, IndianRupeeIcon, LayoutGridIcon, LocateFixed, LogOutIcon, MailIcon, MapPinIcon, MenuIcon, MinusIcon, MoonIcon, PackageIcon, PhoneIcon, PlusIcon, ReceiptIndianRupeeIcon, RotateCcwIcon, SearchIcon, SendToBackIcon, ShieldCheckIcon, SquareArrowLeft, SunIcon, TagIcon, TruckElectricIcon, TruckIcon, UserIcon, XIcon } from 'lucide-angular';

export const Icons = {
  theme: {
    light: SunIcon,
    dark: MoonIcon,
  },
  header: {
    search: SearchIcon,
    close: XIcon,
    down: ChevronDownIcon,
    user: UserIcon,
    handbag: HandbagIcon,
    rightArrow: ChevronRightIcon,
    menu: MenuIcon,
    plus: PlusIcon,
    minus: MinusIcon,
    home: HouseIcon,
    categories: LayoutGridIcon,
    shop: TagIcon,

  },
  feature: {
    truckElectric: TruckElectricIcon,
    badgeIndianRupee: BadgeIndianRupeeIcon,
    sendToBack: SendToBackIcon,
    badge: BadgeCheckIcon,
  },
  chevron: {
    leftIcon: ChevronLeftIcon,
    rightIcon: ChevronRightIcon,
    downIcon: ChevronDownIcon,
    upIcon: ChevronUpIcon,
  },
  product:{
    close: XIcon,
    locateFixed: LocateFixed,
    rupee: IndianRupeeIcon,
    map: MapPinIcon,
    next: ChevronRightIcon,
    truck: TruckIcon,
    badge: BadgeCheckIcon,
    squareArrowLeft: SquareArrowLeft,
  },
  auth: {
    phone: PhoneIcon,
    shield: ShieldCheckIcon,
    back: ChevronLeftIcon,
    resend: RotateCcwIcon,
    action: ArrowRightIcon,
  },
  account: {
    user: UserIcon,
    orders: PackageIcon,
    address: MapPinIcon,
    contact: MailIcon,
    security: ShieldCheckIcon,
    logout: LogOutIcon,
  }
}
