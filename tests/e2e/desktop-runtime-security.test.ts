import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const security = require(
  "../../electron/runtime-security.cjs",
);

test(
  "desktop API config accepts only explicit absolute API URLs",
  () => {
    assert.equal(
      security.normalizeApiBaseUrl(
        "http://192.168.1.62:5000/api/v1",
      ),
      "http://192.168.1.62:5000/api/v1",
    );

    assert.equal(
      security.normalizeApiBaseUrl(
        "https://server.example/api/v1/",
      ),
      "https://server.example/api/v1",
    );

    for (const invalid of [
      undefined,
      "",
      "/api/v1",
      "file:///api/v1",
      "aibos://app/api/v1",
      "REPLACE_WITH_MAIN_GOLDEN_PC_API_BASE_URL",
      "http://user:pass@server:5000/api/v1",
      "http://server:5000/wrong",
      "http://server:5000/api/v1?x=1",
    ]) {
      assert.equal(
        security.normalizeApiBaseUrl(
          invalid,
        ),
        undefined,
      );
    }
  },
);

test(
  "desktop API config rejects known placeholder example hostnames even when otherwise well-formed",
  () => {
    /*
     * Regression test: a config file containing the literal example
     * hostname "SERVER" (copied from this file's own error message
     * text) was previously accepted as a valid production config
     * because it was a well-formed http(s)://.../api/v1 URL. It must
     * now be rejected exactly like an unresolved REPLACE_WITH_
     * placeholder.
     */
    for (const placeholderUrl of [
      "http://SERVER:5000/api/v1",
      "http://server:5000/api/v1",
      "https://Server/api/v1",
      "http://example.com/api/v1",
      "http://YourServer/api/v1",
    ]) {
      assert.equal(
        security.normalizeApiBaseUrl(
          placeholderUrl,
        ),
        undefined,
        `expected "${placeholderUrl}" to be rejected as a placeholder hostname`,
      );
    }

    assert.equal(
      security.normalizeApiBaseUrl(
        "https://bos.worknai.in/api/v1",
      ),
      "https://bos.worknai.in/api/v1",
    );
  },
);

test(
  "ProgramData runtime config overrides placeholder packaged config",
  () => {
    const temp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "aibos-runtime-config-",
      ),
    );

    try {
      const resources = path.join(
        temp,
        "resources",
      );

      const programData = path.join(
        temp,
        "ProgramData",
      );

      fs.mkdirSync(
        resources,
        {
          recursive: true,
        },
      );

      fs.mkdirSync(
        path.join(
          programData,
          "AI BOS",
        ),
        {
          recursive: true,
        },
      );

      fs.writeFileSync(
        path.join(
          resources,
          "aibos-config.json",
        ),
        JSON.stringify({
          API_BASE_URL:
            "REPLACE_WITH_MAIN_GOLDEN_PC_API_BASE_URL",
        }),
      );

      fs.writeFileSync(
        path.join(
          programData,
          "AI BOS",
          "aibos-config.json",
        ),
        JSON.stringify({
          API_BASE_URL:
            "http://192.168.1.62:5000/api/v1",
        }),
      );

      const config =
        security.readRuntimeConfig({
          resourcesPath: resources,
          explicitConfigPath: null,
          programDataRoot: programData,
        });

      assert.equal(
        config.API_BASE_URL,
        "http://192.168.1.62:5000/api/v1",
      );
    } finally {
      fs.rmSync(
        temp,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "packaged desktop config fails closed when only placeholder exists",
  () => {
    const temp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "aibos-runtime-invalid-",
      ),
    );

    try {
      fs.writeFileSync(
        path.join(
          temp,
          "aibos-config.json",
        ),
        JSON.stringify({
          API_BASE_URL:
            "REPLACE_WITH_MAIN_GOLDEN_PC_API_BASE_URL",
        }),
      );

      assert.throws(
        () =>
          security.readRuntimeConfig({
            resourcesPath: temp,
            explicitConfigPath: null,
            programDataRoot: null,
          }),
        /No valid AI BOS desktop API configuration/,
      );
    } finally {
      fs.rmSync(
        temp,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "custom renderer protocol confines file access to renderer root",
  () => {
    const temp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "aibos-renderer-",
      ),
    );

    try {
      fs.mkdirSync(
        path.join(
          temp,
          "assets",
        ),
        {
          recursive: true,
        },
      );

      fs.writeFileSync(
        path.join(
          temp,
          "index.html",
        ),
        "<html></html>",
      );

      fs.writeFileSync(
        path.join(
          temp,
          "assets",
          "app.js",
        ),
        "console.log('ok')",
      );

      const rootRequest =
        security.resolveRendererRequest(
          temp,
          "aibos://app/",
        );

      assert.equal(
        rootRequest.status,
        200,
      );

      assert.equal(
        rootRequest.filePath,
        path.join(
          temp,
          "index.html",
        ),
      );

      const assetRequest =
        security.resolveRendererRequest(
          temp,
          "aibos://app/assets/app.js",
        );

      assert.equal(
        assetRequest.status,
        200,
      );

      assert.equal(
        assetRequest.filePath,
        path.join(
          temp,
          "assets",
          "app.js",
        ),
      );

      const spaRoute =
        security.resolveRendererRequest(
          temp,
          "aibos://app/login",
        );

      assert.equal(
        spaRoute.status,
        200,
      );

      assert.equal(
        spaRoute.filePath,
        path.join(
          temp,
          "index.html",
        ),
      );

      const wrongHost =
        security.resolveRendererRequest(
          temp,
          "aibos://evil/index.html",
        );

      assert.equal(
        wrongHost.status,
        403,
      );

      const escapeAttempt =
        security.resolveRendererRequest(
          temp,
          "aibos://app/%5c..%5c..%5cWindows%5cwin.ini",
        );

      assert.equal(
        escapeAttempt.status,
        403,
      );
    } finally {
      fs.rmSync(
        temp,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "external navigation accepts web URLs only",
  () => {
    assert.equal(
      security.isAllowedExternalUrl(
        "https://example.com",
      ),
      true,
    );

    assert.equal(
      security.isAllowedExternalUrl(
        "http://example.com",
      ),
      true,
    );

    assert.equal(
      security.isAllowedExternalUrl(
        "file:///C:/Windows/win.ini",
      ),
      false,
    );

    assert.equal(
      security.isAllowedExternalUrl(
        "javascript:alert(1)",
      ),
      false,
    );

    assert.equal(
      security.isAllowedExternalUrl(
        "aibos://app/login",
      ),
      false,
    );
  },
);
test(
  "packaged Admin and Employee runtime config templates ship a real production hostname, never a placeholder",
  () => {
    const repoRoot = process.cwd();

    for (const relativeFile of [
      "packaging/runtime-config/admin-aibos-config.json",
      "packaging/runtime-config/employee-aibos-config.json",
    ]) {
      const source = fs.readFileSync(
        path.join(repoRoot, relativeFile),
        "utf8",
      );

      const parsed = JSON.parse(source) as {
        API_BASE_URL?: unknown;
      };

      const normalized =
        security.normalizeApiBaseUrl(
          parsed.API_BASE_URL,
        );

      assert.notEqual(
        normalized,
        undefined,
        `${relativeFile} must contain a real, non-placeholder production API_BASE_URL`,
      );

      assert.equal(
        normalized,
        "https://bos.worknai.in/api/v1",
        `${relativeFile} must point at the production hostname architecture`,
      );

      assert.doesNotMatch(
        source,
        /REPLACE_WITH_|SERVER:5000|http:\/\/SERVER/i,
        `${relativeFile} must not contain a placeholder API URL`,
      );
    }
  },
);

test(
  "if a packaged Admin build output exists, its shipped resources config contains the real production URL, never a placeholder",
  () => {
    const repoRoot = process.cwd();
    const packagedConfigPath = path.join(
      repoRoot,
      "dist",
      "admin-installer",
      "win-unpacked",
      "resources",
      "aibos-config.json",
    );

    if (!fs.existsSync(packagedConfigPath)) {
      /*
       * Nothing to check yet — this test only guards an existing
       * packaged build output, not the packaging step itself. The
       * template-file test above already guarantees the *source*
       * that would be packaged is correct.
       */
      return;
    }

    const source = fs.readFileSync(
      packagedConfigPath,
      "utf8",
    );

    const parsed = JSON.parse(source) as {
      API_BASE_URL?: unknown;
    };

    const normalized =
      security.normalizeApiBaseUrl(
        parsed.API_BASE_URL,
      );

    assert.notEqual(
      normalized,
      undefined,
      "packaged Admin resources/aibos-config.json must contain a real, non-placeholder production API_BASE_URL",
    );

    assert.equal(
      normalized,
      "https://bos.worknai.in/api/v1",
    );

    assert.doesNotMatch(
      source,
      /REPLACE_WITH_|SERVER:5000|http:\/\/SERVER/i,
      "packaged Admin resources/aibos-config.json must not contain a placeholder API URL",
    );
  },
);

test(
  "runtime config IPC validates packaged renderer sender",
  () => {
    const repoRoot = process.cwd();

    for (const relativeFile of [
      "electron/admin-main.cjs",
      "electron/employee-main.cjs",
    ]) {
      const source = fs.readFileSync(
        path.join(repoRoot, relativeFile),
        "utf8",
      );

      assert.match(
        source,
        /event\.senderFrame\?\.url/,
      );

      assert.match(
        source,
        /event\.sender\?\.getURL\?\.\(\)/,
      );

      assert.match(
        source,
        /isAppUrl\(senderUrl\)/,
      );

      assert.match(
        source,
        /if \(!app\.isPackaged\)/,
      );

      assert.match(
        source,
        /event\.returnValue = runtimeConfig/,
      );
    }
  },
);