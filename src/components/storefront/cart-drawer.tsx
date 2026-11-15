"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatProductPrice } from "./bestseller-grid";

export function CartDrawer({ currency = "USD" }: { currency?: string }) {
  const { items, subtotal, isOpen, closeCart, setQuantity, removeItem, clear } = useCart();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, closeCart]);

  const checkout = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/order/whatsapp-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variant: i.variant || undefined,
            quantity: i.quantity,
          })),
        }),
      });
      const data: { success?: boolean; error?: string; redirectUrl?: string } =
        await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.redirectUrl) {
        setError(data.error || `Order service error (${res.status}).`);
        return;
      }
      window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const dur = reduce ? 0 : 0.35;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
            onClick={closeCart}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            className="absolute right-0 top-0 h-[100dvh] w-full max-w-md bg-[#FAF8F3] text-black flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-black/15">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
                Bag ({items.reduce((n, i) => n + i.quantity, 0)})
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close shopping bag"
                className="min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="font-mono text-sm uppercase tracking-widest">Your bag is empty</p>
                <button
                  type="button"
                  onClick={() => {
                    closeCart();
                    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:opacity-70"
                >
                  Continue shopping →
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto divide-y divide-black/10 px-5">
                  {items.map((item) => (
                    <li key={`${item.productId}::${item.variant ?? ""}`} className="flex gap-4 py-4">
                      <div className="relative w-20 h-24 shrink-0 bg-[#EDEDEF]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className={
                            item.image.includes("/assets/editorial/")
                              ? "object-cover"
                              : "object-contain p-2 mix-blend-multiply"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold uppercase tracking-wider truncate">
                              {item.name}
                            </p>
                            {item.variant && (
                              <p className="font-mono text-[11px] text-neutral-500 uppercase">
                                Size: {item.variant}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, item.variant)}
                            aria-label={`Remove ${item.name} from bag`}
                            className="min-w-9 min-h-9 -mt-1 -mr-1 flex items-center justify-center shrink-0 hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-black/30">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() => setQuantity(item.productId, item.variant, item.quantity - 1)}
                              className="min-w-9 min-h-9 flex items-center justify-center hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs w-7 text-center" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() => setQuantity(item.productId, item.variant, item.quantity + 1)}
                              className="min-w-9 min-h-9 flex items-center justify-center hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-mono text-xs font-bold">
                            {formatProductPrice(item.price * item.quantity, currency)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-black/15 space-y-3">
                  <div className="flex justify-between font-mono text-sm font-bold uppercase tracking-wider">
                    <span>Subtotal</span>
                    <span>{formatProductPrice(subtotal, currency)}</span>
                  </div>
                  {error && (
                    <p role="alert" className="font-mono text-xs text-red-700">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={checkout}
                    disabled={busy}
                    className="w-full min-h-12 bg-black text-[#FAF8F3] font-mono text-xs font-bold uppercase tracking-widest py-3.5 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-wait transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
                  >
                    {busy ? "PROCESSING..." : "ORDER VIA WHATSAPP"}
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="w-full py-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500 hover:text-black underline underline-offset-4"
                  >
                    Clear bag
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
