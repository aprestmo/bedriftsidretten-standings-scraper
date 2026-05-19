const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://www.profixio.com/app/bedriftsfotball-trondheim-2026/category/1180700?segment=historikk';
const CARD_SELECTOR = 'li[wire\\:key^="listkamp_"]';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to Profixio historikk...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for first batch of match cards to appear
    console.log('Waiting for match cards...');
    await page.waitForSelector(CARD_SELECTOR, { timeout: 20000 });

    // Scroll down repeatedly to trigger lazy loading of all matches
    console.log('Scrolling to load all matches...');
    let previousCount = 0;
    let stableRounds = 0;
    while (stableRounds < 3) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      const currentCount = await page.locator(CARD_SELECTOR).count();
      if (currentCount === previousCount) {
        stableRounds++;
      } else {
        stableRounds = 0;
        previousCount = currentCount;
      }
      console.log(`  Loaded ${currentCount} cards...`);
    }

    // Extract match results from all cards
    const results = await page.evaluate((sel) => {
      const cards = document.querySelectorAll(sel);
      return Array.from(cards).map(card => {
        const lines = card.innerText.split('\n').map(l => l.trim()).filter(Boolean);

        // Structure: [matchId, dayOfWeek, date, time, homeTeam, awayTeam, homeScore|"Ferdig", awayScore?]
        const matchId = lines[0] || '';
        const date = lines[2] || '';       // e.g. "18. mai"
        const time = lines[3] || '';       // e.g. "21:00"
        const homeTeam = lines[4] || '';
        const awayTeam = lines[5] || '';

        let homeScore = null;
        let awayScore = null;
        let walkover = false;

        if (lines[6] === 'Ferdig') {
          walkover = true;
        } else if (lines.length >= 8) {
          homeScore = parseInt(lines[6], 10);
          awayScore = parseInt(lines[7], 10);
          if (isNaN(homeScore)) homeScore = null;
          if (isNaN(awayScore)) awayScore = null;
        }

        return { matchId, date, time, homeTeam, awayTeam, homeScore, awayScore, walkover };
      });
    }, CARD_SELECTOR);

    // Filter to only matches with a result (score or walkover)
    const playedMatches = results.filter(m =>
      (m.homeScore !== null && m.awayScore !== null) || m.walkover
    );

    console.log(`\nExtracted ${playedMatches.length} played matches out of ${results.length} total cards`);
    if (playedMatches.length > 0) {
      console.log('First:', JSON.stringify(playedMatches[0]));
      console.log('Last:', JSON.stringify(playedMatches[playedMatches.length - 1]));
    }

    const outputPath = path.join(__dirname, 'public', 'results.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(playedMatches, null, 2));

    console.log(`\nSaved ${playedMatches.length} results to ${outputPath}`);
  } catch (err) {
    console.error('Scraping error:', err.message);
    await page.screenshot({ path: 'debug-results-screenshot.png', fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
