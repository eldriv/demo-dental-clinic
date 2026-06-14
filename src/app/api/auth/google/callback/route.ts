import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<html><body><h1>Authorization Failed</h1><p>${error}</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      "<html><body><h1>Missing authorization code</h1></body></html>",
      { headers: { "Content-Type": "text/html" }, status: 400 }
    );
  }

  const result = await exchangeCodeForTokens(code);

  if (result.error) {
    return new NextResponse(
      `<html><body><h1>Token Exchange Failed</h1><p>${result.error}</p></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }

  const html = `
    <html>
      <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1>Google Calendar Connected</h1>
        <p>Copy the refresh token below and add it to your environment variables as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
        <pre style="background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; word-break: break-all;">${result.refreshToken ?? "No refresh token received. Try revoking app access and re-authorizing."}</pre>
        <p style="color: #666; font-size: 14px;">You can close this window.</p>
      </body>
    </html>
  `;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
