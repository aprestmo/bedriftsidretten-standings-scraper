const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  });

  const url = 'https://kamper.bedriftsidretten.no/schedule?seasonId=201055&tournamentId=436308';

  try {
    console.log('Navigating...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Clicking "Spilt"...');
    await page.getByRole('button', { name: 'Spilt' }).click();

    console.log('Waiting for desktop match cards...');
    await page.waitForSelector('.card-desktop.clickable', { timeout: 20000 });

    const playedMatches = await page.evaluate(() => {
      const rows = document.querySelectorAll('.card-desktop.clickable');
      return Array.from(rows).map(row => {
        const cols = row.querySelectorAll('.v-col');
        return {
          date: cols[0]?.textContent.trim(),
          time: cols[1]?.textContent.trim(),
          tournament: cols[2]?.textContent.trim(),
          venue: cols[3]?.textContent.trim(),
          homeTeam: cols[4]?.textContent.trim(),
          score: cols[5]?.textContent.trim(),
          awayTeam: cols[6]?.textContent.trim()
        };
      });
    });

    const outputPath = path.join(__dirname, 'public', 'played-matches.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(playedMatches, null, 2));
    console.log('Saved played matches to', outputPath);
  } catch (err) {
    console.error('Scraping error:', err.message);
    try {
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    } catch (e) {}
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
