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
  const services = options.services ?? createAppServices();
  const store = createAppStore(services);
  const io = options.io ?? {
    log: (message: string) => console.log(message),
    error: (message: string) => console.error(message),
  };
  const ownsServices = !options.services;

  try {
    if (argv.includes("--help") || argv.includes("-h")) {
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

    if (argv[0] === "tui") {
      io.log("Run `npm run tui` to start the Ink shell.");
      return 0;
    }

    if (argv[0] === "list" && argv[1] === "items") {
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
      argv[0] === "create" &&
      (argv[1] === "task" || argv[1] === "note")
    ) {
      const title = argv.slice(2).join(" ").trim();
      const kind = argv[1];
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

    if (argv[0] === "update" && argv[1] === "item") {
      const id = argv[2]?.trim() ?? "";
      const title = argv.slice(3).join(" ").trim();
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

    if (argv[0] === "show" && argv[1] === "sync") {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  void runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
