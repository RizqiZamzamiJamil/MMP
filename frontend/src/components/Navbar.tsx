export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <h1 className="text-lg font-semibold text-slate-900">
          Media Monitor Dashboard
        </h1>
        <span className="text-right text-xs text-slate-500">
          Mention overview
        </span>
      </div>
    </header>
  );
}
