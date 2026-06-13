type IconDomainInput = {
  package_id: string;
  name: string;
  publisher: string;
  homepage?: string | null;
  publisher_url?: string | null;
};

const DOMAIN_MAP: Record<string, string> = {
  "google.chrome": "google.com",
  "mozilla.firefox": "mozilla.org",
  "git.git": "git-scm.com",
  "microsoft.edge": "microsoft.com",
  "microsoft.visualstudiocode": "code.visualstudio.com",
  "microsoft.powershell": "microsoft.com",
  "microsoft.windowsterminal": "microsoft.com",
  "valvesoftware.steam": "steampowered.com",
  "discord.discord": "discord.com",
  "slacktechnologies.slack": "slack.com",
  "spotify.spotify": "spotify.com",
  "zoom.zoom": "zoom.us",
  "notion.notion": "notion.so",
  "obsproject.obsstudio": "obsproject.com",
  "videolan.vlc": "videolan.org",
  "7zip.7zip": "7-zip.org",
  "python.python": "python.org",
  "openjs.nodejs": "nodejs.org",
  "docker.dockerdesktop": "docker.com",
};

export function domainFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function resolveIconDomain(input: IconDomainInput): string | null {
  if (input.homepage) {
    const fromHomepage = domainFromUrl(input.homepage);
    if (fromHomepage) return fromHomepage;
  }

  if (input.publisher_url) {
    const fromPublisher = domainFromUrl(input.publisher_url);
    if (fromPublisher) return fromPublisher;
  }

  const mapped = DOMAIN_MAP[input.package_id.toLowerCase()];
  if (mapped) return mapped;

  const publisherSlug = input.publisher
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corporation|corp|gmbh|software|technologies|team|project)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  if (publisherSlug.length >= 3) return `${publisherSlug}.com`;

  const nameSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  if (nameSlug.length >= 3) return `${nameSlug}.com`;

  return null;
}

export function iconCandidatesForDomain(domain: string): string[] {
  const encoded = encodeURIComponent(domain);
  return [
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${encoded}&sz=128`,
  ];
}
