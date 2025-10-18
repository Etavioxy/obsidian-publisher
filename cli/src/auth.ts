import readline from 'readline';

export async function promptForCredentials(serverUrl: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const question = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

  const username = (await question('Username: ')).trim();
  const password = (await question('Password: ')).trim();
  rl.close();

  if (!username || !password) {
    throw new Error('Aborted login: username and password are required');
  }

  let base = serverUrl;
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = `http://${base}`;
  }

  const loginUrl = `${base.replace(/\/$/, '')}/auth/login`;

  console.log(`🔐 Attempting to authenticate... (url: ${loginUrl})`);

  let loginRes: Response;
  try {
    loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  } catch (err: any) {
    const cause = err?.cause;
    if (cause && cause.code === 'ECONNREFUSED') {
      throw new Error(`Failed to connect to ${loginUrl} (connection refused). Is the server running and reachable?`);
    }
    throw new Error(`Failed to connect to ${loginUrl}: ${err?.message ?? String(err)}`);
  }

  if (!loginRes.ok) {
    const txt = await loginRes.text();
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}\n${txt}`);
  }

  const loginJson = await loginRes.json();
  if (!loginJson || !loginJson.token) {
    // include response body for debugging if possible
    const text = JSON.stringify(loginJson);
    throw new Error(`Login response did not contain a token. Response: ${text}`);
  }

  return loginJson.token;
}