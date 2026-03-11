export interface Product {
  id: number;
  is_previous_order: boolean;
  making_percentage: number;
  name: string;
  product_id: string;
  tags?: string[];
  weight: number;
  quantity?: number;
  is_wishlist_added?: boolean;
  cart_variant?: {
    id: number,
    cart_id: number,
    product_variant_id: number,
    product_variant__product_id: number
  };
  wishlist?: {
    product_variant__product_id: Number,
    is_active: Boolean,
    created_at: Date
  }
}

export interface Color {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Size {
  id: number,
  size: string
}

export interface Config {
  id: any;
  config_name: string;
  is_active: boolean;
}

export interface Style {
  id: number;
  style_name: string;
}
