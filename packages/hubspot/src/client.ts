const API_HOST = "https://api.hubapi.com";
const DEFAULT_RETRIES = 3;
const BASE_BACKOFF_MS = 250;

export interface HubspotClientOptions {
  accessToken: string;
  /**
   * Called when HubSpot returns a 401, before any retry. Use this to refresh
   * the token in your storage layer and return the new access token. If the
   * callback is not provided, 401s propagate as `HubspotApiError`.
   */
  onUnauthorized?: () => Promise<string>;
  retries?: number;
  signal?: AbortSignal;
}

export class HubspotApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "HubspotApiError";
  }
}

export interface HubspotRequest<TBody = unknown> {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
}

export class HubspotClient {
  constructor(private options: HubspotClientOptions) {}

  async request<TResponse>(req: HubspotRequest): Promise<TResponse> {
    const retries = this.options.retries ?? DEFAULT_RETRIES;
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.executeOnce<TResponse>(req);
      } catch (err) {
        lastError = err;
        if (!this.shouldRetry(err)) throw err;
        const delay = BASE_BACKOFF_MS * 2 ** attempt;
        await sleep(delay);
      }
    }

    throw lastError ?? new Error("HubSpot request failed after retries");
  }

  private async executeOnce<TResponse>(req: HubspotRequest): Promise<TResponse> {
    const url = this.buildUrl(req);
    const init: RequestInit = {
      method: req.method,
      signal: this.options.signal,
      headers: {
        Authorization: `Bearer ${this.options.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    if (req.body !== undefined) {
      init.body = JSON.stringify(req.body);
    }

    let response = await fetch(url, init);

    if (response.status === 401 && this.options.onUnauthorized) {
      const newToken = await this.options.onUnauthorized();
      this.options.accessToken = newToken;
      response = await fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${newToken}` },
      });
    }

    if (!response.ok) {
      const body = await safeJson(response);
      throw new HubspotApiError(
        `HubSpot ${req.method} ${req.path} failed: ${response.status}`,
        response.status,
        body,
      );
    }

    if (response.status === 204) return undefined as TResponse;
    return (await response.json()) as TResponse;
  }

  private buildUrl(req: HubspotRequest): string {
    const url = new URL(`${API_HOST}${req.path}`);
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private shouldRetry(err: unknown): boolean {
    if (err instanceof HubspotApiError) {
      return err.status >= 500 || err.status === 429;
    }
    return true;
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
