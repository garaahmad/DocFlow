export const emailEnabled = Boolean(
  process.env.RESEND_API_KEY && process.env.EMAIL_FROM,
);

export async function sendLink(to: string, subject: string, url: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: subject + "\n\n" + url,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Unable to deliver account email.");
}
