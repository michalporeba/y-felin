import React from "react";
import { render } from "ink";
import { createAppServices } from "./core/index.js";
import { TuiShell } from "./tui/shell.js";

type ParsedTuiArgs = {
  readonly dataDir?: string;
};

export function parseTuiArgs(argv: string[]): ParsedTuiArgs {
  const dataDirFlag = argv.find((arg) => arg === "--data-dir" || arg.startsWith("--data-dir="));
  if (!dataDirFlag) {
    return {};
  }

  if (dataDirFlag.startsWith("--data-dir=")) {
    const dataDir = dataDirFlag.slice("--data-dir=".length);
    if (!dataDir) {
      throw new Error("Missing value for --data-dir.");
    }

    return { dataDir };
  }

  const flagIndex = argv.indexOf("--data-dir");
  const dataDir = argv[flagIndex + 1];
  if (!dataDir || dataDir.startsWith("-")) {
    throw new Error("Missing value for --data-dir.");
  }

  return { dataDir };
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
