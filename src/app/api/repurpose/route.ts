import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { repurposeRequestSchema } from "@/lib/ai/validation";
import { repurposeContent } from "@/lib/ai/generators";
import { MissingApiKeyError, AiProviderError } from "@/lib/ai/provider";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { consumeAiOperation } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ id: userId } = await requireCurrentUser());
  } catch (e) {
    return handleApiError(e, "repurpose:auth", "Authentication failed");
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = repurposeRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { contentId, targetFormat } = parsed.data;

  try {
    const source = await prisma.content.findFirst({
      where: { id: contentId, userId },
    });
    if (!source) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    if (source.format === targetFormat) {
      return NextResponse.json(
        { error: "Content is already in that format. Pick a different target format." },
        { status: 400 }
      );
    }

    const brand = source.brandId
      ? await prisma.brand.findFirst({ where: { id: source.brandId, userId } })
      : null;
    if (source.brandId && !brand) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
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
    const result = await repurposeContent({
      brand: brandInput,
      sourceBody: source.body,
      sourceFormat: source.format,
      targetFormat,
      topic: source.topic,
    });

    const created = await prisma.content.create({
      data: {
        userId,
        brandId: source.brandId,
        title: result.title || source.title,
        body: result.body,
        format: targetFormat as never,
        topic: source.topic,
        audience: source.audience,
        objective: source.objective,
        tone: source.tone,
        keywords: (source.keywords as string[] | null) ?? undefined,
        cta: source.cta,
        status: "draft",
        sourceContentId: source.id,
      },
    });

    return NextResponse.json({ original: source, repurposed: created }, { status: 201 });
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return NextResponse.json({ error: e.message, code: "missing_api_key" }, { status: 400 });
    }
    if (e instanceof AiProviderError) {
      console.error("[repurpose] provider error:", e.message);
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
    return handleApiError(e, "repurpose", "Something went wrong repurposing content.");
  }
}
