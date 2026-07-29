"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function BlogGenerationStatus() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [router]);
  return <p className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">Research is running in the background. This draft will refresh automatically when the article is ready.</p>;
}
