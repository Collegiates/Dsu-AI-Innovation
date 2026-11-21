import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config/app";
import { DemoLoginCard } from "./DemoLoginCard";

export const metadata: Metadata = { title: `Sign in · ${APP_NAME}` };

/** The demo login page: a centered card with one "Continue as James" button. */
export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <DemoLoginCard />
    </main>
  );
}
