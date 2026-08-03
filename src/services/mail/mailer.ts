import nodemailer, { Transporter } from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

let transporter: Transporter | null = null;

function buildTransporter(): Transporter {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    throw new Error("SMTP_HOST and SMTP_PORT must be configured");
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured");
  }

  const isGmail = process.env.SMTP_HOST === "smtp.gmail.com";

  return nodemailer.createTransport({
    ...(isGmail
      ? { service: "gmail" }
      : {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
        }),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = buildTransporter();
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.SMTP_FROM || !process.env.APP_NAME) {
    throw new Error("SMTP_FROM / APP_NAME must be configured");
  }

  try {
    await getTransporter().sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // If transporter failed due to closed connection/socket error, reset cached transporter for next attempt
    transporter = null;
    throw err;
  }
}