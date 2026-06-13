import { strict as assert } from "node:assert";
import { test } from "node:test";

import { sanitizePackage } from "./upsert-packages.js";

test("sanitizePackage remove null, undefined e strings vazias", () => {
  const result = sanitizePackage({
    package_id: "Foo.Bar",
    name: "Foo",
    publisher: "",
    description_full: null,
    homepage: undefined as unknown as string | null,
    license: "MIT",
    tags: [],
    version: "1.0",
  });

  assert.deepEqual(result, {
    package_id: "Foo.Bar",
    name: "Foo",
    license: "MIT",
    tags: [],
    version: "1.0",
  });
});

test("sanitizePackage mantém arrays e campos preenchidos", () => {
  const result = sanitizePackage({
    package_id: "A.B",
    categories: ["developer-tools"],
    popularity: 0,
  });

  assert.deepEqual(result.categories, ["developer-tools"]);
  assert.equal(result.popularity, 0);
});
