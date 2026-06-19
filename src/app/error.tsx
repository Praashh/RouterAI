"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex h-dvh w-full items-center justify-center px-4">
      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="absolute top-1/2 left-1/2 -z-10 h-40 w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-400 opacity-20 blur-[6em]" />

        <div className="text-muted-foreground/40 text-[8rem] leading-none font-bold tracking-tighter select-none">
          500
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-foreground text-2xl font-bold md:text-3xl">
            Something went wrong
          </h1>
          <p className="text-muted-foreground max-w-md text-balance">
            An unexpected error occurred. Please try again, or head back home if
            the problem persists.
          </p>
        </div>

        {error.digest && (
          <p className="text-muted-foreground/60 font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-2 flex items-center gap-4">
          <Button onClick={() => reset()} className="h-10 w-36 rounded-xl">
            Try again
          </Button>
          <Button variant="outline" className="h-10 w-36 rounded-xl" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
