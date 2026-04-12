import os from "node:os";
import path from "node:path";

export type LocalStorageConfigInput = {
  readonly dataDir?: string;
  readonly xdgDataHome?: string;
  readonly homeDir?: string;
  readonly sqliteFileName?: string;
};

export type LocalStorageConfig = {
  readonly dataDir: string;
  readonly sqliteFilePath: string;
};

const DEFAULT_SQLITE_FILE_NAME = "y-felin.sqlite";

export function resolveLocalStorageConfig(
  input: LocalStorageConfigInput = {},
): LocalStorageConfig {
  const sqliteFileName = input.sqliteFileName ?? DEFAULT_SQLITE_FILE_NAME;
  const xdgDataHome =
    input.xdgDataHome ?? process.env["XDG_DATA_HOME"] ?? undefined;
  const homeDir = input.homeDir ?? process.env["HOME"] ?? os.homedir();
  const defaultDataDir = xdgDataHome
    ? path.join(xdgDataHome, "y-felin")
    : path.join(homeDir, ".local", "share", "y-felin");
  const dataDir = input.dataDir ?? defaultDataDir;

  return {
    dataDir,
    sqliteFilePath: path.join(dataDir, sqliteFileName),
  };
}
