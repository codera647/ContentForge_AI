import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderStatus } from "@/lib/ai/provider";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { id: userId } = await requireCurrentUser();
    const [totalContent, drafts, scheduled, published, archived, brands, recent, upcoming] =
      await Promise.all([
        prisma.content.count({ where: { userId } }),
        prisma.content.count({ where: { userId, status: "draft" } }),
        prisma.content.count({ where: { userId, status: "scheduled" } }),
        prisma.content.count({ where: { userId, status: "published" } }),
        prisma.content.count({ where: { userId, status: "archived" } }),
        prisma.brand.count({ where: { userId } }),
        prisma.content.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, title: true, format: true, status: true, createdAt: true, brand: { select: { name: true } } },
        }),
        prisma.scheduledContent.findMany({
          where: { userId, scheduledAt: { gte: new Date() }, status: "pending" },
          orderBy: { scheduledAt: "asc" },
          take: 5,
          include: { content: { select: { id: true, title: true, format: true } } },
        }),
      ]);

    return NextResponse.json({
      stats: { totalContent, drafts, scheduled, published, archived, brands },
      recent,
      upcoming,
      ai: getProviderStatus(),
    });
  } catch (e) {
    return handleApiError(e, "stats", "Failed to load dashboard stats");
  }
}
