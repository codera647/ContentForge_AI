-- Additive workspace lifecycle and Google Calendar integration.
ALTER TABLE "User" ADD COLUMN "clerkUpdatedAt" TIMESTAMP(3), ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ScheduledContent"
ADD COLUMN "googleEventId" TEXT,
ADD COLUMN "googleEventUrl" TEXT,
ADD COLUMN "googleCalendarId" TEXT,
ADD COLUMN "googleExternalAccountId" TEXT,
ADD COLUMN "googleSyncError" TEXT;

CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
