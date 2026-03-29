import { query } from '../db/pool.js';
import { logError, logInfo } from '../logging/index.js';
import { sendEmail } from '../utils/email.js';

export async function markMaturityNotified(userId, slot) {
  await query('UPDATE plots SET matured_notified = 1 WHERE user_id = ? AND slot = ?', [userId, slot]);
}

export async function sendMaturityEmail({ userId, slot, type, email, requestId }) {
  const subject = 'На огород колхозник, твой огород дал плоды';
  const text = `Ваш урожай "${type}" на грядке #${slot} готов к сбору.`;

  const delivered = await sendEmail({ to: email, subject, text });
  if (!delivered) {
    logError('Failed to deliver maturity email', {
      event: 'garden.maturity.email_failed',
      userId,
      slot,
      type,
      requestId
    });
    return false;
  }

  await markMaturityNotified(userId, slot);
  logInfo('Maturity notification delivered', {
    event: 'garden.maturity.notified',
    userId,
    slot,
    type,
    requestId
  });
  return true;
}
