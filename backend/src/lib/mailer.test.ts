import nodemailer from "nodemailer";
import { sendMail, trySendMail } from "@/lib/mailer";

jest.mock("nodemailer");

const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

/**
 * Simulates an unreachable/misconfigured SMTP server to prove email delivery
 * failures degrade gracefully (trySendMail) instead of propagating and
 * turning an already-successful business write into a client-facing 500.
 */
describe("email failure isolation", () => {
  beforeEach(() => {
    mockedNodemailer.createTestAccount.mockResolvedValue({
      user: "ethereal-user",
      pass: "ethereal-pass",
      smtp: { host: "smtp.ethereal.email", port: 587, secure: false },
    } as Awaited<ReturnType<typeof nodemailer.createTestAccount>>);
    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockRejectedValue(new Error("SMTP connection refused")),
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
  });

  it("trySendMail swallows the failure and reports delivered:false", async () => {
    const result = await trySendMail("user@example.com", "Test subject", "Test body");
    expect(result).toEqual({ previewUrl: null, delivered: false });
  });

  it("sendMail itself still throws (trySendMail is the opt-in safe wrapper around it)", async () => {
    await expect(sendMail("user@example.com", "Test subject", "Test body")).rejects.toThrow(
      "SMTP connection refused",
    );
  });
});
