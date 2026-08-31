import type { RPCEnvelope, RPCResponse } from "../types/rpc";

export class HTTPMethodNotAllowedError extends Error {
  constructor(method: string) {
    super(
      `HTTP verb "${method}" is strictly prohibited by enterprise security policy. All operations must use POST.`,
    );
    this.name = "HTTPMethodNotAllowedError";
  }
}

export class RPCClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic request execution wrapper that guards against prohibited verbs.
   */
  private async execute<T>(
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<RPCResponse<T>> {
    const uppercaseMethod = method.toUpperCase();

    // Enforce RPC-over-HTTP POST constraint
    if (["PUT", "PATCH", "DELETE", "GET"].includes(uppercaseMethod)) {
      throw new HTTPMethodNotAllowedError(uppercaseMethod);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RPC-Action": (body as RPCEnvelope)?.action || "UNKNOWN",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RPC Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Sends an RPC payload strictly via POST.
   */
  public async sendRPC<TPayload, TResult>(
    endpoint: string,
    envelope: RPCEnvelope<TPayload>,
  ): Promise<RPCResponse<TResult>> {
    return this.execute<TResult>(endpoint, "POST", envelope);
  }

  /**
   * Disallowed convenience methods explicitly throwing runtime errors.
   */
  public async put(): Promise<never> {
    throw new HTTPMethodNotAllowedError("PUT");
  }

  public async patch(): Promise<never> {
    throw new HTTPMethodNotAllowedError("PATCH");
  }

  public async delete(): Promise<never> {
    throw new HTTPMethodNotAllowedError("DELETE");
  }
}

export const rpcClient = new RPCClient();
