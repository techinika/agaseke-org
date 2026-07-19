interface ResendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendViaResend(apiKey: string, params: ResendEmailParams): Promise<{ id: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ''),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error: ${res.status} ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return { id: data.id };
}
