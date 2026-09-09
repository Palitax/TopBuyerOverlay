document.addEventListener('DOMContentLoaded', async () => {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const btnTest = document.getElementById('btn-test-purchase');
  const btnAdmin = document.getElementById('btn-open-admin');
  const btnOverlay = document.getElementById('btn-open-overlay');

  // Check relay server status
  async function checkRelayStatus() {
    try {
      const res = await fetch('http://localhost:8080/health', { method: 'GET' });
      if (res.ok) {
        dot.className = 'dot connected';
        text.textContent = 'Verbunden (8080)';
        text.style.color = '#10b981';
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      dot.className = 'dot';
      text.textContent = 'Offline (Server starten)';
      text.style.color = '#f43f5e';
    }
  }

  checkRelayStatus();
  setInterval(checkRelayStatus, 3000);

  // Send simulated test purchase directly to relay server
  btnTest.addEventListener('click', async () => {
    try {
      const randomNames = ['ArcaneBuyer', 'ManaHunter', 'LegendCollector', 'ShinyHunter', 'MysticVault'];
      const randomUser = randomNames[Math.floor(Math.random() * randomNames.length)];

      const res = await fetch('http://localhost:8080/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: randomUser,
          itemTitle: 'Extension Test Kauf',
          price: '$35.00',
          quantity: 1
        })
      });

      if (res.ok) {
        btnTest.textContent = '✅ Event gesendet!';
        setTimeout(() => {
          btnTest.textContent = '⚡ Test-Kauf simulieren';
        }, 1500);
      }
    } catch (err) {
      alert('Relay Server unter http://localhost:8080 nicht erreichbar! Bitte "npm run dev" starten.');
    }
  });

  // Open Admin Deck
  btnAdmin.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/#admin' });
  });

  // Open Overlay
  btnOverlay.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });
});
