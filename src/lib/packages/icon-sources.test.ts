import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  domainFromUrl,
  iconCandidatesForDomain,
  resolveIconDomain,
} from "./icon-sources";

test("domainFromUrl extrai o host sem www", () => {
  assert.equal(domainFromUrl("https://www.code.visualstudio.com/docs"), "code.visualstudio.com");
  assert.equal(domainFromUrl("http://7-zip.org"), "7-zip.org");
  assert.equal(domainFromUrl("not-a-url"), null);
});

test("resolveIconDomain prioriza homepage > publisher_url > mapa > heuristica", () => {
  assert.equal(
    resolveIconDomain({
      package_id: "X.Y",
      name: "Y",
      publisher: "Z",
      homepage: "https://product.example.com",
      publisher_url: "https://corp.example.org",
    }),
    "product.example.com",
  );

  assert.equal(
    resolveIconDomain({
      package_id: "Google.Chrome",
      name: "Chrome",
      publisher: "Google LLC",
      homepage: null,
      publisher_url: null,
    }),
    "google.com",
  );
});

test("iconCandidatesForDomain devolve servicos em ordem de qualidade", () => {
  const candidates = iconCandidatesForDomain("vlc.org");
  assert.ok(candidates[0].includes("icon.horse"));
  assert.ok(candidates.some((c) => c.includes("duckduckgo.com")));
  assert.ok(candidates.some((c) => c.includes("google.com/s2/favicons")));
});
