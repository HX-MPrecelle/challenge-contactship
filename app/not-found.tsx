export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-wide text-text-muted">404</p>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-text-primary">
        Página no encontrada
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        La ruta que buscás no existe.
      </p>
    </main>
  );
}
