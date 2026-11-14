"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useRealtime } from "@/contexts/realtime-context";
import { GoogleTranslateWidget } from "@/components/GoogleTranslateWidget";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-cream px-1.5 py-0.5 text-xs font-semibold text-terracotta-dark">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const { unreadNotifications, unreadMessages } = useRealtime();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="bg-terracotta text-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="font-heading text-2xl font-semibold tracking-tight">
          COOKify
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium sm:flex">
          <Link href="/" className="hover:underline">
            Explore Recipes
          </Link>
          {user && (
            <>
              <Link href="/recipes/new" className="hover:underline">
                Upload Recipe
              </Link>
              <Link href="/chat" className="flex items-center hover:underline">
                Chat
                <Badge count={unreadMessages} />
              </Link>
              <Link href="/notifications" className="flex items-center hover:underline">
                Notifications
                <Badge count={unreadNotifications} />
              </Link>
              <Link href={`/profile/${user.username}`} className="hover:underline">
                Profile
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <GoogleTranslateWidget />
          {user ? (
            <button
              onClick={() => handleLogout()}
              className="cursor-pointer rounded-full border border-cream/50 px-4 py-1.5 text-sm font-medium hover:bg-cream/10"
            >
              Log out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-cream/10">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-cream px-4 py-1.5 text-sm font-medium text-terracotta-dark hover:bg-cream/90"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav row */}
      {user && (
        <nav className="flex items-center gap-4 overflow-x-auto border-t border-cream/20 px-4 py-2 text-sm font-medium sm:hidden">
          <Link href="/recipes/new">Upload Recipe</Link>
          <Link href="/chat" className="flex items-center">
            Chat
            <Badge count={unreadMessages} />
          </Link>
          <Link href="/notifications" className="flex items-center">
            Notifications
            <Badge count={unreadNotifications} />
          </Link>
          <Link href={`/profile/${user.username}`}>Profile</Link>
        </nav>
      )}
    </header>
  );
}
