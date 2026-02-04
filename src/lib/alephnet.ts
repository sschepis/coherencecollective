import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const KEY_STORAGE_KEY = 'alephnet_identity_v1';

export interface AlephIdentity {
  publicKey: string;
  secretKey: string;
}

export const getOrGenerateIdentity = (): AlephIdentity => {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Basic validation
      if (parsed.publicKey && parsed.secretKey) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse identity, regenerating', e);
    }
  }

  // Generate new keypair
  const keyPair = nacl.sign.keyPair();
  const identity = {
    publicKey: util.encodeBase64(keyPair.publicKey),
    secretKey: util.encodeBase64(keyPair.secretKey),
  };

  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(identity));
  return identity;
};

export const signMessage = (message: string, secretKeyBase64: string) => {
  const secretKey = util.decodeBase64(secretKeyBase64);
  const messageBytes = util.decodeUTF8(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return util.encodeBase64(signature);
};

export const getPublicKey = (secretKeyBase64: string) => {
  const secretKey = util.decodeBase64(secretKeyBase64);
  const keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
  return util.encodeBase64(keyPair.publicKey);
};
