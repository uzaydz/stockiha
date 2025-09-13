export type CartVariant = {
  colorId?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  colorImage?: string | null;
  sizeId?: string | null;
  sizeName?: string | null;
  selectedPrice?: number | null;
};

export type CartItem = {
  productId: string;
  organizationId?: string | null;
  name: string;
  slug?: string | null;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  variant?: CartVariant;
};

const STORAGE_KEY = 'bazaar_cart_v1';

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items;
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: items.reduce((n, i) => n + i.quantity, 0) } }));
  } catch {}
}

export function getCart(): CartItem[] {
  return read();
}

export function clearCart() {
  write([]);
}

export function addItem(item: CartItem) {
  const items = read();
  const idx = items.findIndex(
    (i) => i.productId === item.productId && i.variant?.colorId === item.variant?.colorId && i.variant?.sizeId === item.variant?.sizeId
  );
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity };
  } else {
    items.push(item);
  }
  write(items);
}

export function removeItem(productId: string, variant?: { colorId?: string | null; sizeId?: string | null }) {
  const items = read().filter(
    (i) => !(i.productId === productId && i.variant?.colorId === (variant?.colorId ?? i.variant?.colorId) && i.variant?.sizeId === (variant?.sizeId ?? i.variant?.sizeId))
  );
  write(items);
}

export function updateQuantity(productId: string, quantity: number, variant?: { colorId?: string | null; sizeId?: string | null }) {
  const items = read();
  const idx = items.findIndex(
    (i) => i.productId === productId && i.variant?.colorId === (variant?.colorId ?? i.variant?.colorId) && i.variant?.sizeId === (variant?.sizeId ?? i.variant?.sizeId)
  );
  if (idx >= 0) {
    if (quantity <= 0) items.splice(idx, 1);
    else items[idx] = { ...items[idx], quantity };
    write(items);
  }
}

export function getCount(): number {
  return read().reduce((n, i) => n + i.quantity, 0);
}

export function getSubtotal(): number {
  return read().reduce((s, i) => s + (Number(i.variant?.selectedPrice ?? i.unitPrice) * i.quantity), 0);
}

