import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

type NudgeEmailParams = {
  to: string;
  recipientName?: string;
  recipientKind?: "assignee" | "leader";
  taskTitle: string;
  eventName?: string;
  deadline?: string;
  assigneeName?: string;
  message?: string;
  isUrgent?: boolean;
  nudgeType?: "3_days_prior" | "1_day_prior" | string;
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
      recipientKind = "assignee",
      assigneeName,
      taskTitle,
      eventName = "Organization Event",
      deadline = "Upcoming Deadline",
      message,
      isUrgent = false,
      nudgeType
    } = params;

    const reminderLabel = nudgeType === "overdue" ? "Overdue"
      : nudgeType === "due_today" ? "Due today"
      : nudgeType === "1_day_prior" ? "Due tomorrow"
      : nudgeType === "3_days_prior" || nudgeType === "approaching" ? "Approaching deadline"
      : "Task reminder";
    const subject = `${recipientKind === "leader" ? "Leader alert · " : ""}${reminderLabel}: "${taskTitle}" (${eventName})`;
    const introduction = recipientKind === "leader"
      ? `An organization task ${assigneeName && assigneeName !== "Unassigned" ? `assigned to <strong>${assigneeName}</strong>` : "with no assignee"} needs your attention in <strong>${eventName}</strong>.`
      : `You have a nudge update regarding your assigned task in <strong>${eventName}</strong>.`;
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
              ${introduction}
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

    const verifiedSenderEmail = env.gmailUser || "larryagad1@gmail.com";

    // 1. Brevo HTTPS REST API (Primary engine, operates over HTTPS port 443)
    if (env.brevoApiKey) {
      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": env.brevoApiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sender: { name: "Musubi Workflow", email: verifiedSenderEmail },
            to: [{ email: to, name: recipientName }],
            subject,
            htmlContent
          })
        });

        const brevoData: any = await brevoRes.json();
        if (brevoRes.ok && (brevoData?.messageId || brevoData?.messageIds)) {
          console.log(`✉️ Email sent via Brevo API to ${to}. Message ID: ${brevoData.messageId}`);
          return { success: true, messageId: brevoData.messageId };
        } else {
          console.warn("⚠️ Brevo API error:", brevoData?.message || brevoData);
        }
      } catch (brevoErr: any) {
        console.warn("⚠️ Brevo request error:", brevoErr?.message);
      }
    }

    // 2. Resend HTTPS REST API (Secondary fallback)
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
          console.log(`✉️ Email sent via Resend API to ${to}. Message ID: ${resendData.id}`);
          return { success: true, messageId: resendData.id };
        } else {
          const errMsg = resendData?.message || resendData?.error || "Resend API failure";
          console.warn("⚠️ Resend API error:", errMsg);
        }
      } catch (resendErr: any) {
        console.warn("⚠️ Resend request error:", resendErr?.message);
      }
    }

    // 3. Fallback: Nodemailer SMTP
    const transport = getTransporter();
    if (!transport) {
      return {
        success: false,
        error: "No email provider succeeded. Please check BREVO_API_KEY and verified sender settings."
      };
    }

    const info = await transport.sendMail({
      from: `"Musubi Workflow" <${verifiedSenderEmail}>`,
      to,
      subject,
      html: htmlContent
    });

    console.log(`✉️ Email sent successfully via SMTP to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Failed to send Nudge Email:", err);
    return { success: false, error: err.message || "Email send failure" };
  }
}

/**
 * Dispatches notification emails when an event is published with atomized tasks.
 * Sends confirmation to creator and assignment alerts to members.
 */
export async function sendEventPublishedNotificationEmail(params: {
  creatorEmail: string;
  creatorName: string;
  eventTitle: string;
  startDate: string;
  endDate: string;
  tasks: Array<{
    title: string;
    dueDate?: string;
    deadline?: string;
    priority?: string;
    assignedMemberName?: string;
    assignedMemberEmail?: string;
  }>;
}) {
  const tasksListHtml = params.tasks
    .map(
      (t) =>
        `<li style="margin-bottom: 8px;"><strong>${t.title}</strong> — Due: ${
          t.dueDate || t.deadline || "Upcoming"
        } | Assignee: ${t.assignedMemberName || "Unassigned"} (${t.priority || "Medium"})</li>`
    )
    .join("");

  const creatorHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; border-radius: 6px; background-color: #eff6ff; color: #2563eb; }
        h1 { font-size: 20px; font-weight: 800; margin: 12px 0 16px; color: #0f172a; }
        .meta { background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
        ul { padding-left: 20px; font-size: 13px; line-height: 1.6; color: #334155; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Event Published</span>
        <h1>🎉 "${params.eventTitle}" is now Live!</h1>
        <div class="meta">
          <strong>Duration:</strong> ${params.startDate} to ${params.endDate}<br>
          <strong>Total Subtasks:</strong> ${params.tasks.length} actionable items
        </div>
        <p style="font-size: 14px; color: #475569;">The tasks breakdown for your event has been published to your campus workflow:</p>
        <ul>${tasksListHtml}</ul>
        <a href="https://musubi-1bf94.web.app/dashboard/events" class="button">View Event in Musubi</a>
      </div>
    </body>
  </html>
  `;

  // 1. Send confirmation email to creator
  if (params.creatorEmail) {
    await sendNudgeNotificationEmail({
      to: params.creatorEmail,
      recipientName: params.creatorName,
      taskTitle: params.eventTitle,
      eventName: params.eventTitle,
      deadline: params.endDate,
      message: `Event Published: "${params.eventTitle}" with ${params.tasks.length} subtasks.`,
      isUrgent: false,
      nudgeType: "event_published"
    }).catch((err) => console.warn("[Email Publish] Creator notification warning:", err));
  }

  // 2. Send assignment notification to each assigned member
  for (const task of params.tasks) {
    if (task.assignedMemberEmail && task.assignedMemberEmail !== params.creatorEmail) {
      await sendNudgeNotificationEmail({
        to: task.assignedMemberEmail,
        recipientName: task.assignedMemberName || "Team Member",
        taskTitle: task.title,
        eventName: params.eventTitle,
        deadline: task.dueDate || task.deadline || params.endDate,
        message: `You have been assigned to "${task.title}" for the event "${params.eventTitle}". Please check your Musubi dashboard for details.`,
        isUrgent: task.priority === "High" || task.priority === "Critical",
        nudgeType: "task_assigned"
      }).catch((err) => console.warn(`[Email Publish] Task assign notice failed for ${task.assignedMemberEmail}:`, err));
    }
  }
}

