const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://www.profixio.com/app/bedriftsfotball-trondheim-2026/category/1180700';
const SELECTOR = '[x-ref="puljetabell"] table tbody tr';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to Profixio...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector(SELECTOR, { timeout: 15000 });

    // Extract raw cell data to verify column structure
    const rawRows = await page.evaluate((sel) => {
      const rows = document.querySelectorAll(sel);
      return Array.from(rows).map(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        return cells.map(c => c.innerText.trim());
      });
    }, SELECTOR);

    // Log raw data for debugging column mapping
    rawRows.forEach((row, i) => {
      console.log(`Row ${i} (${row.length} cols):`, row);
    });

    // Map to structured format
    // Expected columns: [position, team, M, W, D, L, G+/-, Gdiff, P]
    const standings = rawRows.map(cols => {
      const goalsText = cols[6] || '0 - 0';
      const [goalsScored = '0', goalsConceded = '0'] = goalsText.split('-').map(s => s.trim());

      return {
        position: cols[0] || '',
        team: cols[1] || '',
        matches: cols[2] || '0',
        wins: cols[3] || '0',
        draws: cols[4] || '0',
        losses: cols[5] || '0',
        goalsScored,
        goalsConceded,
        points: cols[8] || '0',
      };
    });

    const outputPath = path.join(__dirname, 'public', 'standings.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(standings, null, 2));

    console.log(`\nSaved ${standings.length} teams to ${outputPath}`);
  } catch (err) {
    console.error('Scraping error:', err.message);
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
