import crypto from 'crypto';

const ALGORITHM = 'sha256';
const KEY_ID = 'proof-key-v1';

function getSigningKey(): crypto.KeyObject {
  const pem = process.env.PROOF_SIGNING_PRIVATE_KEY;
  if (pem) {
    return crypto.createPrivateKey({ key: Buffer.from(pem, 'base64'), format: 'der', type: 'pkcs8' });
  }
  const generated = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicDer = generated.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  console.log(`[proof-signing] No PROOF_SIGNING_PRIVATE_KEY set. Generated ephemeral key for this session.`);
  console.log(`[proof-signing] Public key (base64 DER): ${publicDer}`);
  return generated.privateKey;
}

function getPublicKey(): crypto.KeyObject {
  const pem = process.env.PROOF_SIGNING_PRIVATE_KEY;
  if (pem) {
    const privateKey = crypto.createPrivateKey({ key: Buffer.from(pem, 'base64'), format: 'der', type: 'pkcs8' });
    return crypto.createPublicKey(privateKey);
  }
  const generated = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return generated.publicKey;
}

export function signProof(payload: string): { signature: string; keyId: string; algorithm: string } {
  const privateKey = getSigningKey();
  const signer = crypto.createSign(ALGORITHM);
  signer.update(payload);
  const signature = signer.sign(privateKey, 'base64');
  return { signature, keyId: KEY_ID, algorithm: ALGORITHM };
}

export function verifyProof(payload: string, signature: string): boolean {
  try {
    const publicKey = getPublicKey();
    const verifier = crypto.createVerify(ALGORITHM);
    verifier.update(payload);
    return verifier.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}

export function computeMessageHash(prevHash: string | null, messageId: string, senderId: string, text: string, timestamp: string): string {
  const data = prevHash || '' + messageId + senderId + text + timestamp;
  return crypto.createHash(ALGORITHM).update(data).digest('hex');
}

export function computeProofHashChain(messages: { hash?: string; prev_hash?: string; id: string; sender_id: string; message: string; created_at: string }[]): string {
  let hash = '';
  for (const msg of messages) {
    const prev = hash;
    hash = crypto.createHash(ALGORITHM).update(prev + msg.id + msg.sender_id + msg.message + msg.created_at).digest('hex');
  }
  return hash;
}
