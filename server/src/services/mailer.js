import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx || !process.env.MAIL_FROM) {
    console.warn('[mailer] Skipping email (SMTP not configured)');
    return;
  }
  await tx.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

export async function notifyTaskAssigned({ assigneeEmail, assigneeName, taskTitle, projectTitle }) {
  if (!assigneeEmail) return;
  await sendMail({
    to: assigneeEmail,
    subject: `[PM Tool] Assigned: ${taskTitle}`,
    text: `Hi ${assigneeName},\n\nYou were assigned "${taskTitle}" in project "${projectTitle}".`,
    html: `<p>Hi ${assigneeName},</p><p>You were assigned <strong>${taskTitle}</strong> in project <strong>${projectTitle}</strong>.</p>`,
  });
}

export async function notifyDeadlineReminder({ to, name, taskTitle, dueDate }) {
  if (!to) return;
  await sendMail({
    to,
    subject: `[PM Tool] Deadline reminder: ${taskTitle}`,
    text: `Hi ${name},\n\nTask "${taskTitle}" is due on ${dueDate}.`,
    html: `<p>Hi ${name},</p><p>Task <strong>${taskTitle}</strong> is due on <strong>${dueDate}</strong>.</p>`,
  });
}

export async function sendDailySummaryEmail({ to, name, completedYesterday, pending, overdue }) {
  if (!to) return;
  await sendMail({
    to,
    subject: '[PM Tool] Your daily task summary',
    text: `Hi ${name},\n\nYesterday completed: ${completedYesterday}\nPending assigned: ${pending}\nOverdue: ${overdue}\n`,
    html: `<p>Hi ${name},</p><ul><li>Yesterday completed: <strong>${completedYesterday}</strong></li><li>Pending (assigned to you): <strong>${pending}</strong></li><li>Overdue: <strong>${overdue}</strong></li></ul>`,
  });
}
