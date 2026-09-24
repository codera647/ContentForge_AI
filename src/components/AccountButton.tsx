"use client";

import { UserButton } from "@clerk/nextjs";

export default function AccountButton() {
  return <UserButton userProfileMode="modal" />;
}
