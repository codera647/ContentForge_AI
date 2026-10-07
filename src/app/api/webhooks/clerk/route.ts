import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncClerkUser } from "@/lib/user-sync";
import { PublicApiError } from "@/lib/server-errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }
  let event: WebhookEvent;
  try { event = await verifyWebhook(req); }
  catch { return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 }); }
  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const user = event.data;
      await syncClerkUser({
        id: user.id, firstName: user.first_name, lastName: user.last_name,
        username: user.username, imageUrl: user.image_url, updatedAt: user.updated_at,
        primaryEmailAddressId: user.primary_email_address_id,
        emailAddresses: user.email_addresses.map((email) => ({
          id: email.id, emailAddress: email.email_address, verification: email.verification,
        })),
      });
    } else if (event.type === "user.deleted" && event.data.id) {
      // Preserve owned content; a deleted identity can never claim it again.
      const clerkUserId = event.data.id;
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { clerkUserId } });
        if (!user) return;
        await tx.user.updateMany({ where: { id: user.id, deletedAt: null }, data: { deletedAt: new Date() } });
        await tx.googleCalendarConnection.updateMany({ where: { userId: user.id }, data: { enabled: false } });
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PublicApiError && ["identity_email_missing", "identity_email_unverified", "account_deactivated"].includes(error.code)) {
      return NextResponse.json({ ok: true, skipped: error.code });
    }
    console.error("[clerk:webhook] User synchronization failed");
    return NextResponse.json({ error: "User synchronization failed" }, { status: 500 });
  }
}
