import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { createAppServices, createLocalEngine } from "../src/index.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("CLI sync seam", () => {
  it("shows local-only sync state", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-cli-sync-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const logs: string[] = [];
    const errors: string[] = [];

    await expect(
      runCli(["show", "sync"], {
        services,
        io: {
          log: (message) => logs.push(message),
          error: (message) => errors.push(message),
        },
      }),
    ).resolves.toBe(0);

    expect(logs).toEqual(["sync local-only | pending 0"]);
    expect(errors).toEqual([]);

    await services.dispose();
  });
});
