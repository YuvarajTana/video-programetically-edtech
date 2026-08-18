import type {Repository} from '../port';
import {BLOCKED_METHODS, type CallResponse} from './protocol';

/**
 * A Repository that forwards every call to a datasource service.
 *
 * Built as a Proxy rather than fifty hand-written wrappers, so a method added to
 * the port cannot be forgotten here — the two cannot drift.
 *
 * Every call returns a promise. Repository methods are synchronous in the
 * embedded adapter and awaited at the call sites, so both adapters satisfy the
 * same usage; a caller that reads a returned value without awaiting works with
 * the embedded store and not with this one, which is what the contract test
 * exists to catch.
 */
export const createHttpRepository = (baseUrl: string): Repository => {
  const endpoint = new URL('/call', baseUrl).toString();

  const call = async (method: string, args: unknown[]) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({method, args}),
    });
    const payload = (await response.json()) as CallResponse;
    if (!payload.ok) throw new Error(payload.error);
    return payload.value;
  };

  return new Proxy(
    {},
    {
      get(_target, property) {
        const method = String(property);
        if (method === 'then') return undefined; // so the proxy is not thenable
        if (BLOCKED_METHODS.has(method)) {
          return () => {
            throw new Error(`"${method}" is not available on a remote datasource.`);
          };
        }
        return (...args: unknown[]) => call(method, args);
      },
    },
  ) as unknown as Repository;
};
