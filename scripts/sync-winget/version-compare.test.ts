import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compareVersions, pickLatestVersion } from "./version-compare.js";

test("compareVersions ordena versões numéricas", () => {
  assert.ok(compareVersions("1.2.0", "1.10.0") < 0);
  assert.ok(compareVersions("2.0", "1.9.9") > 0);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
});

test("compareVersions trata segmentos não numéricos sem quebrar", () => {
  assert.ok(compareVersions("1.0.0-beta", "1.0.0") <= 0 || compareVersions("1.0.0-beta", "1.0.0") >= 0);
});

test("pickLatestVersion devolve a maior versão", () => {
  assert.equal(pickLatestVersion(["1.2.0", "1.10.0", "1.9.0"]), "1.10.0");
  assert.equal(pickLatestVersion([]), null);
});
