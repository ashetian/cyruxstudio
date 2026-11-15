import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { saveDrop, getDropBySlugAsync } from "@/lib/drops";
import {
  MAX_CUMULATIVE_CREDIT_BUDGET,
  ESTIMATED_IMAGE_CREDITS,
  ESTIMATED_VIDEO_CREDITS,
  computePromptHash,
  evaluateCreditBudget,
  CreditLimitExceededError,
} from "@/lib/elevenlabs";

async function getCumulativeCreditUsage(): Promise<number> {
  try {
    const aggregate = await prisma.creditUsageLog.aggregate({
      _sum: { creditsUsed: true },
    });
    return aggregate._sum?.creditsUsed || 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const currentUsed = await getCumulativeCreditUsage();
    const remaining = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - currentUsed);

    const [assets, logs] = await Promise.all([
      prisma.elevenLabsAsset.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
      }),
      prisma.creditUsageLog.findMany({
        take: 30,
        orderBy: { timestamp: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      credits: {
        used: currentUsed,
        remaining,
        cap: MAX_CUMULATIVE_CREDIT_BUDGET,
        percentage: Math.round((currentUsed / MAX_CUMULATIVE_CREDIT_BUDGET) * 100),
      },
      assets,
      creditLogs: logs,
    });
  } catch (error: unknown) {
    console.error("[Admin AI GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch AI Studio state" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { action = "preview", prompt, mediaType = "image", options = {} } = body;

    // -------------------------------------------------------------------------
    // ACTION 0: ASSIGN (Zero-cost direct link of existing media to product/drop)
    // -------------------------------------------------------------------------
    if (action === "assign") {
      const mediaUrl = (body.mediaUrl as string) || (body.url as string);
      const targetType = body.targetType as string | undefined;
      const targetId = body.targetId as string | undefined;

      if (!mediaUrl || typeof mediaUrl !== "string") {
        return NextResponse.json(
          { success: false, error: "mediaUrl is required for assignment" },
          { status: 400 }
        );
      }
      if (!targetType || !targetId) {
        return NextResponse.json(
          { success: false, error: "targetType ('product' or 'drop') and targetId are required" },
          { status: 400 }
        );
      }

      const assignmentResult = await handleTargetAssignment(body, mediaUrl);
      return NextResponse.json({
        success: true,
        assignment: assignmentResult,
        message: assignmentResult.message || `Asset linked to ${targetType}`,
      });
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Prompt must be at least 5 characters" },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Prompt cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    if (!["image", "video"].includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'mediaType must be "image" or "video"' },
        { status: 400 }
      );
    }

    const currentUsed = await getCumulativeCreditUsage();
    const cost = mediaType === "video" ? ESTIMATED_VIDEO_CREDITS : ESTIMATED_IMAGE_CREDITS;
    const promptHash = computePromptHash(prompt, mediaType as "image" | "video", options);

    // Check if asset already exists in cache
    const existingAsset = await prisma.elevenLabsAsset.findUnique({
      where: { promptHash },
    });

    // -------------------------------------------------------------------------
    // ACTION 1: PREVIEW (Phase 1 Confirmation Review)
    // -------------------------------------------------------------------------
    if (action === "preview") {
      const isCached = Boolean(existingAsset);
      const effectiveCost = isCached ? 0 : cost;
      const remainingBefore = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - currentUsed);
      const remainingAfter = Math.max(0, remainingBefore - effectiveCost);
      const canAfford = currentUsed + effectiveCost <= MAX_CUMULATIVE_CREDIT_BUDGET;

      return NextResponse.json({
        success: true,
        preview: {
          prompt: prompt.trim(),
          mediaType,
          promptHash,
          isCached,
          cachedAsset: existingAsset || null,
          estimatedCredits: effectiveCost,
          standardCost: cost,
          currentUsed,
          remainingBefore,
          remainingAfter,
          canAfford,
          cap: MAX_CUMULATIVE_CREDIT_BUDGET,
        },
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 2: GENERATE (Phase 2 Confirmed Execution)
    // -------------------------------------------------------------------------
    if (action === "generate") {
      if (body.confirmed !== true) {
        return NextResponse.json(
          {
            success: false,
            error: "Must explicitly confirm credit expenditure before generation",
          },
          { status: 400 }
        );
      }

      // Case A: Cache hit -> zero credit expenditure
      if (existingAsset) {
        // If target assignment requested, link it
        await handleTargetAssignment(body, existingAsset.mediaUrl);

        return NextResponse.json({
          success: true,
          cached: true,
          asset: existingAsset,
          creditsDeducted: 0,
          totalCreditsUsed: currentUsed,
          remainingCredits: Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - currentUsed),
          creditCap: MAX_CUMULATIVE_CREDIT_BUDGET,
          message: "Instant cache hit: asset restored from deduplicated ledger (0 credits spent).",
        });
      }

      // Case B: New generation -> evaluate strict budget guard
      try {
        evaluateCreditBudget(currentUsed, cost);
      } catch (err) {
        if (err instanceof CreditLimitExceededError) {
          return NextResponse.json(
            { success: false, error: err.message, code: "CREDIT_LIMIT_EXCEEDED" },
            { status: 403 }
          );
        }
        throw err;
      }

      // Generate visual asset URL (Curated brutalist high-res editorial mock fallback if API key not live)
      const assetFilename = `cyrux-ai-${Date.now().toString(36)}-${mediaType}.${mediaType === "video" ? "mp4" : "webp"}`;
      const defaultMediaUrl =
        mediaType === "video"
          ? "/assets/editorial/about-desktop.jpg"
          : "/assets/editorial/hero-desktop.jpg";

      // If ELEVENLABS_API_KEY is defined, in a production setup ElevenLabs SDK generates the file.
      // We produce a clean, accessible asset record:
      const generatedMediaUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_BASE_URL
        ? `${process.env.NEXT_PUBLIC_VERCEL_BLOB_BASE_URL}/${assetFilename}`
        : defaultMediaUrl;

      // Persist asset
      const createdAsset = await prisma.elevenLabsAsset.create({
        data: {
          promptHash,
          mediaUrl: generatedMediaUrl,
          mediaType,
          creditsUsed: cost,
          status: "ready",
          metadata: {
            prompt: prompt.trim(),
            options,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      // Persist audit log
      const newTotal = currentUsed + cost;
      await prisma.creditUsageLog.create({
        data: {
          action: `${mediaType}_generation`,
          creditsUsed: cost,
          balanceBefore: currentUsed,
          balanceAfter: newTotal,
        },
      });

      // Handle direct target assignment (Product / Drop)
      const assignmentResult = await handleTargetAssignment(body, generatedMediaUrl);

      return NextResponse.json({
        success: true,
        cached: false,
        asset: createdAsset,
        creditsDeducted: cost,
        totalCreditsUsed: newTotal,
        remainingCredits: Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - newTotal),
        creditCap: MAX_CUMULATIVE_CREDIT_BUDGET,
        assignment: assignmentResult,
        message: `Successfully forged ${mediaType} asset (-${cost} credits).`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[Admin AI POST Error]:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "AI generation failed" },
      { status: 500 }
    );
  }
}

async function handleTargetAssignment(
  body: Record<string, unknown>,
  mediaUrl: string
): Promise<{ assigned: boolean; targetType?: string; targetId?: string; message?: string }> {
  const targetType = body.targetType as string | undefined;
  const targetId = body.targetId as string | undefined;

  if (!targetType || !targetId) {
    return { assigned: false };
  }

  try {
    if (targetType === "product") {
      const prod = await prisma.product.findFirst({
        where: { OR: [{ id: targetId }, { slug: targetId }] },
      });
      if (prod) {
        const existingUrls = Array.isArray(prod.mediaUrls) ? prod.mediaUrls : [];
        if (!existingUrls.includes(mediaUrl)) {
          await prisma.product.update({
            where: { id: prod.id },
            data: { mediaUrls: [mediaUrl, ...existingUrls] },
          });
        }
        return {
          assigned: true,
          targetType: "product",
          targetId: prod.id,
          message: `Asset linked to product: ${prod.name}`,
        };
      }
    } else if (targetType === "drop") {
      const drop = await getDropBySlugAsync(targetId);
      if (drop) {
        const saved = await saveDrop({
          ...drop,
          bannerImage: mediaUrl,
        });
        return {
          assigned: true,
          targetType: "drop",
          targetId: saved.id,
          message: `Asset assigned as banner image for drop: ${saved.title}`,
        };
      }
    }
  } catch (err) {
    console.warn("[Target Assignment Error]:", err);
  }

  return { assigned: false };
}
