import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { brandSchema } from "@/lib/ai/validation";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { createBrandWithinLimit } from "@/lib/limits";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { id: userId } = await requireCurrentUser();
    const brands = await prisma.brand.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { content: true } } },
    });
    return NextResponse.json({ brands });
  } catch (e) {
    return handleApiError(e, "brands:list", "Failed to load brands");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await requireCurrentUser();
    const parsed = brandSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const brand = await createBrandWithinLimit({
      ...parsed.data,
      userId,
    } as never);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "brands:create", "Failed to create brand");
  }
}
