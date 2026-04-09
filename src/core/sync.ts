export type SyncState = {
  readonly status: "unconfigured" | "idle" | "pending";
  readonly configured: boolean;
  readonly pendingChanges: number;
};

export function describeSyncState(state: SyncState): string {
  if (!state.configured) {
    return `sync local-only | pending ${state.pendingChanges}`;
  }

  return `sync ${state.status} | pending ${state.pendingChanges}`;
}
