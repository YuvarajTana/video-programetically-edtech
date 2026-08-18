/**
 * The wire format between the backend and a remote datasource.
 *
 * Rather than hand-writing a route per repository method — there are more than
 * fifty, and they would drift — the service exposes one endpoint that names a
 * method and its arguments. The port stays the contract; this is only transport.
 */
export type CallRequest = {
  method: string;
  args: unknown[];
};

export type CallResponse =
  | {ok: true; value: unknown}
  | {ok: false; error: string; status: number};

/** Methods that must never be reachable over the network. */
export const BLOCKED_METHODS = new Set(['close', 'database', 'applyMigrations']);
