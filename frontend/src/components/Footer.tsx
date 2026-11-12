export function Footer() {
  return (
    <footer className="mt-auto bg-terracotta-dark text-cream/90">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center text-sm sm:px-6">
        <p className="font-heading text-lg">COOKify</p>
        <p>Share recipes, discover new favorites, and cook along with the community.</p>
        <p className="text-cream/70">contact@cookify.dev &middot; Built for a technical interview assignment</p>
        <a href="/dev-mail" className="text-xs text-cream/60 underline">
          Dev Mailbox (local testing)
        </a>
      </div>
    </footer>
  );
}
