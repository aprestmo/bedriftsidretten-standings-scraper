const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const url = 'https://kamper.bedriftsidretten.no/standings?seasonId=201055&tournamentId=436308';
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('table');

  const standings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(row => {
      const cols = row.querySelectorAll('td');
      return {
        position: cols[0]?.innerText.trim(),
        team: cols[1]?.innerText.trim(),
        matches: cols[2]?.innerText.trim(),
        wins: cols[3]?.innerText.trim(),
        draws: cols[4]?.innerText.trim(),
        losses: cols[5]?.innerText.trim(),
        goals: cols[6]?.innerText.trim(),
        goalDifference: cols[7]?.innerText.trim(),
        points: cols[8]?.innerText.trim()
      };
    });
  });

  const outputPath = path.join(__dirname, 'public', 'standings.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(standings, null, 2));
  await browser.close();
})();
