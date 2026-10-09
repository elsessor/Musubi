import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

type NudgeEmailParams = {
  to: string;
  recipientName?: string;
  taskTitle: string;
  eventName?: string;
  deadline?: string;
  assigneeName?: string;
  message?: string;
  isUrgent?: boolean;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const user = env.gmailUser;
  const pass = env.gmailAppPassword;

  if (!pass) {
    console.warn("⚠️ GMAIL_APP_PASSWORD is not configured in environment variables. Email notifications will be skipped.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
}

export async function sendNudgeNotificationEmail(params: NudgeEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transport = getTransporter();
    if (!transport) {
      return { success: false, error: "GMAIL_APP_PASSWORD is missing in backend environment" };
    }

    const {
      to,
      recipientName = "Team Member",
      taskTitle,
      eventName = "Organization Event",
      deadline = "Upcoming Deadline",
      message,
      isUrgent = false
    } = params;

    const subject = isUrgent
      ? `🚨 Urgent Nudge: "${taskTitle}" is due soon!`
      : `🔔 Task Nudge: "${taskTitle}" (${eventName})`;

    const actionUrl = `${env.frontendUrl || "https://musubi-1bf94.web.app"}/dashboard/events`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background-color: #213f68; padding: 24px 32px; text-align: left; }
          .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: #94a3b8; font-size: 12px; margin: 4px 0 0 0; font-weight: 500; }
          .body { padding: 32px; }
          .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .task-card { background: #f1f5f9; border-left: 4px solid ${isUrgent ? "#ef4444" : "#3b82f6"}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
          .task-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
          .task-meta { font-size: 12px; color: #64748b; font-weight: 500; }
          .deadline-pill { display: inline-block; background: ${isUrgent ? "#fee2e2" : "#dbeafe"}; color: ${isUrgent ? "#991b1b" : "#1e40af"}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; margin-top: 8px; }
          .cta-button { display: inline-block; background-color: #213f68; color: #ffffff !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; text-align: center; }
          .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Musubi Campus Workflow</h1>
            <p>Task Reminder & Contextual Nudge</p>
          </div>
          <div class="body">
            <div class="greeting">Hello ${recipientName},</div>
            <div class="message">
              You have a nudge update regarding your assigned task in <strong>${eventName}</strong>.
              ${message ? `<p style="margin-top:8px; font-style:italic;">"${message}"</p>` : ""}
            </div>

            <div class="task-card">
              <div class="task-title">${taskTitle}</div>
              <div class="task-meta">Event: ${eventName}</div>
              <div class="deadline-pill">📅 Deadline: ${deadline}</div>
            </div>

            <div style="text-align: center; margin-top: 28px;">
              <a href="${actionUrl}" class="cta-button">View Task in Musubi</a>
            </div>
          </div>
          <div class="footer">
            Sent automatically by Musubi Workflow System via noreply.musubi@gmail.com.<br>
            Please do not reply directly to this automated email.
          </div>
        </div>
      </body>
    </html>
    `;

    const info = await transport.sendMail({
      from: `"Musubi Workflow" <${env.gmailUser}>`,
      to,
      subject,
      html: htmlContent
    });

    console.log(`✉️ Email Nudge sent successfully to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Failed to send Nudge Email:", err);
    return { success: false, error: err.message || "Email send failure" };
  }
}
