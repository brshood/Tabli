/**
 * Decrypt a backup file created by backupService.ts.
 *
 * Usage:
 *   npx tsx scripts/decryptBackup.ts <path-to-backup.enc.json> [output.json]
 *
 * Requires BACKUP_ENCRYPTION_KEY in env (same value used when creating backups).
 *
 * Example:
 *   set BACKUP_ENCRYPTION_KEY=your-secret && npx tsx scripts/decryptBackup.ts backups/db-backup-2026-04-07T12-00-00-000Z.enc.json restored.json
 */

import crypto from 'crypto';
import fs from 'fs';

function normalizeKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  const b64 = Buffer.from(trimmed, 'base64');
  if (b64.length === 32) return b64;
  return crypto.createHash('sha256').update(trimmed).digest();
}

function main() {
  const [, , inPath, outPath] = process.argv;
  const rawKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (!inPath || !rawKey) {
    console.error(
      'Usage: npx tsx scripts/decryptBackup.ts <backup.enc.json> [out.json]\n' +
        'Set BACKUP_ENCRYPTION_KEY (same value as when backups were created).'
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(inPath, 'utf8');
  const envelope = JSON.parse(raw) as { iv: string; authTag: string; payload: string };
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const ciphertext = Buffer.from(envelope.payload, 'base64');

  const key = normalizeKey(rawKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const json = plain.toString('utf8');

  if (outPath) {
    fs.writeFileSync(outPath, json, 'utf8');
    console.error(`Wrote decrypted JSON to ${outPath}`);
  } else {
    process.stdout.write(json);
  }
}

main();
