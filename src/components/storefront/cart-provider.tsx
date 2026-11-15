"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  /** Display-only snapshot. The server re-prices from the database at checkout. */
  price: number;
  variant: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, variant: string | null, quantity: number) => void;
  removeItem: (productId: string, variant: string | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "cyrux-cart-v1";
const MAX_QTY = 20;

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(v: unknown): v is CartItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.productId === "string" &&
    typeof o.name === "string" &&
    typeof o.image === "string" &&
    typeof o.price === "number" &&
    (o.variant === null || typeof o.variant === "string") &&
    typeof o.quantity === "number" &&
    o.quantity >= 1
  );
}

const sameLine = (a: CartItem, id: string, variant: string | null) =>
  a.productId === id && a.variant === variant;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated]);

  const addItem = useCallback<CartContextValue["addItem"]>((item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => sameLine(p, item.productId, item.variant));
      if (existing) {
        return prev.map((p) =>
          p === existing
            ? { ...p, quantity: Math.min(MAX_QTY, p.quantity + quantity) }
            : p
        );
      }
      return [...prev, { ...item, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>(
    (productId, variant, quantity) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((p) => !sameLine(p, productId, variant))
          : prev.map((p) =>
              sameLine(p, productId, variant)
                ? { ...p, quantity: Math.min(MAX_QTY, quantity) }
                : p
            )
      );
    },
    []
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>((productId, variant) => {
    setItems((prev) => prev.filter((p) => !sameLine(p, productId, variant)));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      isOpen,
      openCart,
      closeCart,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, isOpen, openCart, closeCart, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
