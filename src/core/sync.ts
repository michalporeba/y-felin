export type SyncState = {
  readonly status: "unconfigured" | "idle" | "pending";
  readonly configured: boolean;
  readonly pendingChanges: number;
};
