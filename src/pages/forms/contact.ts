import type { APIRoute } from 'astro';
import { sendEmails } from '../../lib/email';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Cloudflare Turnstile is enforced only once TURNSTILE_SECRET_KEY is set.
async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set('remoteip', remoteip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.json();
    const { name, email, message, lang, topic, turnstileToken } = data ?? {};

    // Basic validation
    if (
      typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' ||
      !name.trim() || !email.trim() || !message.trim()
    ) {
      return json({ error: 'All fields are required' }, 400);
    }
    if (
      name.length > 200 || email.length > 320 || message.length > 5000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return json({ error: 'Invalid input' }, 400);
    }

    const turnstileOk = await verifyTurnstile(
      typeof turnstileToken === 'string' ? turnstileToken : '',
      clientAddress,
    );
    if (!turnstileOk) {
      return json({ error: 'Verification failed. Please reload the page and try again.' }, 403);
    }

    const result = await sendEmails({
      name,
      email,
      message,
      lang: lang === 'fi' ? 'fi' : 'en',
      topic: typeof topic === 'string' ? topic.slice(0, 60) : undefined,
    });

    if (!result.success) {
      return json({ error: result.error }, 500);
    }

    return json({ message: 'Emails sent successfully' }, 200);
  } catch (error) {
    return json({ error: 'Internal server error' }, 500);
  }
};
