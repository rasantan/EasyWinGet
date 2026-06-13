import { strict as assert } from "node:assert";
import { test } from "node:test";

import { selectEntriesToFetch } from "./select-entries.js";

test("seleciona pacotes novos e com versão alterada", () => {
  const index = [
    { package_id: "A", version: "2.0" },
    { package_id: "B", version: "1.0" },
    { package_id: "C", version: "3.0" },
  ];
  const existing = new Map([
    ["A", "1.0"], // versão mudou -> incluir
    ["B", "1.0"], // igual -> ignorar
  ]);

  const result = selectEntriesToFetch(index, existing).map((e) => e.package_id);
  assert.deepEqual(result.sort(), ["A", "C"]);
});

test("respeita o limite quando fornecido", () => {
  const index = [
    { package_id: "A", version: "1" },
    { package_id: "B", version: "1" },
    { package_id: "C", version: "1" },
  ];
  const result = selectEntriesToFetch(index, new Map(), 2);
  assert.equal(result.length, 2);
});
