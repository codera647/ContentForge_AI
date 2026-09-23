import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { contentUpdateSchema } from "@/lib/ai/validation";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const content = await prisma.content.findFirst({
      where: { id, userId },
      include: {
        brand: true,
        schedules: true,
        source: { select: { title: true, id: true } },
        repurposed: { select: { title: true, id: true, format: true } },
      },
    });
    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    return NextResponse.json({ content });
  } catch (e) {
    return handleApiError(e, "content:get", "Failed to load content");
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const parsed = contentUpdateSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const updated = await prisma.content.updateMany({
      where: { id, userId },
      data: { ...parsed.data, format: parsed.data.format as never },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    const content = await prisma.content.findFirst({ where: { id, userId } });
    return NextResponse.json({ content });
  } catch (e) {
    return handleApiError(e, "content:update", "Failed to update content");
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const deleted = await prisma.content.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "content:delete", "Failed to delete content");
  }
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  // POST = duplicate
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    const copy = await prisma.content.create({
      data: {
        userId: existing.userId,
        brandId: existing.brandId,
        title: `${existing.title} (copy)`,
        body: existing.body,
        format: existing.format,
        topic: existing.topic,
        audience: existing.audience,
        objective: existing.objective,
        tone: existing.tone,
        keywords: existing.keywords,
        cta: existing.cta,
        status: "draft",
        sourceContentId: existing.sourceContentId,
        variationIndex: existing.variationIndex,
      } as never,
    });
    return NextResponse.json({ content: copy }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "content:duplicate", "Failed to duplicate content");
  }
}
