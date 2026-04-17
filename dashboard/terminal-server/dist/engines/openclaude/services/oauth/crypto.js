import { randomBytes, webcrypto } from 'crypto';
function base64URLEncode(buffer) {
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
export function generateCodeVerifier() {
    return base64URLEncode(randomBytes(32));
}
export async function generateCodeChallenge(verifier) {
    const encoded = new TextEncoder().encode(verifier);
    const digest = await webcrypto.subtle.digest('SHA-256', encoded);
    return base64URLEncode(Buffer.from(digest));
}
export function generateState() {
    return base64URLEncode(randomBytes(32));
}
//# sourceMappingURL=crypto.js.map