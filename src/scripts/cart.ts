// Košík — uložený v localStorage, sdílený všemi stránkami
export interface CartItem {
  slug: string;
  quantity: number;
}

const KEY = "bbcraft-cart";
const MAX_QTY = 9;

export function getCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (i) =>
        i &&
        typeof i.slug === "string" &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    );
  } catch {
    return [];
  }
}

function save(cart: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  document.dispatchEvent(new CustomEvent("cart:updated"));
}

export function addToCart(slug: string, quantity = 1) {
  const cart = getCart();
  const item = cart.find((i) => i.slug === slug);
  if (item) {
    item.quantity = Math.min(MAX_QTY, item.quantity + quantity);
  } else {
    cart.push({ slug, quantity: Math.min(MAX_QTY, quantity) });
  }
  save(cart);
}

export function setQuantity(slug: string, quantity: number) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter((i) => i.slug !== slug);
  } else {
    const item = cart.find((i) => i.slug === slug);
    if (item) item.quantity = Math.min(MAX_QTY, quantity);
  }
  save(cart);
}

export function removeFromCart(slug: string) {
  save(getCart().filter((i) => i.slug !== slug));
}

export function clearCart() {
  save([]);
}

export function cartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}
