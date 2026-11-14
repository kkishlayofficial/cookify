import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";

let transporterPromise: Promise<Transporter> | null = null;

/**
 * Lazily creates (and caches) the SMTP transporter. If SMTP_* env vars are
 * not set, an Ethereal (https://ethereal.email) test account is created
 * automatically on first use — a real inbox that requires no signup, so
 * 2FA codes / notifications / password resets are genuinely "sent" and
 * viewable via a preview URL without needing real credentials.
 */
function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
        return nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT ?? 587,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        });
      }

      const testAccount = await nodemailer.createTestAccount();
      console.log(`[mailer] Using Ethereal test account: ${testAccount.user}`);
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    })();
  }
  return transporterPromise;
}

export async function sendMail(to: string, subject: string, text: string): Promise<{ previewUrl: string | null }> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: '"COOKify" <no-reply@cookify.dev>', to, subject, text });
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  await prisma.devMail.create({
    data: { to, subject, body: text, previewUrl: previewUrl ?? undefined },
  });

  if (previewUrl) {
    console.log(`[mailer] "${subject}" -> ${to} :: preview: ${previewUrl}`);
  }

  return { previewUrl };
}

/**
 * Same as `sendMail`, but never throws. Use this at call sites where the
 * email is a side effect of an already-successful database write (2FA
 * codes, password resets, notifications) so a flaky SMTP server can't turn
 * that successful write into a client-facing 500. The caller decides how to
 * degrade (e.g. `devMailPreviewUrl: null`, or simply not marking a
 * notification as emailed).
 */
export async function trySendMail(
  to: string,
  subject: string,
  text: string,
): Promise<{ previewUrl: string | null; delivered: boolean }> {
  try {
    const { previewUrl } = await sendMail(to, subject, text);
    return { previewUrl, delivered: true };
  } catch (err) {
    // Deliberately omit `to`/`text` (recipient address + message body) from the log.
    console.error(`[mailer] Failed to deliver email "${subject}": ${err instanceof Error ? err.message : "unknown error"}`);
    return { previewUrl: null, delivered: false };
  }
}
