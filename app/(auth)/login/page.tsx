import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { getServerT } from "@/lib/i18n/server";

export default async function LoginPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[500px] shrink-0 flex-col justify-between bg-[#0F1115] p-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="ContactShip"
            width={32}
            height={32}
            className="shrink-0"
            priority
          />
          <span className="text-sm font-semibold text-white">ContactShip</span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
            CRM workspace
          </p>
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-white">
            {t("login.brand.tagline")}
          </h1>
          <p className="text-sm leading-relaxed text-white/55">
            {t("login.brand.desc")}
          </p>
        </div>

        <p className="font-mono text-[11px] text-white/25">
          {t("login.brand.year")} · {new Date().getFullYear()}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-base px-8 py-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Image
            src="/logo.png"
            alt="ContactShip"
            width={28}
            height={28}
            className="shrink-0"
            priority
          />
          <span className="text-sm font-semibold text-text-primary">ContactShip</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="pb-7">
            <h2 className="text-xl font-semibold text-text-primary">{t("login.heading")}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("login.subheading")}
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
