import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "yqhjscguprljiiajwncw";
const ENV_KEY = "SUPABASE_SERVICE_ROLE_KEY";

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const zedSettings = resolve(
    process.env.APPDATA ?? "",
    "Zed",
    "settings.json",
  );

  try {
    const raw = readFileSync(zedSettings, "utf8");
    const match = raw.match(/"supabase_access_token"\s*:\s*"([^"]+)"/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    // ignore
  }

  throw new Error(
    "SUPABASE_ACCESS_TOKEN não encontrado. Defina a variável ou configure no Zed.",
  );
}

async function fetchServiceRoleKey(accessToken) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao buscar API keys (${response.status}): ${body}`);
  }

  const keys = await response.json();
  const serviceRole = keys.find(
    (entry) =>
      entry.name === "service_role" ||
      entry.type === "service_role" ||
      entry.id === "service_role",
  );

  if (!serviceRole?.api_key) {
    throw new Error("service_role key não encontrada na resposta da API.");
  }

  return serviceRole.api_key;
}

function upsertEnvLocal(serviceRoleKey) {
  const envPath = resolve(process.cwd(), ".env.local");
  let content = "";

  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    // new file
  }

  const line = `${ENV_KEY}=${serviceRoleKey}`;
  const pattern = new RegExp(`^${ENV_KEY}=.*$`, "m");

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = content.trimEnd();
    content += `${content.endsWith("\n") || content.length === 0 ? "" : "\n"}${line}\n`;
  }

  writeFileSync(envPath, content, "utf8");
  console.log("✓ .env.local atualizado");
}

function upsertVercelEnv(serviceRoleKey) {
  for (const environment of ["production", "development"]) {
    try {
      execSync(`vercel env rm ${ENV_KEY} ${environment} --yes`, {
        stdio: "pipe",
      });
    } catch {
      // variable may not exist yet
    }

    const args = [
      "env",
      "add",
      ENV_KEY,
      environment,
      "--yes",
      "--force",
      ...(environment === "production" ? ["--sensitive"] : []),
    ];

    const result = spawnSync("vercel", args, {
      input: serviceRoleKey,
      encoding: "utf8",
      shell: process.platform === "win32",
    });

    if (result.status !== 0) {
      throw new Error(`Falha ao configurar Vercel ${environment}.`);
    }

    console.log(`✓ Vercel ${environment}: ${ENV_KEY} configurada`);
  }

  const previewResult = spawnSync(
    "vercel",
    [
      "env",
      "add",
      ENV_KEY,
      "preview",
      "--value",
      serviceRoleKey,
      "--yes",
      "--force",
      "--sensitive",
      "--non-interactive",
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );

  if (previewResult.status === 0) {
    console.log("✓ Vercel preview: configurada");
  } else {
    console.warn(
      "⚠ Preview: configure manualmente no dashboard da Vercel (Environment Variables → Preview → All Previews).",
    );
  }
}

const accessToken = readAccessToken();
const serviceRoleKey = await fetchServiceRoleKey(accessToken);
upsertEnvLocal(serviceRoleKey);
upsertVercelEnv(serviceRoleKey);
console.log("Configuração concluída.");
