"use client";
import React from "react";
import { ServerErrorPage } from "@/components/ui/ServerErrorPage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ServerErrorPage error={error} reset={reset} />;
}
