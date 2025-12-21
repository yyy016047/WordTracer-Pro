// 浏览器兼容性处理
const browser = window.chrome || window.browser;

document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('list');

  browser.storage.local.get({ history: {} }, (data) => {
    const history = data.history;
    const sortedWords = Object.keys(history).sort((a, b) => history[b].count - history[a].count);

    if (sortedWords.length === 0) {
      listContainer.innerHTML = '<p style="color:#999">暂无记录，快去划词查词吧！</p>';
      return;
    }

    sortedWords.forEach(word => {
      const item = document.createElement('div');
      item.className = 'word-item';
      item.innerHTML = `
        <span class="word"><strong>${word}</strong></span>
        <span class="count">${history[word].count} 次</span>
        <div style="font-size:10px; color:#999">${history[word].lastTime}</div>
      `;
      listContainer.appendChild(item);
    });
  });
});