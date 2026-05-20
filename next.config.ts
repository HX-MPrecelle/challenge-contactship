import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // .next stays at the project root. We attempted to relocate it to
  // %LOCALAPPDATA% to dodge OneDrive's mid-write locks on .next/trace, but
  // Next.js generates type stubs with relative paths that assume distDir
  // sits inside the project, which broke `next build`'s own typecheck.
  // The pragmatic recovery path is `pnpm clean`, which kills orphan Next
  // workers (Windows SIGTERM doesn't cascade to children) and removes the
  // build dir.
};

export default nextConfig;
