"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, X, Tag, Check } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatProductPrice } from "./bestseller-grid";
import { useLanguage } from "@/components/providers/language-provider";

export interface CartDrawerProps {
  currency?: string;
  freeShippingThreshold?: number | null;
  shippingFee?: number;
}

export function CartDrawer({
  currency = "USD",
  freeShippingThreshold = null,
  shippingFee = 0,
}: CartDrawerProps) {
  const { items, subtotal, isOpen, closeCart, setQuantity, removeItem, clear } = useCart();
  const { lang, t } = useLanguage();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

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

  const applyCoupon = async () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean || couponBusy) return;
    setCouponBusy(true);
    setCouponMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, subtotal }),
      });
      const data: {
        valid?: boolean;
        error?: string;
        discountAmount?: number;
        finalTotal?: number;
        coupon?: { code: string };
      } = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        setCouponMessage(
          data.error || t({ tr: "Geçersiz kupon kodu.", en: "Invalid coupon code." })
        );
        return;
      }
      setAppliedCoupon({
        code: data.coupon?.code || clean,
        discountAmount: Number(data.discountAmount || 0),
        finalTotal: Number(data.finalTotal ?? subtotal),
      });
      setCouponMessage(
        t({ tr: "Kupon başarıyla uygulandı.", en: "Coupon applied." })
      );
    } catch {
      setCouponMessage(
        t({ tr: "Kupon doğrulanamadı.", en: "Failed to validate coupon." })
      );
    } finally {
      setCouponBusy(false);
    }
  };

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
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
          lang,
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
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const qualifiesFreeShipping =
    typeof freeShippingThreshold === "number" &&
    freeShippingThreshold > 0 &&
    discountedSubtotal >= freeShippingThreshold;
  const remainingForFreeShipping =
    typeof freeShippingThreshold === "number" && freeShippingThreshold > 0
      ? Math.max(0, freeShippingThreshold - discountedSubtotal)
      : 0;
  const resolvedShippingFee =
    qualifiesFreeShipping ? 0 : Math.max(0, Number(shippingFee || 0));
  const finalPayable = Math.max(0, discountedSubtotal + resolvedShippingFee);

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
                {t({ tr: "Çanta", en: "Bag" })} ({items.reduce((n, i) => n + i.quantity, 0)})
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label={t({ tr: "Çantayı kapat", en: "Close shopping bag" })}
                className="min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-black/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {typeof freeShippingThreshold === "number" && freeShippingThreshold > 0 && items.length > 0 && (
              <div className="px-5 py-2.5 bg-black/5 border-b border-black/10 font-mono text-[11px] uppercase tracking-wider">
                {qualifiesFreeShipping ? (
                  <span className="font-bold text-black">
                    {t({ tr: "ÜCRETSİZ KARGO HAKKI KAZANDINIZ", en: "FREE SHIPPING UNLOCKED" })}
                  </span>
                ) : (
                  <span>
                    {t({
                      tr: `Ücretsiz kargo için ${formatProductPrice(remainingForFreeShipping, currency)} kaldı`,
                      en: `${formatProductPrice(remainingForFreeShipping, currency)} away from free shipping`,
                    })}
                  </span>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="font-mono text-sm uppercase tracking-widest">{t({ tr: "Çantanız boş", en: "Your bag is empty" })}</p>
                <button
                  type="button"
                  onClick={() => {
                    closeCart();
                    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="min-h-[44px] px-4 font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:opacity-70 cursor-pointer"
                >
                  {t({ tr: "Alışverişe devam et →", en: "Continue shopping →" })}
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
                                {t({ tr: "Beden:", en: "Size:" })} {item.variant}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, item.variant)}
                            aria-label={`Remove ${item.name} from bag`}
                            className="min-w-11 min-h-11 -mt-1 -mr-1 flex items-center justify-center shrink-0 hover:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded"
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
                              className="min-w-11 min-h-11 flex items-center justify-center hover:bg-black/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
                              className="min-w-11 min-h-11 flex items-center justify-center hover:bg-black/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
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

                <footer className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-black/15 space-y-3">
                  {/* Coupon Input Box */}
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder={t({ tr: "KUPON KODU", en: "COUPON CODE" })}
                          aria-label={t({ tr: "Kupon kodu", en: "Coupon code" })}
                          className="w-full min-h-[44px] pl-8 pr-3 bg-white border border-black/20 font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-black"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponBusy || !couponInput.trim()}
                        className="min-h-[44px] px-4 border border-black bg-black text-[#FAF8F3] font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                      >
                        {couponBusy
                          ? "..."
                          : appliedCoupon
                          ? <Check className="w-4 h-4" />
                          : t({ tr: "UYGULA", en: "APPLY" })}
                      </button>
                    </div>
                    {couponMessage && (
                      <p className="font-mono text-[11px] text-neutral-600">
                        {couponMessage}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 font-mono text-xs uppercase tracking-wider">
                    <div className="flex justify-between">
                      <span>{t({ tr: "Ara Toplam", en: "Subtotal" })}</span>
                      <span>{formatProductPrice(subtotal, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>{t({ tr: "İndirim", en: "Discount" })} ({appliedCoupon?.code})</span>
                        <span>-{formatProductPrice(discountAmount, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-black/10">
                      <span>{t({ tr: "Toplam", en: "Total" })}</span>
                      <span>{formatProductPrice(finalPayable, currency)}</span>
                    </div>
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
                    className="w-full min-h-12 bg-black text-[#FAF8F3] font-mono text-xs font-bold uppercase tracking-widest py-3.5 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-wait transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
                  >
                    {busy
                      ? t({ tr: "İŞLENİYOR...", en: "PROCESSING..." })
                      : t({ tr: "WHATSAPP İLE SİPARİŞ VER", en: "ORDER VIA WHATSAPP" })}
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="w-full min-h-[44px] py-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500 hover:text-black underline underline-offset-4 cursor-pointer"
                  >
                    {t({ tr: "Çantayı temizle", en: "Clear bag" })}
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
