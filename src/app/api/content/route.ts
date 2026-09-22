import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await getDefaultUserId();
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const format = sp.get("format");
    const status = sp.get("status");
    const brandId = sp.get("brandId");
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, parseInt(sp.get("pageSize") ?? "20", 10) || 20);

    const where: Prisma.ContentWhereInput = {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { body: { contains: q } },
              { topic: { contains: q } },
            ],
          }
        : {}),
      ...(format ? { format: format as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(brandId ? { brandId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { brand: { select: { name: true } }, schedules: true, source: { select: { title: true } } },
      }),
      prisma.content.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e) {
    console.error("[content:list]", e);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}
