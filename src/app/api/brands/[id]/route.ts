import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";
import { brandSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const brand = await prisma.brand.findFirst({ where: { id, userId } });
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json({ brand });
  } catch (e) {
    console.error("[brands:get]", e);
    return NextResponse.json({ error: "Failed to load brand" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const parsed = brandSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    const brand = await prisma.brand.update({ where: { id }, data: parsed.data as never });
    return NextResponse.json({ brand });
  } catch (e) {
    console.error("[brands:update]", e);
    return NextResponse.json({ error: "Failed to update brand" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[brands:delete]", e);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}
