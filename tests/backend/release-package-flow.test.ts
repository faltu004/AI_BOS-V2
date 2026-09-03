import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("Main PC setup stages, health-checks, preserves env, and rolls back failures", async () => {
  const source = await readFile("packaging/server/setup-main-pc-from-zip.ps1", "utf8");

  assert.match(source, /Copy-Item[\s\S]*\$incomingDist/);
  assert.match(source, /Stop-ScheduledTask/);
  assert.match(source, /Start-ScheduledTask/);
  assert.match(source, /Wait-BackendStopped/);
  assert.match(source, /Wait-BackendStarted/);
  assert.match(source, /Get-ScheduledTask/);
  assert.match(source, /Get-NetTCPConnection/);
  assert.match(source, /BackendStopTimeoutSeconds/);
  assert.match(source, /BackendStartTimeoutSeconds/);
  assert.doesNotMatch(source, /Start-Sleep\s+-Seconds\s+2\b/);
  assert.match(source, /Restore-PreviousBackend/);
  assert.match(source, /release-backups/);
  assert.match(source, /Get-FileHash[\s\S]*\$productionEnv/);
  assert.doesNotMatch(source, /Copy-Item[^\r\n]*\.env/);
  assert.match(source, /AI-BOS-Admin-Setup-\*\.exe/);

  assert.match(source, /DirectBackendHealthUrl\s*=\s*"http:\/\/127\.0\.0\.1:5000\/health"/);
  assert.match(source, /HealthUrl\s*=\s*"https:\/\/ADMIN-WORKNAI:5443\/health"/);
  assert.match(source, /Resolve-HealthUri/);
  assert.doesNotMatch(source, /\[https?:\/\/[^\]]+\]\(https?:\/\//);

  const startIndex = source.indexOf("Start-BackendTask", source.indexOf("try {", source.indexOf("Restore-PreviousBackend")));
  const directHealthIndex = source.indexOf("Wait-HealthEndpoint -Uri $DirectBackendHealthUri", startIndex);
  const tlsHealthIndex = source.indexOf("Wait-HealthEndpoint -Uri $TlsHealthUri", directHealthIndex);
  assert.ok(startIndex >= 0 && directHealthIndex > startIndex && tlsHealthIndex > directHealthIndex);

  assert.match(source, /BACKEND_START_FAILED:/);
  assert.match(source, /BACKEND_HEALTH_FAILED:/);
  assert.match(source, /TLS_GATEWAY_HEALTH_FAILED:/);
  assert.match(
    source,
    /}\s*catch\s*{\s*\$failure\s*=\s*\$_[\s\S]*Restore-PreviousBackend[\s\S]*throw\s+\$failure/,
  );

  const rollbackStart = source.indexOf("function Restore-PreviousBackend");
  const rollbackEnd = source.indexOf("\ntry {", rollbackStart);
  const rollbackSource = source.slice(rollbackStart, rollbackEnd);
  assert.match(rollbackSource, /Stop-BackendTask[\s\S]*Start-BackendTask/);
  assert.match(rollbackSource, /Wait-HealthEndpoint -Uri \$DirectBackendHealthUri/);
});

test("Main PC backend deployment helpers handle delayed stop/start and ordered health checks", async () => {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "tests/packaging/backend-deployment-start-stop.test.ps1",
  ]);

  assert.match(stdout, /PASS: backend deployment stop\/start\/health\/rollback polling/);
});

test("release builder creates the requested FINAL archive and refuses LATEST", async () => {
  const source = await readFile("packaging/server/build-main-pc-release.ps1", "utf8");

  assert.match(source, /AI-BOS-MainPC-Deploy-20260829-FINAL\.zip/);
  assert.match(source, /backend-dist/);
  assert.match(source, /AI-BOS-Admin-Setup-\*\.exe/);
  assert.match(source, /AI-BOS-Employee-Setup-\*\.exe/);
  assert.match(source, /setup-main-pc-from-zip\.ps1/);
  assert.match(source, /README_INSTRUCTIONS\.txt/);
  assert.match(source, /does not overwrite the LATEST archive/);
});
