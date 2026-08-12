#!/usr/bin/env node
//
// Print a Rail Data Marketplace access token, by logging in as you would.
//
// RDM has no machine credential. Its portal client requires an interactive
// authorization code flow, and the token endpoint refuses anything else:
//
//   {"error":"invalid_client",
//    "error_description":"Unsupported Client Authentication Method!"}
//
// So this drives the login page and takes the token the site gives itself. It
// is a browser automation against somebody else's HTML and it *will* break when
// they redesign - the errors below are written to say that plainly rather than
// time out on a selector.
//
// **This does not work yet.** It logs in nowhere: the landing page renders no
// login link this finds and no form - `input` count is zero after the click -
// so it never reaches a password field. What is known:
//
//   - the identity server is login.raildata.org.uk, from the `iss` claim on a
//     real token, so the authorize endpoint is /oauth2/authorize there
//   - the SPA's client id is IIo28mF3HzPmLGm_vZIMhmAI964a, from `azp`
//   - navigating straight to the authorize URL with that client id is the next
//     thing to try, rather than hunting for a link on the marketing page
//
// The token lasts an hour, which is enough for a run. Pipe it into the
// downloader rather than storing it:
//
//   RDM_TOKEN=$(data/rdm-token.mjs) data/rdm-download.sh P-... DSP-... NLC
//
// Credentials come from the environment, never an argument, so they stay out of
// shell history and the process list. Source .env.local first.
import {chromium} from "playwright";

const username = process.env.RDM_USERNAME;
const password = process.env.RDM_PASSWORD;

if (!username || !password) {
  fail("RDM_USERNAME and RDM_PASSWORD are needed. They are your raildata.org.uk login; source .env.local.");
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// The token arrives on the site's own XHRs rather than anywhere in the DOM, so
// it is read off the wire. Watching requests also means not caring which of
// them happens to fire first after login.
let token;

page.on("request", request => {
  const authorization = request.headers()["authorization"];

  if (!token && authorization?.startsWith("Bearer ") && request.url().includes("raildata.org.uk")) {
    const candidate = authorization.slice("Bearer ".length);

    // The app makes authorised calls before it has a token, sending the literal
    // string `null`. Taking the first Bearer header therefore yields "null"
    // and exits successfully, which is worse than failing. Only a JWT counts.
    if (isJwt(candidate)) {
      token = candidate;
    }
  }
});

function isJwt(value) {
  const parts = value.split(".");

  return parts.length === 3 && parts.every(part => part.length > 8);
}

try {
  await page.goto("https://raildata.org.uk/", {waitUntil: "domcontentloaded", timeout: 60_000});

  // The landing page sends you to login.raildata.org.uk, which is the WSO2
  // identity server rather than the marketplace, so both hosts are in play.
  await page.getByRole("link", {name: /log ?in|sign ?in/i}).first().click({timeout: 30_000})
    .catch(() => page.goto("https://raildata.org.uk/login", {waitUntil: "domcontentloaded"}));

  await page.waitForURL(/login\.raildata\.org\.uk/, {timeout: 60_000})
    .catch(() => fail("Never reached the login host. RDM's sign-in flow has probably changed."));

  await page.locator("input[name='username'], input#usernameUserInput, input#username").first()
    .fill(username, {timeout: 30_000});
  await page.locator("input[name='password'], input#password").first().fill(password);
  await page.locator("button[type='submit'], input[type='submit']").first().click();

  // Back on the marketplace with a session. Waiting for the token rather than
  // for a page: the redirect can settle before the first authorised call.
  await page.waitForURL(/raildata\.org\.uk\/(?!.*login)/, {timeout: 60_000})
    .catch(() => fail("Login did not complete. Wrong credentials, or the account needs a second factor, which this cannot do."));

  for (let waited = 0; !token && waited < 30_000; waited += 500) {
    await page.waitForTimeout(500);
  }

  if (!token) {
    // Logged in but nothing authorised fired. Visiting the dashboard forces one.
    await page.goto("https://raildata.org.uk/dashboard", {waitUntil: "networkidle", timeout: 60_000});
  }

  if (!token) {
    fail("Logged in but saw no Bearer token. RDM may have moved to a different scheme.");
  }

  process.stdout.write(token + "\n");
}
finally {
  await browser.close();
}

function fail(message) {
  process.stderr.write(message + "\n");
  process.exit(1);
}
