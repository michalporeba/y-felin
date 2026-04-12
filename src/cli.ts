#!/usr/bin/env node

import {
  createAppServices,
  createAppStore,
  describeSyncState,
  type AppServices,
} from "./core/index.js";

type CliIo = {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
};

export async function runCli(
  argv: string[],
  options: {
    readonly services?: AppServices;
    readonly io?: CliIo;
  } = {},
): Promise<number> {
  const io = options.io ?? {
    log: (message: string) => console.log(message),
    error: (message: string) => console.error(message),
  };
  const parsed = parseCliArgs(argv);
  const services =
    options.services ??
    createAppServices({
      localStorage: parsed.dataDir ? { dataDir: parsed.dataDir } : undefined,
    });
  const store = createAppStore(services);
  const ownsServices = !options.services;

  try {
    if (parsed.argv.includes("--help") || parsed.argv.includes("-h")) {
      io.log("fln");
      io.log("");
      io.log("Current commands:");
      io.log("  fln");
      io.log("  fln --help");
      io.log("  fln tui");
      io.log("  fln list items");
      io.log("  fln create task <title>");
      io.log("  fln create note <title>");
      io.log("  fln update item <id> <title>");
      io.log("  fln show sync");

      return 0;
    }

    if (parsed.argv[0] === "tui") {
      io.log("Run `npm run tui` to start the Ink shell.");
      return 0;
    }

    if (parsed.argv[0] === "list" && parsed.argv[1] === "items") {
      const result = await store.dispatch("items.list", undefined);
      if (!result.ok) {
        io.error(result.error.message);
        return 1;
      }

      if (result.value.length === 0) {
        io.log("No items.");
        return 0;
      }

      for (const item of result.value) {
        io.log(`${item.id}  ${item.kind}  ${item.title}  ${item.createdAt}`);
      }

      return 0;
    }

    if (
      parsed.argv[0] === "create" &&
      (parsed.argv[1] === "task" || parsed.argv[1] === "note")
    ) {
      const title = parsed.argv.slice(2).join(" ").trim();
      const kind = parsed.argv[1];
      const result = await store.dispatch("items.create", { kind, title });
      if (!result.ok) {
        io.error(result.error.message);
        return 1;
      }

      io.log(
        `Created ${result.value.id}  ${result.value.kind}  ${result.value.title}  ${result.value.createdAt}`,
      );
      return 0;
    }

    if (parsed.argv[0] === "update" && parsed.argv[1] === "item") {
      const id = parsed.argv[2]?.trim() ?? "";
      const title = parsed.argv.slice(3).join(" ").trim();
      const result = await store.dispatch("items.update", { id, title });
      if (!result.ok) {
        io.error(result.error.message);
        return 1;
      }

      io.log(
        `Updated ${result.value.id}  ${result.value.kind}  ${result.value.title}  ${result.value.createdAt}`,
      );
      return 0;
    }

    if (parsed.argv[0] === "show" && parsed.argv[1] === "sync") {
      const result = await store.dispatch("sync.state", undefined);
      if (!result.ok) {
        io.error(result.error.message);
        return 1;
      }

      io.log(describeSyncState(result.value));
      return 0;
    }

    io.log("y-felin CLI placeholder");
    return 0;
  } finally {
    if (ownsServices) {
      await services.dispose();
    }
  }
}

type ParsedCliArgs = {
  readonly argv: string[];
  readonly dataDir?: string;
};

function parseCliArgs(argv: string[]): ParsedCliArgs {
  const parsedArgv: string[] = [];
  let dataDir: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--data-dir" || arg.startsWith("--data-dir=")) {
      if (arg.startsWith("--data-dir=")) {
        dataDir = arg.slice("--data-dir=".length);
        continue;
      }

      const next = argv[index + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --data-dir.");
      }

      dataDir = next;
      index += 1;
      continue;
    }

    parsedArgv.push(arg);
  }

  return {
    argv: parsedArgv,
    dataDir,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
