"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ShieldCheck, FileText, Truck, Scale } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export type LegalTabId = "privacy" | "terms" | "shipping" | "sales";

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabId;
}

interface LegalSection {
  index: string;
  title: { tr: string; en: string };
  body: { tr: string; en: string };
}

interface LegalTabConfig {
  id: LegalTabId;
  label: { tr: string; en: string };
  icon: React.ComponentType<{ className?: string }>;
  badge: { tr: string; en: string };
  sections: LegalSection[];
}

const LEGAL_DOCS: LegalTabConfig[] = [
  {
    id: "privacy",
    label: { tr: "Gizlilik & Çerez", en: "Privacy & Cookies" },
    icon: ShieldCheck,
    badge: { tr: "KVKK & GİZLİLİK POLİTİKASI", en: "PRIVACY & COOKIE POLICY" },
    sections: [
      {
        index: "01",
        title: {
          tr: "Veri Sorumlusu & Taahhüt",
          en: "Data Controller & Commitment",
        },
        body: {
          tr: "Cyrux Studio (Girne, Kuzey Kıbrıs) ziyaretçilerinin ve müşterilerinin kişisel verilerinin korunmasına en üst düzeyde önem verir. Verileriniz KVKK ve uluslararası veri koruma standartlarına tam uyum içinde işlenir.",
          en: "Cyrux Studio (Kyrenia, North Cyprus) treats the protection of customer and visitor personal data with utmost priority, in accordance with applicable data protection standards.",
        },
      },
      {
        index: "02",
        title: {
          tr: "İşlenen Veriler & Kullanım Amacı",
          en: "Collected Data & Purpose",
        },
        body: {
          tr: "Sipariş teyidi, beden danışmanlığı ve teslimat süreçlerinde WhatsApp veya formlar üzerinden ilettiğiniz ad, telefon numarası ve teslimat adresi yalnızca siparişin kusursuz tamamlanması amacıyla kullanılır.",
          en: "Name, phone number, and delivery address provided via WhatsApp or forms during ordering and sizing consultations are used solely to fulfill and dispatch your archival garments.",
        },
      },
      {
        index: "03",
        title: {
          tr: "Üçüncü Taraflarla Paylaşım",
          en: "Third-Party Disclosure",
        },
        body: {
          tr: "Kişisel verileriniz asla reklam veya pazarlama amacıyla üçüncü şahıslara satılmaz veya devredilmez. Bilgiler yalnızca yetkili kargo ve lojistik firmalarıyla zorunlu sevkiyat amacıyla paylaşılır.",
          en: "Your personal data is never sold or transferred to third parties for marketing purposes. Data is strictly shared with authorized logistics couriers solely for package delivery.",
        },
      },
      {
        index: "04",
        title: {
          tr: "Çerezler & Yerel Hafıza",
          en: "Cookies & Local Storage",
        },
        body: {
          tr: "Sitemizde kullanıcı deneyimini optimize etmek, dil tercihinizi (TR/EN) ve sepetinizi oturum boyunca hatırlamak için temel teknik çerezler ile yerel depolama kullanılmaktadır.",
          en: "Our site uses essential technical cookies and local storage solely to remember your preferred language (TR/EN) and keep track of items added to your shopping bag.",
        },
      },
    ],
  },
  {
    id: "terms",
    label: { tr: "Kullanım Koşulları", en: "Terms of Use" },
    icon: FileText,
    badge: { tr: "STÜDYO KULLANIM ŞARTLARI", en: "STUDIO TERMS OF SERVICE" },
    sections: [
      {
        index: "01",
        title: {
          tr: "Fikri Mülkiyet & Telif Hakları",
          en: "Intellectual Property Rights",
        },
        body: {
          tr: "Cyrux Studio bünyesinde sergilenen tüm grafikler, tipografiler, 3D modeller, koleksiyon isimleri ve fotoğraf çekimleri tescilli stüdyo mülkiyetidir. İzinsiz ticari kullanımı, kopyalanması veya taklit edilmesi yasaktır.",
          en: "All artworks, typography, 3D assets, collection names, and editorial imagery showcased by Cyrux Studio are proprietary works. Unauthorized duplication or commercial use is strictly prohibited.",
        },
      },
      {
        index: "02",
        title: {
          tr: "Sınırlı Arşiv Üretimi (Drops)",
          en: "Limited Archival Drops",
        },
        body: {
          tr: "Her Cyrux Studio koleksiyonu bağımsız bir sanat serisi olarak sınırlı sayıda üretilir. Bir drop tükendiğinde kalıplar ve serigrafi şablonları kasaya kaldırılır; ürünler asla tekrar basılmaz.",
          en: "Every Cyrux Studio collection is produced as a limited edition run. Once an archival drop is sold out, patterns and screens are permanently vaulted; garments are never restocked.",
        },
      },
      {
        index: "03",
        title: {
          tr: "Fiyatlandırma & Stok Doğrulaması",
          en: "Pricing & Stock Verification",
        },
        body: {
          tr: "Sitede belirtilen fiyatlar nihai tüketici fiyatlarıdır. Siparişler, WhatsApp konsiyerj hattımız üzerinden stok ve beden teyidi yapıldıktan sonra kesinlik kazanır.",
          en: "Prices displayed reflect current atelier rates. Orders are officially confirmed upon real-time stock and size verification via our WhatsApp concierge.",
        },
      },
      {
        index: "04",
        title: {
          tr: "Yıkama & Bakım Sorumluluğu",
          en: "Garment Care & Responsibility",
        },
        body: {
          tr: "280-300 GSM ağır taranmış pamuk kumaşların ve özel serigrafi baskıların ömrünü korumak için 30°C ters çevirerek yıkama ve baskı üzerine direkt ütü basmama kurallarına uyulmalıdır.",
          en: "To preserve 280-300 GSM heavy combed cotton and raw serigraphy, garments must be washed inside-out at 30°C and never ironed directly over screenprints.",
        },
      },
    ],
  },
  {
    id: "shipping",
    label: { tr: "Teslimat & İade", en: "Shipping & Returns" },
    icon: Truck,
    badge: { tr: "LOJİSTİK VE İADE POLİTİKASI", en: "LOGISTICS & RETURNS POLICY" },
    sections: [
      {
        index: "01",
        title: {
          tr: "Paketleme & Hazırlık Süresi",
          en: "Preparation & Dispatch",
        },
        body: {
          tr: "Onaylanan tüm siparişler stüdyomuzda kalite kontrolden geçirilerek 1-3 iş günü içerisinde kargo firmasına teslim edilir. Takip numarası doğrudan WhatsApp üzerinden iletilir.",
          en: "Confirmed orders pass quality inspection at our atelier and are dispatched within 1-3 business days. Tracking details are provided directly via WhatsApp.",
        },
      },
      {
        index: "02",
        title: {
          tr: "Teslimat Bölgeleri",
          en: "Shipping Destinations",
        },
        body: {
          tr: "Kuzey Kıbrıs içi hızlı kurye servisi, Türkiye ve diğer ülkelere anlaşmalı hava kargo ile güvenli ekspres teslimat gerçekleştirilir.",
          en: "Domestic courier service within North Cyprus, and tracked express air freight for Turkey and international delivery.",
        },
      },
      {
        index: "03",
        title: {
          tr: "14 Gün İade & Değişim Hakkı",
          en: "14-Day Return & Exchange",
        },
        body: {
          tr: "Teslim aldığınız tarihten itibaren 14 gün içinde değişim veya iade talebinde bulunabilirsiniz. Ürünün yıkanmamış, giyilmemiş, koku/leke içermeyen ve orijinal etiketli durumda olması şarttır.",
          en: "Returns or exchanges can be requested within 14 days of delivery. Garments must be unworn, unwashed, odor-free, and retain all original atelier tags and packaging.",
        },
      },
      {
        index: "04",
        title: {
          tr: "Kargo Masrafları",
          en: "Shipping Fees for Returns",
        },
        body: {
          tr: "Kusurlu veya yanlış gönderilen parçaların kargo bedeli Cyrux Studio tarafından karşılanır. Beden değişimi durumunda kargo alıcıya aittir.",
          en: "Defective or incorrect items will have all shipping costs covered by Cyrux Studio. Size exchange shipping charges are borne by the customer.",
        },
      },
    ],
  },
  {
    id: "sales",
    label: { tr: "Mesafeli Satış", en: "Distance Sales" },
    icon: Scale,
    badge: { tr: "RESMİ BİLDİRİM & SÖZLEŞME", en: "LEGAL NOTICE & CONTRACT" },
    sections: [
      {
        index: "01",
        title: {
          tr: "Satıcı & Atölye Bilgileri",
          en: "Seller & Atelier Details",
        },
        body: {
          tr: "Satıcı: Cyrux Studio | Lokasyon: Girne, Kuzey Kıbrıs Türk Cumhuriyeti | İletişim: WhatsApp Konsiyerj Hattı & Resmi Instagram (@cyruxstudio).",
          en: "Seller: Cyrux Studio | Location: Kyrenia, Turkish Republic of Northern Cyprus | Channel: WhatsApp Concierge Line & Instagram (@cyruxstudio).",
        },
      },
      {
        index: "02",
        title: {
          tr: "Sözleşmenin Konusu",
          en: "Subject of Contract",
        },
        body: {
          tr: "İşbu sözleşme, alıcının web sitesi ve stüdyo konsiyerj kanalları üzerinden elektronik ortamda siparişini verdiği sanatsal giyim ürünlerinin satışı ve teslimini kapsar.",
          en: "This agreement covers the purchase, sale, and delivery of archival apparel pieces ordered electronically through the atelier's web and concierge channels.",
        },
      },
      {
        index: "03",
        title: {
          tr: "Cayma Hakkı İstisnaları",
          en: "Exemptions to Withdrawal",
        },
        body: {
          tr: "Alıcının talebi üzerine özel olarak revize edilen, tadilat uygulanan veya kişiselleştirilen parçalarda mevzuat gereğince cayma hakkı kullanılamaz.",
          en: "In accordance with consumer regulations, garments customized, altered, or tailor-modified specifically upon customer request are exempt from withdrawal rights.",
        },
      },
      {
        index: "04",
        title: {
          tr: "Yetkili Merci & Çözüm",
          en: "Jurisdiction & Resolution",
        },
        body: {
          tr: "Her türlü geri bildirim ve talep için öncelikli olarak Cyrux Studio doğrudan çözüm hattı geçerlidir. İhtilaf durumlarında Kuzey Kıbrıs Tüketici Mahkemeleri ve Hakem Heyetleri yetkilidir.",
          en: "For all support inquiries, Cyrux Studio's direct concierge serves as the primary resolution channel. In legal disputes, local consumer jurisdiction applies.",
        },
      },
    ],
  },
];

export function LegalModal({
  isOpen,
  onClose,
  initialTab = "privacy",
}: LegalModalProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<LegalTabId>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const currentDoc = LEGAL_DOCS.find((d) => d.id === activeTab) || LEGAL_DOCS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(currentDoc.badge)}
          className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-4 md:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl max-h-[100dvh] sm:max-h-[85vh] bg-[#0A0A0A] text-[#FAF8F3] border-0 sm:border border-neutral-800 shadow-2xl flex flex-col overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#FAF8F3]" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#FAF8F3]">
                  {t({ tr: "YASAL BİLGİLENDİRME", en: "LEGAL NOTICE" })}
                </span>
                <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 border border-neutral-800 text-neutral-500 uppercase tracking-widest">
                  CYRUX ARCHIVE
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t({ tr: "Kapat", en: "Close" })}
                className="min-w-9 min-h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Disciplined Minimal Tab Navigation */}
            <div className="flex items-center border-b border-neutral-800 bg-black overflow-x-auto [scrollbar-width:none] shrink-0">
              {LEGAL_DOCS.map((doc) => {
                const isActive = doc.id === activeTab;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveTab(doc.id)}
                    className={cn(
                      "px-3.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center gap-1.5",
                      isActive
                        ? "border-[#FAF8F3] text-[#FAF8F3] bg-neutral-900/40 font-bold"
                        : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-950"
                    )}
                  >
                    <span>{t(doc.label)}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5 [scrollbar-width:thin] text-left">
              {/* Document Banner */}
              <div className="pb-3 border-b border-neutral-800/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                    {t(currentDoc.badge)}
                  </p>
                  <h3 className="text-sm sm:text-base font-bold text-[#FAF8F3] uppercase mt-0.5 tracking-tight">
                    {t(currentDoc.label)}
                  </h3>
                </div>
                <div className="text-[9px] text-neutral-600 uppercase text-right hidden sm:block">
                  CYRUX STUDIO / GIRNE
                </div>
              </div>

              {/* Document Sections */}
              <div className="space-y-4">
                {currentDoc.sections.map((sec) => (
                  <div
                    key={sec.index}
                    className="p-3.5 sm:p-4 border border-neutral-800/80 bg-neutral-950/40 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500 font-mono">
                        [{sec.index}]
                      </span>
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-200">
                        {t(sec.title)}
                      </h4>
                    </div>
                    <p className="text-[11px] sm:text-xs leading-relaxed text-neutral-400 font-sans pl-6">
                      {t(sec.body)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Footer Bar */}
            <div className="px-5 sm:px-6 py-3 border-t border-neutral-800 bg-neutral-950/90 flex items-center justify-between text-[10px] text-neutral-500 shrink-0">
              <span className="uppercase tracking-widest text-[9px] text-neutral-600">
                CYRUX STUDIO © {new Date().getFullYear()}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 border border-neutral-700 hover:border-white text-neutral-300 hover:text-white uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
              >
                {t({ tr: "KAPAT [ESC]", en: "CLOSE [ESC]" })}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LegalModal;
