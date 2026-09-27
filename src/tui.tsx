import React from "react";
import { render } from "ink";
import { createAppServices } from "./core/index.js";
import { TuiShell } from "./tui/shell.js";

type ParsedTuiArgs = {
  readonly dataDir?: string;
};

export function parseTuiArgs(argv: string[]): ParsedTuiArgs {
  for (let index = argv.length - 1; index >= 0; index -= 1) {
    const flag = argv[index];
    if (flag?.startsWith("--data-dir=")) {
      const dataDir = flag.slice("--data-dir=".length);
      if (!dataDir) throw new Error("Missing value for --data-dir.");
      return { dataDir };
    }
    if (flag === "--data-dir") {
      const dataDir = argv[index + 1];
      if (!dataDir || dataDir.startsWith("-")) throw new Error("Missing value for --data-dir.");
      return { dataDir };
    }
  }
  return {};
}

export function TuiApp({ dataDir }: { readonly dataDir?: string } = {}) {
  return <TuiShell dataDir={dataDir} />;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { dataDir } = parseTuiArgs(process.argv.slice(2));
  render(<TuiApp dataDir={dataDir} />, {
    alternateScreen: true,
  });
}
