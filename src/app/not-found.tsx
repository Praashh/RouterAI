import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-background flex h-dvh w-full items-center justify-center px-4">
      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="absolute top-1/2 left-1/2 -z-10 h-40 w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-400 opacity-20 blur-[6em]" />

        <div className="text-muted-foreground/40 text-[8rem] leading-none font-bold tracking-tighter select-none">
          404
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-foreground text-2xl font-bold md:text-3xl">
            Page not found
          </h1>
          <p className="text-muted-foreground max-w-md text-balance">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-4">
          <Button className="h-10 w-36 rounded-xl" asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" className="h-10 w-36 rounded-xl" asChild>
            <Link href="/ask">Start chatting</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
