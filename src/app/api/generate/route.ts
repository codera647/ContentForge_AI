import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRequestSchema } from "@/lib/ai/validation";
import { generateVariations } from "@/lib/ai/generators";
import { MissingApiKeyError, AiProviderError } from "@/lib/ai/provider";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { consumeAiOperation } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let userId: string;
  try {
    ({ id: userId } = await requireCurrentUser());
  } catch (e) {
    return handleApiError(e, "generate:auth", "Authentication failed");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { params, save } = parsed.data;

  try {
    const brand = params.brandId
      ? await prisma.brand.findFirst({ where: { id: params.brandId, userId } })
      : null;
    if (params.brandId && !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const brandInput = brand
      ? {
          name: brand.name,
          description: brand.description,
          industry: brand.industry,
          targetAudience: brand.targetAudience,
          personality: brand.personality,
          tone: brand.tone,
          values: brand.values as string[] | null,
          preferredPhrases: brand.preferredPhrases as string[] | null,
          avoidedPhrases: brand.avoidedPhrases as string[] | null,
          writingStyle: brand.writingStyle,
          exampleContent: brand.exampleContent,
        }
      : null;

    await consumeAiOperation(userId);
    const variations = await generateVariations(brandInput, params);

    if (!save) return NextResponse.json({ variations, saved: [] });

    const saved = await Promise.all(
      variations.map((v, i) =>
        prisma.content.create({
          data: {
            userId,
            brandId: brand?.id ?? null,
            title: v.title || params.topic,
            body: v.body,
            format: params.format as never,
            topic: params.topic,
            audience: params.audience ?? null,
            objective: params.objective ?? null,
            tone: params.tone ?? null,
            keywords: params.keywords ?? [],
            cta: params.cta ?? null,
            variationIndex: i,
            status: "draft",
          },
        })
      )
    );
    return NextResponse.json({ variations, saved });
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return NextResponse.json({ error: e.message, code: "missing_api_key" }, { status: 400 });
    }
    if (e instanceof AiProviderError) {
      console.error("[generate] provider error:", e.message);
      return NextResponse.json(
        { error: "The AI provider failed to respond. Please try again.", code: "provider_error" },
        { status: 502 }
      );
    }
    if (e instanceof Error && e.message === "invalid_ai_response") {
      return NextResponse.json(
        { error: "The AI returned an unreadable response. Please try again.", code: "invalid_response" },
        { status: 502 }
      );
    }
    return handleApiError(e, "generate", "Something went wrong generating content.");
  }
}
