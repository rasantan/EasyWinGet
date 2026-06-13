import { strict as assert } from "node:assert";
import { test } from "node:test";

import { SOURCE_URLS } from "./download-source.js";

test("SOURCE_URLS prioriza source2.msix com fallback", () => {
  assert.equal(SOURCE_URLS[0], "https://cdn.winget.microsoft.com/cache/source2.msix");
  assert.ok(SOURCE_URLS.includes("https://cdn.winget.microsoft.com/cache/source.msix"));
});
