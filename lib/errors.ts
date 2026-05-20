export class HubSpotAuthError extends Error {
  constructor(message = "Token de HubSpot inválido o expirado") {
    super(message);
    this.name = "HubSpotAuthError";
  }
}

export class HubSpotRateLimitError extends Error {
  retryAfter?: number;

  constructor(retryAfter?: number) {
    super("HubSpot rate limit alcanzado");
    this.name = "HubSpotRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class SyncConflictError extends Error {
  localState: unknown;
  remoteState: unknown;

  constructor(localState: unknown, remoteState: unknown) {
    super("Conflicto de sincronización detectado");
    this.name = "SyncConflictError";
    this.localState = localState;
    this.remoteState = remoteState;
  }
}

export class WebhookVerificationError extends Error {
  constructor(reason: string) {
    super(`Verificación de webhook fallida: ${reason}`);
    this.name = "WebhookVerificationError";
  }
}
