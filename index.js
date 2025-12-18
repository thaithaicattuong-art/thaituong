
const { chromium } = require("playwright");
const fs = require("fs");

const URL = "https://bruce.camphaven.xyz/";  // Link of the chat site
const INTERVAL_MS = 15000; // 15s
const MAX_Q = 500;  // Maximum 500 questions

// Read questions from questions.txt
let questions = fs.readFileSync("questions.txt", "utf8")
  .split('\n').map(s => s.trim()).filter(Boolean).slice(0, MAX_Q);

for (let i = questions.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [questions[i], questions[j]] = [questions[j], questions[i]];
}

(async () => {
  // Connect to Chrome with remote debugging
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const contexts = browser.contexts();
  const context = contexts.length ? contexts[0] : await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  // Navigate to the URL if not already there
  if (!page.url().startsWith("https://bruce.camphaven.xyz/")) {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
  }

  // Wait for the chat input to be visible
  await page.waitForSelector('textarea, [placeholder*="Ask Bruce" i], [contenteditable="true"]', { state: "visible" });

  const input = page.locator('textarea[placeholder*="Ask Bruce" i], textarea, [contenteditable="true"]').first();

  // Loop through questions and send them
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`Asking ${i + 1}/${questions.length}: ${q}`);
    await input.fill(q);
    await page.keyboard.press("Enter");

    // Try clicking the send button if Enter doesn't send the message
    try {
      await page.locator('button[aria-label*="send" i], button:has(svg)').first().click({ timeout: 800 });
    } catch {}

    await page.waitForTimeout(INTERVAL_MS);

    // Handle Cloudflare captcha if needed
    const captchaVisible = await page.locator('iframe[title*="Cloudflare"]').first().isVisible().catch(() => false);
    if (captchaVisible) {
      console.log("⚠️ Cloudflare requires verification. Please tick and the tool will wait...");
      await page.waitForSelector('textarea, [placeholder*="Ask Bruce" i], [contenteditable="true"]', { state: "visible", timeout: 0 });
    }
  }

  console.log("🎉 Done with 500 questions!");
})();
