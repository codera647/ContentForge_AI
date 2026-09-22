import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";
import { repurposeRequestSchema } from "@/lib/ai/validation";
import { repurposeContent } from "@/lib/ai/generators";
import { MissingApiKeyError, AiProviderError } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
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
    const userId = await getDefaultUserId();
    const source = await prisma.content.findFirst({
      where: { id: contentId, userId },
      include: { brand: true },
    });
    if (!source) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    if (source.format === targetFormat) {
      return NextResponse.json(
        { error: "Content is already in that format. Pick a different target format." },
        { status: 400 }
      );
    }

    const brandInput = source.brand
      ? {
          name: source.brand.name,
          description: source.brand.description,
          industry: source.brand.industry,
          targetAudience: source.brand.targetAudience,
          personality: source.brand.personality,
          tone: source.brand.tone,
          values: source.brand.values as string[] | null,
          preferredPhrases: source.brand.preferredPhrases as string[] | null,
          avoidedPhrases: source.brand.avoidedPhrases as string[] | null,
          writingStyle: source.brand.writingStyle,
          exampleContent: source.brand.exampleContent,
        }
      : null;

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
    console.error("[repurpose] unexpected error:", e);
    return NextResponse.json({ error: "Something went wrong repurposing content." }, { status: 500 });
  }
}
