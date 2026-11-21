import { Leaf } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config/app";

/** The landing page's top bar: the app name on the left and a "Try the demo" button on the right. */
export function LandingHeader() {
  return (
    <header className="relative z-10 mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-10">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Leaf aria-hidden className="size-4" />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
      <nav aria-label="Landing" className="flex items-center gap-6 text-sm font-medium">
        <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
          How it works
        </a>
        <Button asChild variant="outline">
          <Link href="/login">Try the demo</Link>
        </Button>
      </nav>
    </header>
  );
}
