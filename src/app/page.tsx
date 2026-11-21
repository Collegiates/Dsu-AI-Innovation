import { APP_NAME } from "@/lib/config/app";

/**
 * Placeholder home page so the app runs end to end while features are built.
 * The real Dashboard (savings, recommended trip, needs-your-attention strip) replaces it in a later phase.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16">
      <h1 className="text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="text-muted-foreground">Weekly groceries for less, on your way home.</p>
    </main>
  );
}
