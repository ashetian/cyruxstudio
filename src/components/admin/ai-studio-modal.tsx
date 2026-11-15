"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Check,
  ExternalLink,
  Package,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

export interface AiStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTargetType?: "product" | "drop" | null;
  initialTargetId?: string | null;
  onAssetAssigned?: (mediaUrl: string, targetType: string, targetId: string) => void;
  onCreditsChanged?: () => void;
  mode?: "modal" | "embedded";
}

interface AiAsset {
  id: string;
  promptHash: string;
  mediaUrl: string;
  mediaType: string;
  creditsUsed: number;
  status: string;
  metadata?: {
    prompt?: string;
    options?: Record<string, unknown>;
    generatedAt?: string;
  };
  createdAt: string;
}

interface CreditStats {
  used: number;
  remaining: number;
  cap: number;
  percentage: number;
}

interface GenerationPreview {
  prompt: string;
  mediaType: "image" | "video";
  promptHash: string;
  isCached: boolean;
  cachedAsset: AiAsset | null;
  estimatedCredits: number;
  standardCost: number;
  currentUsed: number;
  remainingBefore: number;
  remainingAfter: number;
  canAfford: boolean;
  cap: number;
}

const PROMPT_PRESETS = [
  {
    label: "SCULPTED TRENCHCOAT",
    type: "image" as const,
    prompt:
      "Brutalist oversized sculpted trenchcoat, heavyweight distressed Japanese cotton, matte gunmetal hardware, dramatic architectural shadows, stark monochromatic atelier setting.",
  },
  {
    label: "TACTICAL CARGO TROUSER",
    type: "image" as const,
    prompt:
      "Avant-garde modular tactical cargo trouser, matte black ballistic nylon, engineered articulated knee folds, raw unfinished hem, high-contrast studio editorial lighting.",
  },
  {
    label: "FORGED TITANIUM EYEWEAR",
    type: "image" as const,
    prompt:
      "Brutalist geometric sunglasses, raw hand-forged titanium frame with micro-welds, smoked obsidian lenses, minimalist concrete display plinth.",
  },
  {
    label: "CINEMATIC MONOLITHIC RUNWAY",
    type: "video" as const,
    prompt:
      "Cinematic slow 24fps tracking camera gliding over masked model walking inside a monolithic raw concrete brutalist cathedral, subtle wind billowing dark wool coat.",
  },
];

export function AiStudioModal({
  isOpen = true,
  onClose,
  initialTargetType = null,
  initialTargetId = null,
  onAssetAssigned,
  onCreditsChanged,
  mode = "embedded",
}: AiStudioModalProps) {
  const [prompt, setPrompt] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");

  // Telemetry & Credit states
  const [credits, setCredits] = useState<CreditStats>({
    used: 0,
    remaining: 23000,
    cap: 23000,
    percentage: 0,
  });
  const [assets, setAssets] = useState<AiAsset[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Targets (Products & Drops)
  const [targetType, setTargetType] = useState<"none" | "product" | "drop">(
    initialTargetType || "none"
  );
  const [targetId, setTargetId] = useState<string>(initialTargetId || "");
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [dropsList, setDropsList] = useState<Array<{ id: string; title: string; number: string }>>([]);

  // Phase 1 Confirmation Review state
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<GenerationPreview | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  // Phase 2 Generating state
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    asset: AiAsset;
    cached: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Quick live hash and cache status
  const [liveHash, setLiveHash] = useState<string>("");
  const [liveIsCached, setLiveIsCached] = useState<boolean>(false);

  const targetTypeId = useId();
  const targetEntityId = useId();

  // Load telemetry, credit balances, history, products, and drops
  const loadStudioData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      const [aiRes, prodRes, dropRes] = await Promise.all([
        fetch("/api/admin/ai").then((r) => r.json().catch(() => ({}))),
        fetch("/api/admin/products?limit=100").then((r) => r.json().catch(() => ({}))),
        fetch("/api/admin/drops").then((r) => r.json().catch(() => ({}))),
      ]);

      if (aiRes.success && aiRes.credits) {
        setCredits(aiRes.credits);
        if (Array.isArray(aiRes.assets)) {
          setAssets(aiRes.assets);
        }
      }

      if (prodRes.success && Array.isArray(prodRes.products)) {
        setProductsList(prodRes.products.map((p: { id: string; name: string; slug: string }) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
        })));
      }

      if (dropRes.success && Array.isArray(dropRes.drops)) {
        setDropsList(dropRes.drops.map((d: { id: string; title: string; number: string }) => ({
          id: d.id,
          title: d.title,
          number: d.number,
        })));
      }
    } catch {
      setError("Failed to initialize AI Studio telemetry");
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  // Synchronize target when props change
  useEffect(() => {
    if (initialTargetType) setTargetType(initialTargetType);
    if (initialTargetId) setTargetId(initialTargetId);
  }, [initialTargetType, initialTargetId]);

  // Handle client-side live hash calculation for immediate feedback
  useEffect(() => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      setLiveHash("");
      setLiveIsCached(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            prompt: prompt.trim(),
            mediaType,
            options: { aspectRatio },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.success && data.preview) {
          setLiveHash(data.preview.promptHash);
          setLiveIsCached(Boolean(data.preview.isCached));
        }
      } catch {
        // silent
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [prompt, mediaType, aspectRatio]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Phase 1: Request Cost Preview
  // ---------------------------------------------------------------------------
  const handleRequestPreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setGeneratedResult(null);

    if (prompt.trim().length < 5) {
      setError("Prompt must be at least 5 characters in length.");
      return;
    }

    setPreviewing(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          prompt: prompt.trim(),
          mediaType,
          options: { aspectRatio },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to compute cost preview");
      }

      setPreview(data.preview);
      setConfirmationOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating preview");
    } finally {
      setPreviewing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Phase 2: Confirmed Execution
  // ---------------------------------------------------------------------------
  const handleExecuteConfirmedGeneration = async () => {
    if (!preview) return;
    setError(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          prompt: preview.prompt,
          mediaType: preview.mediaType,
          confirmed: true,
          options: { aspectRatio },
          targetType: targetType !== "none" ? targetType : undefined,
          targetId: targetType !== "none" && targetId ? targetId : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Generation execution aborted");
      }

      setGeneratedResult({
        asset: data.asset,
        cached: data.cached,
        message: data.message,
      });

      // Update credit balance
      setCredits((prev) => ({
        ...prev,
        used: data.totalCreditsUsed ?? prev.used,
        remaining: data.remainingCredits ?? prev.remaining,
        percentage: Math.round(((data.totalCreditsUsed ?? prev.used) / prev.cap) * 100),
      }));

      // Prepend asset into list
      setAssets((prev) => [data.asset, ...prev.filter((a) => a.id !== data.asset.id)]);

      // Notify parent if assigned
      if (
        data.assignment?.assigned &&
        targetType !== "none" &&
        targetId &&
        onAssetAssigned
      ) {
        onAssetAssigned(data.asset.mediaUrl, targetType, targetId);
      }

      if (onCreditsChanged) {
        onCreditsChanged();
      }

      setConfirmationOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleQuickAssign = async (assetUrl: string, tType: "product" | "drop", tId: string) => {
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          mediaUrl: assetUrl,
          targetType: tType,
          targetId: tId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (onAssetAssigned) {
          onAssetAssigned(assetUrl, tType, tId);
        }
        if (onCreditsChanged) {
          onCreditsChanged();
        }
      }
    } catch {
      // silent
    }
  };

  const content = (
    <div className="flex flex-col gap-6 font-mono text-xs">
      {/* ============================================================== */}
      {/* 1. CREDIT BUDGET TELEMETRY STRIP (Desktop High-Density)        */}
      {/* ============================================================== */}
      <div className="bg-[#101010] border border-[#222222] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Balance & Meter */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-[#FAF8F3] font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ELEVENLABS ASSET FORGE // CREDIT LEDGER
            </span>
            <span className="font-mono text-[#AAAAAA]">
              <strong className="text-amber-400">{credits.used.toLocaleString()}</strong> /{" "}
              {credits.cap.toLocaleString()} CREDITS (
              <span className={credits.remaining < 1000 ? "text-red-400 font-bold" : "text-emerald-400"}>
                {credits.remaining.toLocaleString()} REMAINING
              </span>
              )
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-2.5 bg-[#1C1C1C] border border-[#2A2A2A] relative overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                credits.percentage > 90
                  ? "bg-red-500"
                  : credits.percentage > 70
                  ? "bg-amber-400"
                  : "bg-[#FAF8F3]"
              }`}
              style={{ width: `${Math.min(100, Math.max(1, credits.percentage))}%` }}
            />
          </div>
        </div>

        {/* Right: Security Ceiling Badge */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#282828] text-[10px] text-[#AAAAAA] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>STRICT 23K BUDGET GUARD ACTIVE</span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-red-950/70 border border-red-500/80 text-red-300 p-3.5 flex items-center gap-2 uppercase tracking-wider text-[11px]">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success / Cache Execution Banner */}
      {generatedResult && (
        <div className="bg-[#121812] border border-emerald-600/70 text-emerald-300 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-xs uppercase text-white">
                {generatedResult.cached ? "[ INSTANT DEDUPLICATION HIT ]" : "[ NEW ASSET FORGED ]"}
              </div>
              <div className="text-[11px] text-emerald-200/80 mt-0.5">
                {generatedResult.message}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyUrl(generatedResult.asset.mediaUrl)}
              className="px-3 py-1.5 bg-[#1F2C1F] border border-emerald-500/50 text-white text-[10px] uppercase font-bold tracking-wider hover:bg-emerald-900/60"
            >
              {copiedUrl === generatedResult.asset.mediaUrl ? "COPIED URL!" : "COPY ASSET URL"}
            </button>
            <a
              href={generatedResult.asset.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-[#1F2C1F] border border-emerald-500/50 text-white hover:text-emerald-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PROMPT FORGE & CONFIGURATION MATRIX (Desktop 2-Col Grid)    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Prompt Input & Deduplication (8 Cols) */}
        <div className="lg:col-span-8 bg-[#0E0E0E] border border-[#222222] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-2.5">
            <span className="text-[11px] uppercase font-bold text-[#FAF8F3] tracking-widest flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              PROMPT SYNTHESIZER
            </span>
            <span className="text-[10px] text-[#777777] uppercase tracking-wider font-mono">
              {prompt.length} / 1000 CHARACTERS
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase text-[#666666] tracking-wider font-bold">
              AVANT-GARDE ARCHIVAL PRESETS:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PROMPT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setMediaType(preset.type);
                  }}
                  className="px-2 py-1.5 text-left text-[9px] uppercase font-bold tracking-wider bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] hover:border-white text-[#AAAAAA] hover:text-white transition-none truncate"
                  title={preset.prompt}
                >
                  [{preset.label}]
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Textarea */}
          <div className="flex flex-col gap-1.5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="ENTER AVANT-GARDE PROMPT SPECIFICATION... (MIN 5 CHARACTERS)"
              rows={4}
              className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs p-3.5 outline-none font-mono resize-y min-h-[96px]"
            />
          </div>

          {/* Live SHA-256 Prompt Hash Bar (Deduplication Telemetry) */}
          <div className="bg-[#141414] border border-[#262626] p-2.5 flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#888888] font-bold uppercase shrink-0">SHA-256 HASH:</span>
              <span className="font-mono text-amber-300 truncate tracking-wider">
                {liveHash || "0000000000000000000000000000000000000000000000000000000000000000"}
              </span>
              {liveIsCached && (
                <span className="px-2 py-0.5 bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-bold tracking-widest text-[9px] uppercase shrink-0 animate-pulse">
                  [⚡ ARCHIVE CACHE HIT • 0 CR]
                </span>
              )}
            </div>
            {liveHash && (
              <button
                type="button"
                onClick={() => handleCopyHash(liveHash)}
                className="shrink-0 px-2 py-0.5 border border-[#333333] hover:border-white text-[9px] text-[#888888] hover:text-white uppercase"
              >
                {copiedHash === liveHash ? "COPIED" : "COPY HASH"}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Execution Controls & Target Assignment (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0E0E0E] border border-[#222222] p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div className="border-b border-[#1E1E1E] pb-2.5">
              <span className="text-[11px] uppercase font-bold text-[#FAF8F3] tracking-widest">
                EXECUTION PARAMETERS
              </span>
            </div>

            {/* Media Type Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">
                MEDIA OUTPUT TYPE:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={`py-2 px-3 text-xs uppercase font-bold tracking-wider border cursor-pointer ${
                    mediaType === "image"
                      ? "bg-[#FAF8F3] text-black border-[#FAF8F3]"
                      : "bg-[#141414] text-[#888888] border-[#2A2A2A] hover:text-white"
                  }`}
                >
                  IMAGE (120 CR)
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`py-2 px-3 text-xs uppercase font-bold tracking-wider border cursor-pointer ${
                    mediaType === "video"
                      ? "bg-amber-400 text-black border-amber-400"
                      : "bg-[#141414] text-[#888888] border-[#2A2A2A] hover:text-white"
                  }`}
                >
                  VIDEO (450 CR)
                </button>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">
                CANVAS RATIO:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 text-[11px] font-mono uppercase font-bold border ${
                      aspectRatio === ratio
                        ? "bg-[#2A2A2A] text-white border-white"
                        : "bg-[#141414] text-[#666666] border-[#262626] hover:text-white"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Assignment Selector */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1C1C1C]">
              <label
                htmlFor={targetTypeId}
                className="text-[10px] uppercase text-[#AAAAAA] font-bold tracking-wider flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5" />
                DIRECT TARGET ASSIGNMENT:
              </label>

              <select
                id={targetTypeId}
                value={targetType}
                onChange={(e) => {
                  const val = e.target.value as "none" | "product" | "drop";
                  setTargetType(val);
                  if (val === "none") setTargetId("");
                  else if (val === "product" && productsList[0]) setTargetId(productsList[0].id);
                  else if (val === "drop" && dropsList[0]) setTargetId(dropsList[0].id);
                }}
                className="bg-[#141414] border border-[#2E2E2E] text-white text-xs px-2.5 py-2 outline-none uppercase font-mono"
              >
                <option value="none">[ STANDALONE // BLOB VAULT ONLY ]</option>
                <option value="product">[ LINK DIRECTLY TO PRODUCT ]</option>
                <option value="drop">[ SET AS DROP BANNER // LOOKBOOK ]</option>
              </select>

              {targetType === "product" && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={targetEntityId} className="sr-only">
                    Select Product Target
                  </label>
                  <select
                    id={targetEntityId}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="bg-[#181818] border border-amber-400/60 text-amber-300 text-xs px-2.5 py-2 outline-none uppercase font-mono"
                  >
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (/{p.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "drop" && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={targetEntityId} className="sr-only">
                    Select Drop Target
                  </label>
                  <select
                    id={targetEntityId}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="bg-[#181818] border border-amber-400/60 text-amber-300 text-xs px-2.5 py-2 outline-none uppercase font-mono"
                  >
                    {dropsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        DROP {d.number}: {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Button: Trigger Phase 1 Preview */}
          <button
            type="button"
            onClick={() => handleRequestPreview()}
            disabled={previewing || prompt.trim().length < 5}
            className="w-full min-h-[46px] bg-[#FAF8F3] hover:bg-white text-black font-bold uppercase tracking-widest text-xs px-4 py-3 rounded-none disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {previewing ? (
              <span>[ COMPUTING METRICS... ]</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black" />
                <span>[ PREVIEW & CONFIRM COST ]</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TWO-PHASE CONFIRMATION MODAL                                */}
      {/* ============================================================== */}
      {confirmationOpen && preview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E0E0E] border-2 border-white max-w-lg w-full p-6 flex flex-col gap-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <span className="text-[10px] text-[#777777] uppercase tracking-widest font-bold">
                  PHASE 1 // TWO-PHASE CONFIRMATION
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-0.5">
                  [ EXPENDITURE AUTHORIZATION ]
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                className="w-8 h-8 flex items-center justify-center border border-[#333333] text-[#888888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Breakdown Table */}
            <div className="bg-[#141414] border border-[#262626] divide-y divide-[#222222] text-xs">
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#888888] uppercase">OUTPUT MEDIA:</span>
                <span className="font-bold text-white uppercase">
                  {preview.mediaType.toUpperCase()}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#888888] uppercase">DEDUPLICATION STATUS:</span>
                <span
                  className={`font-bold uppercase px-2 py-0.5 ${
                    preview.isCached
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                      : "bg-[#222222] text-[#FAF8F3]"
                  }`}
                >
                  {preview.isCached ? "★ CACHED ASSET DETECTED (0 CREDITS)" : "NEW GENERATION"}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#888888] uppercase">ESTIMATED EXPENDITURE:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">
                  {preview.estimatedCredits} CREDITS
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#888888] uppercase">CURRENT USAGE BEFORE:</span>
                <span className="font-mono text-[#AAAAAA]">
                  {preview.currentUsed.toLocaleString()} / {preview.cap.toLocaleString()}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#888888] uppercase">PROJECTED USAGE AFTER:</span>
                <span className="font-mono text-white font-bold">
                  {(preview.currentUsed + preview.estimatedCredits).toLocaleString()} / {preview.cap.toLocaleString()}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#888888] uppercase">TARGET ATTACHMENT:</span>
                <span className="text-white uppercase font-bold truncate max-w-[200px]">
                  {targetType === "none" ? "BLOB VAULT" : `${targetType.toUpperCase()}: ${targetId}`}
                </span>
              </div>
            </div>

            {/* Prompt preview */}
            <div className="bg-[#121212] p-3 border border-[#222222] text-[11px] text-[#888888] italic">
              &quot;{preview.prompt}&quot;
            </div>

            {/* Affordability check warning */}
            {!preview.canAfford && (
              <div className="bg-red-950/80 border border-red-500 p-3 text-red-300 text-xs uppercase font-bold">
                [!] BUDGET EXCEEDED: Cannot proceed. This request exceeds the 23,000 credit ceiling budget guard.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                className="flex-1 py-3 border border-[#333333] hover:border-white text-xs uppercase font-bold text-[#AAAAAA] hover:text-white"
              >
                [ CANCEL ]
              </button>
              <button
                type="button"
                disabled={generating || !preview.canAfford}
                onClick={handleExecuteConfirmedGeneration}
                className="flex-1 py-3 bg-[#FAF8F3] hover:bg-white text-black text-xs uppercase font-bold tracking-wider disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                {generating ? (
                  <span>[ FORGING ASSET... ]</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>[ CONFIRM & EXECUTE ]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ASSET HISTORY VAULT                                         */}
      {/* ============================================================== */}
      <div className="bg-[#0E0E0E] border border-[#222222] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white uppercase tracking-widest">
              [ ASSET HISTORY VAULT & DEDUP REGISTRY ]
            </span>
            <span className="text-[10px] text-[#777777] font-mono">
              ({assets.length} ASSETS REGISTERED)
            </span>
          </div>
          <button
            type="button"
            onClick={loadStudioData}
            className="text-[10px] text-[#888888] hover:text-white uppercase flex items-center gap-1 border border-[#2A2A2A] px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>REFRESH</span>
          </button>
        </div>

        {loadingInitial ? (
          <div className="p-12 text-center text-xs tracking-widest text-[#666666] uppercase animate-pulse">
            RETRIEVING AI ASSET REGISTRY...
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-xs tracking-widest text-[#666666] uppercase border border-[#1A1A1A]">
            NO SYNTHESIZED ASSETS RECORDED YET. FORGE YOUR FIRST ITEM ABOVE.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {assets.map((asset) => {
              const isVid = asset.mediaType === "video";
              return (
                <div
                  key={asset.id}
                  className="bg-[#141414] border border-[#242424] hover:border-[#444444] p-3 flex flex-col justify-between gap-3"
                >
                  {/* Thumbnail / Media Container */}
                  <div className="w-full aspect-square bg-[#0A0A0A] border border-[#222222] relative overflow-hidden flex items-center justify-center group">
                    {isVid ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.mediaUrl}
                          alt={asset.metadata?.prompt || "Video thumbnail"}
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="w-8 h-8 text-white fill-white opacity-80 group-hover:opacity-100" />
                        </div>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={asset.mediaUrl}
                        alt={asset.metadata?.prompt || "AI Asset"}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Media Type & Cost Tag */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="bg-black/90 text-white border border-[#333] px-1.5 py-0.5 text-[9px] font-bold uppercase">
                        {asset.mediaType}
                      </span>
                      <span className="bg-amber-400 text-black px-1.5 py-0.5 text-[9px] font-bold">
                        {asset.creditsUsed} CR
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] text-[#FAF8F3] line-clamp-2 uppercase">
                      {asset.metadata?.prompt || "ARCHIVAL MONOCHROME TEXTURE"}
                    </p>
                    <div className="text-[9px] font-mono text-[#666666] truncate">
                      HASH: {asset.promptHash.slice(0, 16)}...
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#1E1E1E]">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(asset.mediaUrl)}
                      className="px-2 py-1 text-[10px] text-[#888888] hover:text-white border border-[#2A2A2A] hover:border-white uppercase"
                    >
                      {copiedUrl === asset.mediaUrl ? "COPIED" : "URL"}
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        aria-label="Assign to piece or drop"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          if (val.startsWith("drop:")) {
                            handleQuickAssign(asset.mediaUrl, "drop", val.replace("drop:", ""));
                          } else {
                            handleQuickAssign(asset.mediaUrl, "product", val);
                          }
                          e.target.value = "";
                        }}
                        className="bg-[#121212] border border-[#2E2E2E] text-amber-300 hover:border-amber-400 text-[9px] px-1.5 py-1 font-mono uppercase cursor-pointer outline-none max-w-[120px] truncate"
                      >
                        <option value="">+ASSIGN TO...</option>
                        {productsList.length > 0 && (
                          <optgroup label="PRODUCTS">
                            {productsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {dropsList.length > 0 && (
                          <optgroup label="DROPS">
                            {dropsList.map((d) => (
                              <option key={d.id} value={`drop:${d.id}`}>
                                DROP {d.number}: {d.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>

                      <a
                        href={asset.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-[#888888] hover:text-white border border-[#2A2A2A]"
                        title="Open full asset"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (mode === "embedded") {
    return content;
  }

  // Modal mode
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-mono">
      <div className="relative w-full max-w-5xl bg-[#0A0A0A] border-2 border-white max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Topbar */}
        <div className="p-4 sm:p-5 border-b border-[#222222] bg-[#121212] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] text-[#888888] uppercase tracking-widest font-bold">
              ADMINISTRATION TERMINAL // SYNTHETIC MEDIA FORGE
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight mt-0.5">
              [ AI STUDIO // ELEVENLABS CREDITS & DEDUPLICATION ]
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center border border-[#333333] text-[#888888] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{content}</div>
      </div>
    </div>
  );
}
