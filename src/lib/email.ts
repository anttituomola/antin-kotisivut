import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: import.meta.env.AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Check if required environment variables are available
const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "ADMIN_EMAIL",
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !import.meta.env[envVar]
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  throw new Error("Missing required environment variables");
}

interface EmailData {
  name: string;
  email: string;
  message: string;
  lang?: "en" | "fi";
  topic?: string;
}

export async function sendEmails({
  name,
  email,
  message,
  lang = "en",
  topic,
}: EmailData) {
  // The auto-reply goes to an address typed into a public form, so it must not
  // contain any user-supplied text (name/message); otherwise the form could be
  // abused to relay spam through our SES account.
  const confirmation =
    lang === "fi"
      ? {
          subject: "Kiitos viestistäsi",
          body: `Hei,\n\nKiitos viestistäsi. Sain sen, ja palaan asiaan pian.\n\nTerveisin\nAntti`,
        }
      : {
          subject: "Thank you for your message",
          body: `Hi,\n\nThank you for your message. I got it and will get back to you soon.\n\nBest regards,\nAntti`,
        };

  // Send confirmation email to the sender
  const confirmationEmail = new SendEmailCommand({
    Source: import.meta.env.ADMIN_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: confirmation.subject,
      },
      Body: {
        Text: {
          Data: confirmation.body,
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
        Data: topic
          ? `[${topic}] New contact form submission from ${name}`
          : `New contact form submission from ${name}`,
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
    console.error("Error sending emails:", error);
    return { success: false, error: "Failed to send emails" };
  }
}
