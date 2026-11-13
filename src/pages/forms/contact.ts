import type { APIRoute } from 'astro';
import { sendEmails } from '../../lib/email';

const MIN_FILL_MS = 3000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Bot-generated random strings like "qcPmFkFdgSCNDGrZtKMZMfn": one long token
// with many lower/upper case switches.
function looksRandom(value: string): boolean {
  const v = value.trim();
  if (v.length < 10 || /\s/.test(v)) return false;
  const switches = (v.match(/[a-z][A-Z]|[A-Z][a-z]/g) || []).length;
  return switches >= 4 && switches / v.length > 0.25;
}

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
    const { name, email, message, website, lang, topic, startedAt, turnstileToken } = data ?? {};

    // Spam checks: pretend success so bots get no signal.
    const honeypotFilled = typeof website === 'string' && website.trim() !== '';
    const tooFast = typeof startedAt !== 'number' || Date.now() - startedAt < MIN_FILL_MS;
    const gibberish =
      (typeof name === 'string' && looksRandom(name)) ||
      (typeof message === 'string' && looksRandom(message));
    if (honeypotFilled || tooFast || gibberish) {
      console.log('Contact form spam dropped', { honeypotFilled, tooFast, gibberish });
      return json({ message: 'Emails sent successfully' }, 200);
    }

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
