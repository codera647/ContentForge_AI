import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";
import { brandSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getDefaultUserId();
    const brands = await prisma.brand.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { content: true } } },
    });
    return NextResponse.json({ brands });
  } catch (e) {
    console.error("[brands:list]", e);
    return NextResponse.json({ error: "Failed to load brands" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getDefaultUserId();
    const parsed = brandSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const brand = await prisma.brand.create({
      data: { ...parsed.data, userId } as never,
    });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (e) {
    console.error("[brands:create]", e);
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 });
  }
}
