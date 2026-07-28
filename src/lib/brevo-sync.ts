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
    // parsing — left as-is they make the whole body invalid JSON.
    const rawBody = await makeResponse.text();
    payload = JSON.parse(rawBody.replace(WRAPPED_VALUE, '$1'));
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
