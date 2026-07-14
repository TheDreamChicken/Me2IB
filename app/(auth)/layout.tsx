import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-bold tracking-tight text-brand-800"
      >
        me2<span className="text-brand-500">IB</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white/90 p-8 card-shadow">
        {children}
      </div>
    </div>
  );
}
