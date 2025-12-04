import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';

let transporter;

function buildTransportOptions() {
  const authMissing = !config.email.user || !config.email.password;
  const secure = config.email.secure ?? config.email.port === 465;
  const baseOptions = {
    host: config.email.host,
    port: config.email.port,
    secure
  };

  if (!authMissing) {
    baseOptions.auth = {
      user: config.email.user,
      pass: config.email.password
    };
  }

  return baseOptions;
}

function getTransporter() {
  if (!config.email.enabled) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport(buildTransportOptions());
  return transporter;
}

export async function sendEmail({ to, subject, text }) {
  if (!config.email.enabled) {
    logInfo('Email delivery disabled, skipping send', {
      event: 'email.skip_disabled',
      to,
      subject
    });
    return false;
  }

  const mailer = getTransporter();
  if (!mailer) {
    logError('Email transport is not configured', {
      event: 'email.transport_missing',
      to,
      subject
    });
    return false;
  }

  try {
    await mailer.sendMail({
      from: config.email.from,
      to,
      subject,
      text
    });

    logInfo('Email sent', {
      event: 'email.sent',
      to,
      subject
    });
    return true;
  } catch (error) {
    logError('Failed to send email', {
      event: 'email.error',
      to,
      subject,
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}
