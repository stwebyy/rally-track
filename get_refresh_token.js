// get_refresh_token.js
// 実行方法: YT_CLIENT_ID=... YT_CLIENT_SECRET=... node get_refresh_token.js
import http from 'http';
import { URL } from 'url';

// dynamic import for googleapis to avoid esm/cjs pitfalls
const { google } = await import('googleapis');

(async () => {

  const CLIENT_ID = process.env.YT_CLIENT_ID;
  const CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
  const PORT = 3000;
  const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Set YT_CLIENT_ID and YT_CLIENT_SECRET in env before running.');
    console.error('bash example: YT_CLIENT_ID=xxx YT_CLIENT_SECRET=yyy node get_refresh_token.js');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // refresh token を確実に得るため
    prompt: 'consent',       // 再度同意を強制して refresh token を確実に取る
    scope: SCOPES
  });

  console.log('1) Open the following URL in your browser (or Ctrl+click):\n');
  console.log(authUrl);
  console.log('\n2) After consenting, Google will redirect to:');
  console.log(REDIRECT_URI);
  console.log('This local server will catch the code and exchange it for tokens.\n');

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (reqUrl.pathname !== '/oauth2callback') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Ready. Please open the auth URL shown in terminal.');
        return;
      }

      const code = reqUrl.searchParams.get('code');
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing code in callback.');
        return;
      }

      // exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      // tokens: { access_token, refresh_token, scope, expiry_date, ... }
      console.log('\n=== TOKENS ===\n', tokens, '\n=== END TOKENS ===\n');

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK — tokens received. Check your terminal for the refresh_token. You can close this tab.');

      // show reminder
      if (!tokens.refresh_token) {
        console.warn('\n⚠️  refresh_token not returned. (This can happen if the account already granted consent earlier.)');
        console.warn('If missing, re-run with prompt: consent and ensure you signed in with the intended Google account.');
      } else {
        console.log('Copy the refresh_token and store it securely (Vercel env / secret manager).');
      }
    } catch (err) {
      console.error('Error exchanging code:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error exchanging code. See terminal.');
    } finally {
      // close server after short delay so browser finishes
      setTimeout(() => server.close(), 1000);
    }
  });

  server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT} - waiting for the OAuth callback...`);
  });
})();
