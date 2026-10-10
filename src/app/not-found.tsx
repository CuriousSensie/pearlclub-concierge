import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-display text-4xl italic leading-tight">
        Sorry, we couldn&apos;t find what you are looking for :(
      </h1>
      <Link href="/" className="pc-btn">
        Back to the concierge
      </Link>
    </main>
  );
}
