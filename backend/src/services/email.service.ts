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

    // 1. Resend HTTPS REST API (Recommended for Render, operates over HTTPS port 443)
    if (env.resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: env.resendFromEmail || "Musubi Workflow <onboarding@resend.dev>",
            to: [to],
            subject,
            html: htmlContent
          })
        });

        const resendData: any = await resendRes.json();
        if (resendRes.ok && resendData?.id) {
          console.log(`✉️ Email Nudge sent via Resend API to ${to}. Message ID: ${resendData.id}`);
          return { success: true, messageId: resendData.id };
        } else {
          const errMsg = resendData?.message || resendData?.error || "Resend API failure";
          console.warn("⚠️ Resend API error:", errMsg);
          if (!env.gmailAppPassword) {
            return { success: false, error: errMsg };
          }
        }
      } catch (resendErr: any) {
        console.warn("⚠️ Resend request error:", resendErr?.message);
        if (!env.gmailAppPassword) {
          return { success: false, error: resendErr?.message || "Resend connection error" };
        }
      }
    }

    // 2. Brevo HTTPS REST API (Operates over HTTPS port 443)
    if (env.brevoApiKey) {
      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": env.brevoApiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sender: { name: "Musubi Workflow", email: env.gmailUser || "noreply.musubi@gmail.com" },
            to: [{ email: to, name: recipientName }],
            subject,
            htmlContent
          })
        });

        const brevoData: any = await brevoRes.json();
        if (brevoRes.ok && (brevoData?.messageId || brevoData?.messageIds)) {
          console.log(`✉️ Email Nudge sent via Brevo API to ${to}. Message ID: ${brevoData.messageId}`);
          return { success: true, messageId: brevoData.messageId };
        } else {
          console.warn("⚠️ Brevo API error:", brevoData?.message || brevoData);
        }
      } catch (brevoErr: any) {
        console.warn("⚠️ Brevo request error:", brevoErr?.message);
      }
    }

    // 3. Fallback: Nodemailer SMTP
    const transport = getTransporter();
    if (!transport) {
      return {
        success: false,
        error: "No email provider configured. Please set RESEND_API_KEY (recommended for Render) or GMAIL_APP_PASSWORD in environment variables."
      };
    }

    const info = await transport.sendMail({
      from: `"Musubi Workflow" <${env.gmailUser}>`,
      to,
      subject,
      html: htmlContent
    });

    console.log(`✉️ Email Nudge sent successfully via SMTP to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Failed to send Nudge Email:", err);
    return { success: false, error: err.message || "Email send failure" };
  }
}
