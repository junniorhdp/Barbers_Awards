import Link from "next/link";

export function PlatformHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line bg-carbon px-8 py-4">
      <Link href="/" className="text-lg font-semibold text-gold">
        Barbers Awards
      </Link>
      <nav className="flex gap-6 text-sm">
        <Link href="/directorio" className="text-muted hover:text-gold">
          Directorio
        </Link>
        <Link href="/login" className="text-muted hover:text-gold">
          Iniciar sesión
        </Link>
        <Link href="/registro" className="text-gold hover:text-gold-amber">
          Registra tu barbería
        </Link>
      </nav>
    </header>
  );
}
