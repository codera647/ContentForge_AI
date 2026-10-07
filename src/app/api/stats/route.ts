import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderStatus } from "@/lib/ai/provider";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { AI_DAILY_LIMIT, BRAND_LIMIT, utcUsageDay } from "@/lib/limits";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const userId = user.id;
    const day = utcUsageDay();
    const [totalContent, drafts, scheduled, published, archived, brands, recent, upcoming, aiUsage] =
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
        prisma.aiUsage.findUnique({ where: { userId_day: { userId, day } }, select: { count: true } }),
      ]);

    return NextResponse.json({
      stats: { totalContent, drafts, scheduled, published, archived, brands },
      recent,
      upcoming,
      ai: getProviderStatus(),
      user: { name: user.name, email: user.email, imageUrl: user.imageUrl },
      limits: { brands: BRAND_LIMIT, aiDaily: AI_DAILY_LIMIT, aiUsed: aiUsage?.count ?? 0, resetsAt: new Date(day.getTime() + 86_400_000).toISOString() },
    });
  } catch (e) {
    return handleApiError(e, "stats", "Failed to load dashboard stats");
  }
}
