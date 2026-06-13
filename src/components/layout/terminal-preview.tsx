"use client";

import { useEffect, useState } from "react";

type LogLine = {
  text: string;
  type: "input" | "info" | "success" | "progress" | "complete";
  progress?: number;
};

const SIMULATION_STEPS: LogLine[][] = [
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" },
    { text: "📦 Found 4 applications in stack config.", type: "info" },
    { text: "⏳ Fetching manifests from winget repository...", type: "info" }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" },
    { text: "📦 Found 4 applications in stack config.", type: "info" },
    { text: "🚀 Starting automatic batch installation...", type: "info" },
    { text: "[1/4] Installing Git.Git ... [==========>          ] 50%", type: "progress", progress: 50 }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" },
    { text: "📦 Found 4 applications in stack config.", type: "info" },
    { text: "🚀 Starting automatic batch installation...", type: "info" },
    { text: "✔ Git.Git installed successfully.", type: "success" },
    { text: "[2/4] Installing Microsoft.VisualStudioCode ... [==>               ] 15%", type: "progress", progress: 15 }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" },
    { text: "📦 Found 4 applications in stack config.", type: "info" },
    { text: "🚀 Starting automatic batch installation...", type: "info" },
    { text: "✔ Git.Git installed successfully.", type: "success" },
    { text: "✔ Microsoft.VisualStudioCode installed successfully.", type: "success" },
    { text: "[3/4] Installing Node.js ... [=================>  ] 85%", type: "progress", progress: 85 }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" },
    { text: "📦 Found 4 applications in stack config.", type: "info" },
    { text: "🚀 Starting automatic batch installation...", type: "info" },
    { text: "✔ Git.Git installed successfully.", type: "success" },
    { text: "✔ Microsoft.VisualStudioCode installed successfully.", type: "success" },
    { text: "✔ Node.js installed successfully.", type: "success" },
    { text: "[4/4] Installing Google.Chrome ... [==========>          ] 50%", type: "progress", progress: 50 }
  ],
  [
    { text: "PS C:\\Users\\Developer> winstack install --stack dev-setup", type: "input" },
    { text: "⚡ WinStack Engine v1.0.0 initializing...", type: "info" },
    { text: "📦 Found 4 applications in stack config.", type: "info" },
    { text: "🚀 Starting automatic batch installation...", type: "info" },
    { text: "✔ Git.Git installed successfully.", type: "success" },
    { text: "✔ Microsoft.VisualStudioCode installed successfully.", type: "success" },
    { text: "✔ Node.js installed successfully.", type: "success" },
    { text: "✔ Google.Chrome installed successfully.", type: "success" },
    { text: "✨ Environment deployment complete! 4/4 apps installed.", type: "complete" }
  ]
];

export function TerminalPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((current) => (current + 1) % SIMULATION_STEPS.length);
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  const lines = SIMULATION_STEPS[step] || [];

  return (
    <div className="terminal-box w-full overflow-hidden rounded-2xl border bg-black text-left text-[13px] font-medium leading-relaxed text-zinc-300">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 px-4 py-3">
        <div className="flex gap-2">
          <div className="size-3 rounded-full bg-red-500/70" />
          <div className="size-3 rounded-full bg-yellow-500/70" />
          <div className="size-3 rounded-full bg-green-500/70" />
        </div>
        <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
          powershell.exe
        </div>
        <div className="w-10" />
      </div>

      {/* Terminal Content Screen */}
      <div className="min-h-[220px] space-y-2 p-5 font-mono">
        {lines.map((line, index) => {
          if (line.type === "input") {
            return (
              <div key={index} className="text-zinc-100">
                <span className="text-emerald-500 font-semibold">{line.text.slice(0, 24)}</span>
                <span>{line.text.slice(24)}</span>
              </div>
            );
          }
          if (line.type === "success") {
            return (
              <div key={index} className="text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-200">
                <span>{line.text}</span>
              </div>
            );
          }
          if (line.type === "progress") {
            return (
              <div key={index} className="text-blue-400 font-semibold animate-in fade-in duration-100">
                {line.text}
              </div>
            );
          }
          if (line.type === "complete") {
            return (
              <div key={index} className="text-violet-400 font-bold border-t border-zinc-900 pt-2 mt-2 flex items-center gap-1 animate-pulse">
                {line.text}
              </div>
            );
          }
          return (
            <div key={index} className="text-zinc-400">
              {line.text}
            </div>
          );
        })}
        {/* blinking cursor */}
        <span className="inline-block h-3.5 w-2 translate-y-0.5 bg-zinc-400 animate-pulse" />
      </div>
    </div>
  );
}
