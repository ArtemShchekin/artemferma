import config from '../config/index.js';
import { query } from '../db/pool.js';
import { logError, logInfo } from '../logging/index.js';
import { sendEmail } from '../utils/email.js';

let timer;
let isRunning = false;

async function fetchMaturePlots() {
  const [rows] = await query(
    `SELECT p.user_id AS userId, p.slot, p.type, p.planted_at AS plantedAt, u.email
     FROM plots p
     JOIN users u ON u.id = p.user_id
     WHERE p.harvested = 0
       AND p.type IS NOT NULL
       AND p.planted_at IS NOT NULL
       AND p.matured_notified = 0
       AND TIMESTAMPDIFF(MINUTE, p.planted_at, NOW()) >= ?`,
    [config.garden.growthMinutes]
  );

  return rows;
}

async function markAsNotified(userId, slot) {
  await query('UPDATE plots SET matured_notified = 1 WHERE user_id = ? AND slot = ?', [userId, slot]);
}

async function notifyPlot(plot) {
  const subject = 'Овощ созрел!';
  const text = `Ваш урожай "${plot.type}" на грядке #${plot.slot} готов к сбору.`;

  const delivered = await sendEmail({ to: plot.email, subject, text });
  if (!delivered) {
    return false;
  }

  await markAsNotified(plot.userId, plot.slot);
  logInfo('Maturity notification delivered', {
    event: 'garden.maturity.notified',
    userId: plot.userId,
    slot: plot.slot,
    type: plot.type
  });
  return true;
}

async function checkMaturePlots() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const plots = await fetchMaturePlots();
    for (const plot of plots) {
      try {
        await notifyPlot(plot);
      } catch (error) {
        logError('Failed to process maturity notification', {
          event: 'garden.maturity.notify_failed',
          userId: plot.userId,
          slot: plot.slot,
          error: error.message,
          stack: error.stack
        });
      }
    }
  } catch (error) {
    logError('Failed to check mature plots', {
      event: 'garden.maturity.check_failed',
      error: error.message,
      stack: error.stack
    });
  } finally {
    isRunning = false;
  }
}

function scheduleNextRun(delayMs = config.scheduler.maturityCheckIntervalMs) {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(async () => {
    await checkMaturePlots();
    scheduleNextRun();
  }, delayMs);

  timer.unref();
}

export function startMaturityNotifier() {
  if (!config.email.enabled) {
    logInfo('Email notifications disabled, maturity notifier not started', {
      event: 'garden.maturity.notifier.disabled'
    });
    return null;
  }

  if (timer) {
    return timer;
  }

  logInfo('Starting maturity notifier', {
    event: 'garden.maturity.notifier.start',
    intervalMs: config.scheduler.maturityCheckIntervalMs
  });

  scheduleNextRun(0);
  return timer;
}

export function stopMaturityNotifier() {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}
