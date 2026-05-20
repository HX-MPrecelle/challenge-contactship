#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";
const cwd = process.cwd();

const distDir = path.join(cwd, ".next");

function killStaleNextWorkers() {
  if (!isWindows) {
    // POSIX: pkill works on the rare CI/headless dev case.
    try {
      execSync("pkill -f 'next dev' || true", { stdio: "ignore" });
    } catch {
      // pkill not installed; skip silently.
    }
    return;
  }

  // On Windows, SIGTERM does not cascade to Next's worker children. A killed
  // `pnpm dev` regularly leaves orphan node.exe processes holding handles on
  // .next/trace, so the next dev run cannot reopen the file. Match by
  // command line containing "next" but skip processes started by Claude
  // (so the tool itself does not die mid-clean).
  try {
    execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'node.exe'\\" | Where-Object { $_.CommandLine -like '*next*' -and $_.CommandLine -notlike '*claude*' -and $_.CommandLine -notlike '*cursor*' } | ForEach-Object { Write-Host ('  killed PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "inherit" }
    );
  } catch (err) {
    console.warn(`! kill step failed: ${err.message}`);
  }
}

function removeDistDir() {
  if (!existsSync(distDir)) {
    console.log(`  (no build dir to remove at ${distDir})`);
    return;
  }
  try {
    rmSync(distDir, { recursive: true, force: true });
    console.log(`  removed ${distDir}`);
  } catch (err) {
    console.error(`  failed to remove ${distDir}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("contactship: cleaning build state");
console.log("  killing stale next workers...");
killStaleNextWorkers();
console.log("  removing build dir...");
removeDistDir();
console.log("done.");
