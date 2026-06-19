import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { DashboardImage } from "./dashboard-image";

export default function Hero() {
  return (
    <div className="flex h-fit flex-col items-center gap-4">
      <div className="mt-32 flex flex-col items-center gap-2">
        <Badge variant={"outline"} className="mb-4">
          <div className="bg-primary text-primary size-2 animate-pulse rounded-full" />
          Always up 24/7
        </Badge>
        <div className="max-w-xl text-center text-5xl font-bold text-balance md:text-5xl">
          Your Extra-Ordinary AI chat app.
        </div>
        <p className="text-muted-foreground mt-4 max-w-xl text-center text-balance">
          RouterAI is a fast, simple and secure AI chat app that is built to
          make AI accessible to everyone
        </p>
        <div className="mt-5 flex items-center gap-4">
          <Button className="h-10 w-40 rounded-xl">
            <Link href="/ask">Chat Now</Link>
          </Button>
          <Button className="h-10 w-40 rounded-xl" variant="outline">
            <Link className="flex items-center gap-2" href="/#feedback">
              Send Feedback
              <ArrowUpRightIcon weight="bold" />
            </Link>
          </Button>
        </div>

        <div className="text-muted-foreground mt-2 text-xs">
          No credit card required to get started
        </div>
      </div>
      <DashboardImage />
      <div className="absolute top-[35rem] left-1/2 z-[-1] h-40 w-[24rem] -translate-x-1/2 rounded-full border bg-gradient-to-br from-neutral-700 to-neutral-400 blur-[4em] drop-shadow-2xl"></div>
    </div>
  );
}
