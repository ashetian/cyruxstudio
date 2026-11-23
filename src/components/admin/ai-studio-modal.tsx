"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import {
  Sparkles,
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
    label: "Sculpted Trenchcoat",
    type: "image" as const,
    prompt:
      "Brutalist oversized sculpted trenchcoat, heavyweight combed Japanese cotton, matte hardware, dramatic architectural shadows, stark monochromatic atelier setting.",
  },
  {
    label: "Modular Cargo Trouser",
    type: "image" as const,
    prompt:
      "Avant-garde modular cargo trouser, matte black heavy nylon, engineered articulated knee folds, raw unfinished hem, studio editorial lighting.",
  },
  {
    label: "Sculpted Titanium Eyewear",
    type: "image" as const,
    prompt:
      "Brutalist geometric sunglasses, raw brushed titanium frame, smoked obsidian lenses, minimalist limestone display plinth.",
  },
  {
    label: "Monochromatic Runway",
    type: "video" as const,
    prompt:
      "Slow 24fps tracking camera gliding over model walking inside a raw concrete gallery, subtle wind billowing dark wool coat.",
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

  const [credits, setCredits] = useState<CreditStats>({
    used: 0,
    remaining: 23000,
    cap: 23000,
    percentage: 0,
  });
  const [assets, setAssets] = useState<AiAsset[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [targetType, setTargetType] = useState<"none" | "product" | "drop">(
    initialTargetType || "none"
  );
  const [targetId, setTargetId] = useState<string>(initialTargetId || "");
  const [productsList, setProductsList] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [dropsList, setDropsList] = useState<
    Array<{ id: string; title: string; number: string }>
  >([]);

  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<GenerationPreview | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    asset: AiAsset;
    cached: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const [liveHash, setLiveHash] = useState<string>("");
  const [liveIsCached, setLiveIsCached] = useState<boolean>(false);

  const targetTypeId = useId();
  const targetEntityId = useId();

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
        setProductsList(
          prodRes.products.map((p: { id: string; name: string; slug: string }) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          }))
        );
      }

      if (dropRes.success && Array.isArray(dropRes.drops)) {
        setDropsList(
          dropRes.drops.map((d: { id: string; title: string; number: string }) => ({
            id: d.id,
            title: d.title,
            number: d.number,
          }))
        );
      }
    } catch {
      setError("Failed to load AI Studio credits and history.");
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  useEffect(() => {
    if (initialTargetType) setTargetType(initialTargetType);
    if (initialTargetId) setTargetId(initialTargetId);
  }, [initialTargetType, initialTargetId]);

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
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          preview?: { promptHash: string; isCached: boolean };
        };
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

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        preview?: GenerationPreview;
      };
      if (!res.ok || !data.success || !data.preview) {
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

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        asset?: AiAsset;
        cached?: boolean;
        message?: string;
        totalCreditsUsed?: number;
        remainingCredits?: number;
        assignment?: { assigned?: boolean };
      };

      if (!res.ok || !data.success || !data.asset) {
        throw new Error(data.error || "Generation execution aborted");
      }

      const createdAsset = data.asset;

      setGeneratedResult({
        asset: createdAsset,
        cached: Boolean(data.cached),
        message: data.message || "Asset ready.",
      });

      setCredits((prev) => ({
        ...prev,
        used: data.totalCreditsUsed ?? prev.used,
        remaining: data.remainingCredits ?? prev.remaining,
        percentage: Math.round(((data.totalCreditsUsed ?? prev.used) / prev.cap) * 100),
      }));

      setAssets((prev) => [createdAsset, ...prev.filter((a) => a.id !== createdAsset.id)]);

      if (
        data.assignment?.assigned &&
        targetType !== "none" &&
        targetId &&
        onAssetAssigned
      ) {
        onAssetAssigned(createdAsset.mediaUrl, targetType, targetId);
      }

      onCreditsChanged?.();
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

  const handleQuickAssign = async (
    assetUrl: string,
    tType: "product" | "drop",
    tId: string
  ) => {
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
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (res.ok && data.success) {
        onAssetAssigned?.(assetUrl, tType, tId);
        onCreditsChanged?.();
      }
    } catch {
      // silent
    }
  };

  const content = (
    <div className="flex flex-col gap-5 text-xs bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Credit Ledger Strip */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-[#0A0A0A] font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>ElevenLabs Studio — Credit Ledger</span>
            </span>
            <span className="font-mono text-[#525252]">
              <strong className="text-[#0A0A0A]">{credits.used.toLocaleString()}</strong> /{" "}
              {credits.cap.toLocaleString()} credits (
              <span
                className={
                  credits.remaining < 1000
                    ? "text-red-800 font-semibold"
                    : "text-emerald-800 font-semibold"
                }
              >
                {credits.remaining.toLocaleString()} remaining
              </span>
              )
            </span>
          </div>

          <div className="w-full h-2 bg-[#E8E4DC] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                credits.percentage > 90
                  ? "bg-red-700"
                  : credits.percentage > 70
                  ? "bg-amber-600"
                  : "bg-[#0A0A0A]"
              }`}
              style={{ width: `${Math.min(100, Math.max(1, credits.percentage))}%` }}
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-[#FAF8F3] border border-[#E8E4DC] text-[11px] text-[#0A0A0A] uppercase tracking-wider font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>23K Budget Guard Active</span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 p-3.5 flex items-center gap-2 text-xs"
        >
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success / Cache Execution Banner */}
      {generatedResult && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-xs uppercase text-[#0A0A0A]">
                {generatedResult.cached ? "Cached Asset Hit" : "New Asset Generated"}
              </div>
              <div className="text-xs text-emerald-900 mt-0.5">
                {generatedResult.message}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyUrl(generatedResult.asset.mediaUrl)}
              className="min-h-[44px] px-3 bg-[#FFFFFF] border border-emerald-300 text-[#0A0A0A] text-xs uppercase font-medium tracking-wider hover:border-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              {copiedUrl === generatedResult.asset.mediaUrl ? "Copied URL" : "Copy Asset URL"}
            </button>
            <a
              href={generatedResult.asset.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open generated asset"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#FFFFFF] border border-emerald-300 text-[#0A0A0A] hover:border-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Prompt & Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4DC] pb-2.5">
            <span className="text-xs uppercase font-semibold text-[#0A0A0A] tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompt Composer</span>
            </span>
            <span className="text-[11px] text-[#525252] font-mono">
              {prompt.length} / 1000 characters
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase text-[#525252] tracking-wider font-medium">
              Editorial Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PROMPT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setMediaType(preset.type);
                  }}
                  className="min-h-[44px] px-3 py-2 text-left text-[11px] uppercase font-medium tracking-wider bg-[#FAF8F3] hover:bg-[#F4F1EA] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  title={preset.prompt}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter editorial prompt specification (minimum 5 characters)..."
              rows={4}
              aria-label="Generation prompt"
              className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3.5 font-mono resize-y min-h-[104px] placeholder:text-[#737373]"
            />
          </div>

          {/* Live SHA-256 Prompt Hash Bar */}
          <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-[#525252] font-semibold uppercase shrink-0">
                SHA-256 Hash:
              </span>
              <span className="font-mono text-[#0A0A0A] truncate max-w-full">
                {liveHash || "00000000000000000000000000000000"}
              </span>
              {liveIsCached && (
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold tracking-wider text-[10px] uppercase shrink-0">
                  Cached Hit (0 CR)
                </span>
              )}
            </div>
            {liveHash && (
              <button
                type="button"
                onClick={() => handleCopyHash(liveHash)}
                className="min-h-[44px] shrink-0 px-3 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[11px] text-[#0A0A0A] uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {copiedHash === liveHash ? "Copied" : "Copy Hash"}
              </button>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0">
          <div className="flex flex-col gap-4">
            <div className="border-b border-[#E8E4DC] pb-2.5">
              <span className="text-xs uppercase font-semibold text-[#0A0A0A] tracking-wider">
                Generation Parameters
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase text-[#525252] font-medium tracking-wider">
                Media Output Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={`min-h-[44px] py-2 px-3 text-xs uppercase font-medium tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    mediaType === "image"
                      ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                      : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                  }`}
                >
                  Image (120 CR)
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`min-h-[44px] py-2 px-3 text-xs uppercase font-medium tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    mediaType === "video"
                      ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                      : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                  }`}
                >
                  Video (450 CR)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase text-[#525252] font-medium tracking-wider">
                Aspect Ratio
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`min-h-[44px] py-1.5 text-xs font-mono font-medium border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      aspectRatio === ratio
                        ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                        : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E4DC]">
              <label
                htmlFor={targetTypeId}
                className="text-[11px] uppercase text-[#0A0A0A] font-medium tracking-wider flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Target Assignment</span>
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
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer"
              >
                <option value="none">Standalone (Media Library Only)</option>
                <option value="product">Link Directly to Product</option>
                <option value="drop">Set as Drop Banner</option>
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
                    className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer"
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
                    className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer"
                  >
                    {dropsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        Drop {d.number}: {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRequestPreview()}
            disabled={previewing || prompt.trim().length < 5}
            className="w-full min-h-[48px] bg-[#0A0A0A] hover:bg-[#262626] text-[#FFFFFF] font-medium uppercase tracking-wider text-xs px-4 py-3 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
          >
            {previewing ? (
              <span>Computing Cost...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Preview & Confirm Cost</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two-Phase Confirmation Modal */}
      {confirmationOpen && preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#E8E4DC] max-w-lg w-full p-5 sm:p-6 flex flex-col gap-5 shadow-xl text-[#0A0A0A]">
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3">
              <div>
                <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">
                  Step 1 — Cost Confirmation
                </span>
                <h3 className="text-base font-semibold text-[#0A0A0A] mt-0.5">
                  Credit Authorization
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                aria-label="Close confirmation"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] text-[#525252] hover:text-[#0A0A0A] hover:border-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAF8F3] border border-[#E8E4DC] divide-y divide-[#E8E4DC] text-xs">
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-[#525252] uppercase">Output Media</span>
                <span className="font-semibold text-[#0A0A0A] uppercase">
                  {preview.mediaType}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-[#525252] uppercase">Cache Status</span>
                <span
                  className={`font-semibold uppercase px-2 py-0.5 border ${
                    preview.isCached
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : "bg-[#FFFFFF] text-[#0A0A0A] border-[#E8E4DC]"
                  }`}
                >
                  {preview.isCached ? "Cached Asset (0 Credits)" : "New Generation"}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-[#525252] uppercase">Estimated Cost</span>
                <span className="font-semibold text-[#0A0A0A] font-mono text-sm">
                  {preview.estimatedCredits} credits
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-[#525252] uppercase">Current Usage</span>
                <span className="font-mono text-[#525252]">
                  {preview.currentUsed.toLocaleString()} / {preview.cap.toLocaleString()}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-[#525252] uppercase">Projected Usage</span>
                <span className="font-mono text-[#0A0A0A] font-semibold">
                  {(preview.currentUsed + preview.estimatedCredits).toLocaleString()} /{" "}
                  {preview.cap.toLocaleString()}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-[#525252] uppercase">Target</span>
                <span className="text-[#0A0A0A] uppercase font-medium truncate max-w-[200px]">
                  {targetType === "none" ? "Media Library" : `${targetType}: ${targetId}`}
                </span>
              </div>
            </div>

            <div className="bg-[#FAF8F3] p-3 border border-[#E8E4DC] text-xs text-[#525252] italic">
              &quot;{preview.prompt}&quot;
            </div>

            {!preview.canAfford && (
              <div className="bg-red-50 border border-red-300 p-3 text-red-900 text-xs font-medium">
                Budget exceeded: this request exceeds the 23,000 credit limit.
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                className="flex-1 min-h-[44px] border border-[#E8E4DC] hover:border-[#0A0A0A] text-xs uppercase font-medium text-[#0A0A0A] bg-[#FFFFFF] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generating || !preview.canAfford}
                onClick={handleExecuteConfirmedGeneration}
                className="flex-1 min-h-[44px] bg-[#0A0A0A] hover:bg-[#262626] text-[#FFFFFF] text-xs uppercase font-medium tracking-wider disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {generating ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset History */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4DC] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
              Asset History & Deduplication
            </span>
            <span className="text-xs text-[#525252] font-mono">
              ({assets.length})
            </span>
          </div>
          <button
            type="button"
            onClick={loadStudioData}
            className="min-h-[44px] px-3 text-xs text-[#0A0A0A] border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] uppercase font-medium flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loadingInitial ? (
          <div className="p-10 text-center text-xs uppercase tracking-wider text-[#525252]">
            Loading asset history...
          </div>
        ) : assets.length === 0 ? (
          <div className="p-10 text-center text-xs uppercase tracking-wider text-[#525252] border border-[#E8E4DC] bg-[#FAF8F3]">
            No generated assets recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {assets.map((asset) => {
              const isVid = asset.mediaType === "video";
              return (
                <div
                  key={asset.id}
                  className="bg-[#FAF8F3] border border-[#E8E4DC] p-3 flex flex-col justify-between gap-3 min-w-0"
                >
                  <div className="w-full aspect-square bg-[#FFFFFF] border border-[#E8E4DC] relative overflow-hidden flex items-center justify-center">
                    {isVid ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-[#FAF8F3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.mediaUrl}
                          alt={asset.metadata?.prompt || "Video thumbnail"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-8 h-8 text-white fill-white" />
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

                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="bg-[#FFFFFF]/95 text-[#0A0A0A] border border-[#E8E4DC] px-1.5 py-0.5 text-[10px] font-medium uppercase">
                        {asset.mediaType}
                      </span>
                      <span className="bg-[#0A0A0A] text-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-mono">
                        {asset.creditsUsed} CR
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-xs text-[#0A0A0A] line-clamp-2">
                      {asset.metadata?.prompt || "Archival studio visual"}
                    </p>
                    <div className="text-[10px] font-mono text-[#525252] truncate">
                      Hash: {asset.promptHash.slice(0, 16)}...
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#E8E4DC]">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(asset.mediaUrl)}
                      className="min-h-[44px] px-3 text-xs text-[#0A0A0A] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      {copiedUrl === asset.mediaUrl ? "Copied" : "Copy URL"}
                    </button>

                    <div className="flex items-center gap-2 min-w-0 flex-1 sm:justify-end">
                      <select
                        aria-label="Assign asset to product or drop"
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
                        className="w-full sm:max-w-[160px] min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-2 py-1 font-mono cursor-pointer truncate"
                      >
                        <option value="">Assign to...</option>
                        {productsList.length > 0 && (
                          <optgroup label="Products">
                            {productsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {dropsList.length > 0 && (
                          <optgroup label="Drops">
                            {dropsList.map((d) => (
                              <option key={d.id} value={`drop:${d.id}`}>
                                Drop {d.number}: {d.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>

                      <a
                        href={asset.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open full asset"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] hover:border-[#0A0A0A] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                      >
                        <ExternalLink className="w-4 h-4" />
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
    >
      <div className="relative w-full max-w-5xl bg-[#FAF8F3] text-[#0A0A0A] border border-[#E8E4DC] max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E8E4DC] bg-[#FFFFFF] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">
              Atelier Media Studio
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0A0A] mt-0.5 truncate">
              ElevenLabs Credits & Deduplication
            </h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close studio"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] hover:border-[#0A0A0A] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{content}</div>
      </div>
    </div>
  );
}
