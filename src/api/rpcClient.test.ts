import { rpcClient, HTTPMethodNotAllowedError } from "./rpcClient";

describe("RPCClient Transport Layer Constraints", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            timestamp: new Date().toISOString(),
          }),
      }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("rejects PUT requests at runtime", async () => {
    await expect(rpcClient.put()).rejects.toThrow(HTTPMethodNotAllowedError);
  });

  it("rejects PATCH requests at runtime", async () => {
    await expect(rpcClient.patch()).rejects.toThrow(HTTPMethodNotAllowedError);
  });

  it("rejects DELETE requests at runtime", async () => {
    await expect(rpcClient.delete()).rejects.toThrow(HTTPMethodNotAllowedError);
  });

  it("formats request payload using valid POST RPC envelope", async () => {
    const envelope = {
      action: "SAVE_DRAFT" as const,
      caseId: "CASE-PB-2026-001",
      payload: { entityName: "Acme Holdings" },
    };

    await rpcClient.sendRPC("/workspace/draft/save", envelope);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/workspace/draft/save",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-RPC-Action": "SAVE_DRAFT",
        }),
        body: JSON.stringify(envelope),
      }),
    );
  });
});
