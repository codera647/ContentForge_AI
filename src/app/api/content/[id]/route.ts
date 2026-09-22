import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";
import { contentUpdateSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
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
    console.error("[content:get]", e);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const parsed = contentUpdateSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    const content = await prisma.content.update({
      where: { id },
      data: { ...parsed.data, format: parsed.data.format as never },
    });
    return NextResponse.json({ content });
  } catch (e) {
    console.error("[content:update]", e);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    await prisma.content.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[content:delete]", e);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  // POST = duplicate
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    const { id: _omit, createdAt: _c, updatedAt: _u, ...data } = existing;
    const copy = await prisma.content.create({
      data: { ...data, title: `${existing.title} (copy)`, status: "draft" } as never,
    });
    return NextResponse.json({ content: copy }, { status: 201 });
  } catch (e) {
    console.error("[content:duplicate]", e);
    return NextResponse.json({ error: "Failed to duplicate content" }, { status: 500 });
  }
}
