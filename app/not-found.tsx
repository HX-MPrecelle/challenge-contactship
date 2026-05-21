import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyGlyph } from "@/components/ui/empty-glyph";
import { getServerT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-6 text-center">
      <EmptyGlyph kind="search" />
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">404</p>
        <h1 className="text-lg font-semibold text-text-primary">
          {t("common.notFound")}
        </h1>
        <p className="max-w-xs text-sm text-text-secondary">
          {t("common.notFoundDesc")}
        </p>
      </div>
      <Button asChild>
        <Link href="/">{t("common.goHome")}</Link>
      </Button>
    </div>
  );
}
