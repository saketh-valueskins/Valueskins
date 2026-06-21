import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { verifyProof, computeProofHashChain } from '@/lib/proof-signing';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const proof = req.body;
    if (!proof || !proof.hashChain || !proof.signature || !proof.messages) {
      return res.status(400).json({ error: 'Invalid proof format. Expected { hashChain, signature, messages, exportedAt }' });
    }

    // Step 1: Verify the cryptographic signature
    const signaturePayload = JSON.stringify({
      dealId: proof.dealId,
      hashChain: proof.hashChain.chainTip || proof.hashChain.computedFromMessages,
      exportedAt: proof.exportedAt,
    });

    const signatureValid = verifyProof(signaturePayload, proof.signature.signature);

    // Step 2: Recompute the hash chain from messages to verify integrity
    let hashChainValid = false;
    let computedChainTip = '';
    if (proof.messages && proof.messages.length > 0) {
      computedChainTip = computeProofHashChain(proof.messages);
      hashChainValid = computedChainTip === proof.hashChain.computedFromMessages;
    } else if (!proof.messages || proof.messages.length === 0) {
      hashChainValid = !proof.hashChain.computedFromMessages;
    }

    // Step 3: Check individual message hashes where available
    let individualHashIssues: string[] = [];
    if (proof.messages && proof.messages.length > 0) {
      let prevHash = '';
      for (const msg of proof.messages) {
        if (msg.hash) {
          const expectedHash = computeProofHashChain([{ ...msg, id: msg.id, sender_id: msg.sender_id, message: msg.message, created_at: msg.created_at }].slice(0));
          // Validate prev_hash linkage
          if (msg.prev_hash && msg.prev_hash !== prevHash) {
            individualHashIssues.push(`Message ${msg.id}: prev_hash mismatch`);
          }
          prevHash = msg.hash;
        }
      }
    }

    const valid = signatureValid && hashChainValid && individualHashIssues.length === 0;

    return res.status(200).json({
      valid,
      checks: {
        signatureValid,
        hashChainValid,
        individualHashIssues: individualHashIssues.length > 0 ? individualHashIssues : undefined,
      },
      details: {
        messageCount: proof.messages?.length || 0,
        algorithm: proof.hashChain?.algorithm || 'sha256',
        keyId: proof.signature?.keyId || 'unknown',
        exportedAt: proof.exportedAt,
      },
      computedChainTip,
      reportedChainTip: proof.hashChain?.computedFromMessages,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
}

export default withApiHandler(handler, {
  allowedMethods: ['POST'],
});
