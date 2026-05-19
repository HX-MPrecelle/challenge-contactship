export type SyncSource = "hubspot" | "local" | "ai";

export type SyncDirection = "inbound" | "outbound";

export type SyncStatus = "success" | "failed" | "skipped_loop";

export type EntityType = "contact" | "note";

export type LifecycleStage =
  | "subscriber"
  | "lead"
  | "marketingqualifiedlead"
  | "salesqualifiedlead"
  | "opportunity"
  | "customer"
  | "evangelist"
  | "other";

export interface SyncContext {
  source: SyncSource;
  hubspotUpdatedAt?: Date | null;
  lastSyncedAt?: Date | null;
}
