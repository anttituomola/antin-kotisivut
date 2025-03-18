import type { APIRoute } from 'astro';
import { sendEmails } from '../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, message } = data;

    // Basic validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }), 
        { status: 400 }
      );
    }

    const result = await sendEmails({ name, email, message });

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