import type { APIRoute } from 'astro';
import { sendEmails } from '../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, message, website, lang, topic } = data;

    // Honeypot: bots fill the hidden field; pretend success
    if (website) {
      return new Response(
        JSON.stringify({ message: 'Emails sent successfully' }),
        { status: 200 }
      );
    }

    // Basic validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }), 
        { status: 400 }
      );
    }

    const result = await sendEmails({
      name,
      email,
      message,
      lang: lang === 'fi' ? 'fi' : 'en',
      topic: typeof topic === 'string' ? topic.slice(0, 60) : undefined,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }), 
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Emails sent successfully' }), 
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500 }
    );
  }
}