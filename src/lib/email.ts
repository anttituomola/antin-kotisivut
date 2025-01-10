import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: import.meta.env.AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY,
  },
});

interface EmailData {
  name: string;
  email: string;
  message: string;
}

export async function sendEmails({ name, email, message }: EmailData) {
  // Send confirmation email to the sender
  const confirmationEmail = new SendEmailCommand({
    Source: import.meta.env.ADMIN_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Thank you for your message",
      },
      Body: {
        Text: {
          Data: `Hi ${name},\n\nThank you for your message. Here's a copy of what you sent:\n\n${message}\n\nI'll get back to you soon!\n\nBest regards,\nAntti`,
        },
      },
    },
  });

  // Send notification email to admin
  const notificationEmail = new SendEmailCommand({
    Source: import.meta.env.ADMIN_EMAIL,
    Destination: {
      ToAddresses: [import.meta.env.ADMIN_EMAIL],
    },
    ReplyToAddresses: [email],
    Message: {
      Subject: {
        Data: `New contact form submission from ${name}`,
      },
      Body: {
        Text: {
          Data: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        },
      },
    },
  });

  try {
    await Promise.all([
      sesClient.send(confirmationEmail),
      sesClient.send(notificationEmail),
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error sending emails:', error);
    return { success: false, error: 'Failed to send emails' };
  }
}