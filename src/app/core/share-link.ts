/**
 * Share links carry a whole diagram in the URL fragment: `/#d/<payload>`. The fragment is never
 * sent to the server, so the diagram stays in the browser. The payload is the diagram name and
 * source (`name\nsource`, UTF-8), raw deflate compressed and base64url encoded.
 */

export interface SharedDiagram {
  name: string;
  source: string;
}

const SHARE_HASH = '#d/';

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: TransformStream): Promise<Uint8Array> {
  const piped = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodeSharedDiagram(diagram: SharedDiagram): Promise<string> {
  const name = diagram.name.replace(/[\r\n]+/g, ' ');
  const bytes = new TextEncoder().encode(`${name}\n${diagram.source}`);
  return toBase64Url(await transform(bytes, new CompressionStream('deflate-raw')));
}

/** Rejects if the payload is not valid base64url, deflate or UTF-8. */
export async function decodeSharedDiagram(data: string): Promise<SharedDiagram> {
  const bytes = await transform(fromBase64Url(data), new DecompressionStream('deflate-raw'));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const split = text.indexOf('\n');
  if (split < 0) throw new Error('malformed share payload');
  return { name: text.slice(0, split), source: text.slice(split + 1) };
}

/** The payload of a share link fragment, or null if the fragment is not a share link. */
export function sharedDataFromHash(hash: string): string | null {
  return /^#d\/([A-Za-z0-9_-]+)$/.exec(hash)?.[1] ?? null;
}

export async function buildShareUrl(diagram: SharedDiagram): Promise<string> {
  return `${location.origin}/${SHARE_HASH}${await encodeSharedDiagram(diagram)}`;
}
