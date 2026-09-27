export type SyncState = {
  readonly status: "unconfigured" | "offline" | "syncing" | "idle" | "pending";
  readonly configured: boolean;
  readonly pendingChanges: number;
};
