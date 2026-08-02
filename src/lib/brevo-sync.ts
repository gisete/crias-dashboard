export interface MakeResyncResponse {
  FIRSTNAME?: string;
  TEL_SMS?: string;
  CHILD_NAME?: string;
  CHILD_DOB?: string | { value?: string };
}

// Brevo stores some DOBs as {"value":"06/11/2025"}; Make interpolates that
// raw into its JSON response, producing an invalid body. Unwrap the pattern
// down to just the inner content.
export const WRAPPED_VALUE = /\{"value":"([^"]+)"\}/g;

/** Handles CHILD_DOB arriving as a plain string, a wrapped string, or —
 * should Make start escaping properly — a parsed {value} object. */
export function unwrapDob(raw: MakeResyncResponse['CHILD_DOB']): string | undefined {
  if (raw && typeof raw === 'object') {
    return typeof raw.value === 'string' ? raw.value : undefined;
  }
  return raw?.replace(WRAPPED_VALUE, '$1');
}

/**
 * Decide which existing child row each name coming back from Brevo refers to.
 *
 * The name *is* the identity: rows are paired only on an exact (trimmed,
 * case-insensitive) name match. An unmatched Brevo name is a new child, and an
 * existing row nobody matched has left the family.
 *
 * Deliberately no positional fallback. Given [Ana, Beto] and Brevo returning
 * [Ana, Carlos] there is no way to tell a rename from "Beto left, Carlos
 * joined" — pairing by position would guess "rename" and hand Beto's session
 * history to Carlos. Treating it as an add plus a removal fragments a genuinely
 * renamed child's history, which is the far cheaper mistake: history stays
 * attached to whoever actually attended.
 *
 * Returns `pairs` aligned index-for-index with `newNames` (undefined = insert a
 * new row) and `removed`, the existing rows Brevo no longer lists.
 */
export function pairChildrenToNames<T extends { name: string }>(
  existing: T[],
  newNames: string[],
): { pairs: (T | undefined)[]; removed: T[] } {
  const unpaired = [...existing];
  const pairs: (T | undefined)[] = new Array(newNames.length);

  newNames.forEach((name, i) => {
    const key = name.trim().toLowerCase();
    const match = unpaired.findIndex((c) => c.name.trim().toLowerCase() === key);
    if (match !== -1) {
      pairs[i] = unpaired[match];
      unpaired.splice(match, 1);
    }
  });

  return { pairs, removed: unpaired };
}

export function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export class BrevoLookupError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * POSTs { email } to MAKE_RESYNC_WEBHOOK_URL and returns the parsed Brevo
 * fields, or null if Brevo has no contact for that email (a valid response
 * with none of the expected fields set). Throws BrevoLookupError for any
 * transport/config/parse failure, carrying the HTTP status callers should
 * respond with.
 */
export async function callBrevoLookup(email: string): Promise<MakeResyncResponse | null> {
  const webhookUrl = process.env.MAKE_RESYNC_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new BrevoLookupError('MAKE_RESYNC_WEBHOOK_URL não está configurado.', 502);
  }

  let makeResponse: Response;
  try {
    makeResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new BrevoLookupError('Não foi possível contactar o serviço de sincronização.', 502);
  }

  if (!makeResponse.ok) {
    throw new BrevoLookupError(
      `O serviço de sincronização respondeu com erro (${makeResponse.status}).`,
      502,
    );
  }

  let payload: MakeResyncResponse;
  try {
    // Read as text and unwrap Brevo's {"value":"..."} fragments before
    // parsing — left as-is they make the whole body invalid JSON. Also
    // strip trailing commas, since Make's manually constructed JSON often
    // includes them before a closing } or ].
    const rawBody = await makeResponse.text();
    const sanitized = rawBody
      .replace(WRAPPED_VALUE, '$1')
      .replace(/,\s*([}\]])/g, '$1');
    payload = JSON.parse(sanitized);
  } catch {
    throw new BrevoLookupError('Resposta inválida do serviço de sincronização.', 502);
  }

  const hasAnyField =
    payload.FIRSTNAME !== undefined ||
    payload.TEL_SMS !== undefined ||
    payload.CHILD_NAME !== undefined ||
    payload.CHILD_DOB !== undefined;

  return hasAnyField ? payload : null;
}
