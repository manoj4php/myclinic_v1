import nodemailer from 'nodemailer';

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.warn("Gmail credentials not set. Email notifications will be disabled.");
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private static instance: EmailService;
  
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.warn("Gmail service not configured. Skipping email:", params.subject);
      return false;
    }

    try {
      await transporter.sendMail({
        to: params.to,
        from: params.from || process.env.GMAIL_USER || 'noreply@clinic.com',
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
      });
      console.log(`Email sent successfully to ${params.to}: ${params.subject}`);
      return true;
    } catch (error) {
      console.error('Gmail SMTP email error:', error);
      return false;
    }
  }

  async sendPatientNotification(
    doctorEmail: string,
    patientName: string,
    action: 'added' | 'updated',
    viewLink: string
  ): Promise<boolean> {
    const subject = `Patient ${action === 'added' ? 'Added' : 'Updated'}: ${patientName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">My Clinic Portal Notification</h2>
        <p>Hello Doctor,</p>
        <p>Patient <strong>${patientName}</strong> has been ${action} in the clinic portal.</p>
        <p>
          <a href="${viewLink}" 
             style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Patient Details
          </a>
        </p>
        <p>Best regards,<br>My Clinic Portal Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: doctorEmail,
      from: process.env.GMAIL_USER || 'noreply@clinic.com',
      subject,
      html,
    });
  }
}

export const emailService = EmailService.getInstance();
