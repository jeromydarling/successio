export function GET(req: Request): Response {
  const url = new URL(req.url);
  const loginUrl = `${url.protocol}//${url.host}/superadmin/login`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: loginUrl,
      "Set-Cookie": "sa_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
    },
  });
}
