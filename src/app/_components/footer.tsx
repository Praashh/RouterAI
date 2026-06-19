import {
  ChatCircleIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const Footer = () => {
  return (
    <>
      <div className="bg-muted/40 mx-auto mt-20 flex h-40 w-full max-w-6xl items-center justify-between rounded-xl border px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-secondary drop-shadow-md">
            <ChatCircleIcon weight="bold" className="size-5" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">RouterAI</h1>
            <div className="text-muted-foreground text-xs">
              &copy; {new Date().getFullYear()}
            </div>
          </div>
        </div>

       <Link
          href="https://github.com/Praashh/RouterAI"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          <GithubLogoIcon weight="bold" className="size-4" />
          GitHub
        </Link>
      </div>
    </>
  );
};
