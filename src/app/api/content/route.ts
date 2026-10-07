import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { contentListSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await requireCurrentUser();
    const sp = req.nextUrl.searchParams;
    const parsed = contentListSchema.safeParse(Object.fromEntries(sp));
    if (!parsed.success) return NextResponse.json({ error: "Invalid library filters", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { q, format, status, brandId, page, pageSize } = parsed.data;

    const where: Prisma.ContentWhereInput = {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { topic: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(format ? { format } : {}),
      ...(status ? { status } : {}),
      ...(brandId ? { brandId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { brand: { select: { name: true } }, schedules: { where: { status: "pending" }, orderBy: { scheduledAt: "asc" } }, source: { select: { title: true } } },
      }),
      prisma.content.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e) {
    return handleApiError(e, "content:list", "Failed to load content");
  }
}
