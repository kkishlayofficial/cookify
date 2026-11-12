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
