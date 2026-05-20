import os from "node:os";
import path from "node:path";
import type { NextConfig } from "next";

// OneDrive on Windows syncs files as they're written, which races with
// Next's writes to .next/trace and crashes both `next dev` and `next build`
// with EPERM. When we detect the project is inside an OneDrive-synced tree,
// redirect the build output to %LOCALAPPDATA%, which OneDrive never touches.
//
// Next.js resolves `distDir` relative to the project root, so we compute a
// relative path that escapes the OneDrive folder. On Linux / macOS / CI we
// leave it alone, so Vercel deploys are unaffected.
function resolveDistDir(): string | undefined {
  const inOneDrive =
    process.platform === "win32" && /onedrive/i.test(process.cwd());
  if (!inOneDrive) return undefined;

  const absolute = path.join(
    os.homedir(),
    "AppData",
    "Local",
    "contactship-build",
    ".next"
  );
  return path.relative(process.cwd(), absolute);
}

const distDir = resolveDistDir();

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
};

export default nextConfig;
