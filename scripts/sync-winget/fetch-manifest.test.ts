import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildManifestDir, parseLocaleManifest } from "./fetch-manifest.js";

test("buildManifestDir segue a convenção do winget-pkgs", () => {
  assert.equal(
    buildManifestDir("Microsoft.VisualStudioCode", "1.80.0"),
    "manifests/m/Microsoft/VisualStudioCode/1.80.0",
  );
  assert.equal(
    buildManifestDir("7zip.7zip", "24.09"),
    "manifests/7/7zip/7zip/24.09",
  );
});

test("parseLocaleManifest extrai metadados oficiais", () => {
  const localeYaml = `
PackageIdentifier: Microsoft.VisualStudioCode
PackageName: Visual Studio Code
Publisher: Microsoft Corporation
ShortDescription: Editor de código leve
Description: Um editor de código leve, porém poderoso.
Moniker: vscode
PackageUrl: https://code.visualstudio.com
PublisherUrl: https://www.microsoft.com
PublisherSupportUrl: https://github.com/microsoft/vscode/issues
License: MIT
ReleaseDate: 2023-07-01
Tags:
  - editor
  - developer-tools
ManifestType: defaultLocale
`;

  const parsed = parseLocaleManifest(localeYaml, {
    package_id: "Microsoft.VisualStudioCode",
    version: "1.80.0",
  });

  assert.equal(parsed.name, "Visual Studio Code");
  assert.equal(parsed.publisher, "Microsoft Corporation");
  assert.equal(parsed.description, "Editor de código leve");
  assert.equal(parsed.description_full, "Um editor de código leve, porém poderoso.");
  assert.equal(parsed.homepage, "https://code.visualstudio.com");
  assert.equal(parsed.publisher_url, "https://www.microsoft.com");
  assert.equal(parsed.license, "MIT");
  assert.equal(parsed.release_date, "2023-07-01");
  assert.deepEqual(parsed.tags, ["editor", "developer-tools"]);
  assert.ok(parsed.categories.includes("developer-tools"));
});

test("parseLocaleManifest usa fallbacks quando faltam campos", () => {
  const parsed = parseLocaleManifest("PackageIdentifier: Foo.Bar\n", {
    package_id: "Foo.Bar",
    version: "2.0",
  });

  assert.equal(parsed.name, "Foo.Bar");
  assert.equal(parsed.publisher, "");
  assert.equal(parsed.description_full, null);
  assert.equal(parsed.homepage, null);
  assert.equal(parsed.version, "2.0");
});
