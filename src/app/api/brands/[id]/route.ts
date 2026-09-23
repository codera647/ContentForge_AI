import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { brandSchema } from "@/lib/ai/validation";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const brand = await prisma.brand.findFirst({ where: { id, userId } });
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json({ brand });
  } catch (e) {
    return handleApiError(e, "brands:get", "Failed to load brand");
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const parsed = brandSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const updated = await prisma.brand.updateMany({
      where: { id, userId },
      data: parsed.data as never,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    const brand = await prisma.brand.findFirst({ where: { id, userId } });
    return NextResponse.json({ brand });
  } catch (e) {
    return handleApiError(e, "brands:update", "Failed to update brand");
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const deleted = await prisma.brand.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "brands:delete", "Failed to delete brand");
  }
}
