import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-[#FAF8F3] flex flex-col items-center justify-center px-4 font-mono select-none">
      <div className="max-w-md w-full border border-neutral-800 bg-[#0C0C0D] p-8 text-center shadow-2xl">
        <span className="text-xs text-neutral-500 uppercase tracking-widest block mb-2">
          {"// 404 ERROR //"}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-4">
          PARÇA BULUNAMADI
        </h1>
        <p className="text-xs text-neutral-400 mb-8 leading-relaxed">
          Aradığınız ürün veya arşiv sayfası mevcut değil veya yayından kaldırılmış olabilir.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 px-4 border border-white bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-transparent hover:text-white transition-colors"
        >
          [ ANA SAYFAYA DÖN ]
        </Link>
      </div>
    </div>
  );
}
