"use client";

import { ArrowRight, Leaf } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_HOME, signInDemo } from "@/lib/auth/demo";
import { APP_NAME } from "@/lib/config/app";

/**
 * The demo login: one button that marks this browser as signed in to the demo and opens the plan.
 * There is no account and no password. If the browser blocks saving (private mode), it says so instead of failing silently.
 */
export function DemoLoginCard() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  function continueAsDemo() {
    if (!signInDemo()) {
      setBlocked(true);
      return;
    }
    router.push(DEMO_HOME);
  }

  return (
    <div className="w-full max-w-md rounded-3xl border bg-surface p-10 shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_48px_-24px_rgba(30,42,34,0.18)]">
      <Link href="/" className="mx-auto flex w-fit items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Leaf aria-hidden className="size-5" />
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
      <h1 className="mt-8 text-center font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-center text-muted-foreground">Pick up this week&apos;s plan where James left it.</p>
      <Button size="lg" className="mt-8 h-12 w-full text-base" onClick={continueAsDemo}>
        Continue as James (demo) <ArrowRight aria-hidden />
      </Button>
      <p className="mt-4 text-center text-sm text-muted-foreground">Demo account — no sign-up needed.</p>
      {blocked ? (
        <p role="alert" className="mt-4 rounded-lg border bg-background p-3 text-center text-sm">
          This browser blocked saving the demo login. Turn off private browsing and try again.
        </p>
      ) : null}
    </div>
  );
}
