/**
 * WordTracer Pro - 统计看板 V2.1
 * 功能：
 * 1. 清空历史记录
 * 2. 翻页功能
 * 3. 设置功能
 * 4. 统计数据展示
 * 5. 表格数据的动态加载和过滤
 */

// 浏览器兼容性处理
const browser = window.chrome || window.browser;

// 全局变量
let historyData = {};
let sortedWords = [];
let currentPage = 1;
let pageSize = 10;
let showPhonetic = true;
let showTranslation = true;
let shortcutKey = 'q';
// 排序相关变量
let sortBy = 'lastTime'; // lastTime 或 count
let sortOrder = 'desc'; // asc 或 desc

// DOM元素
const elements = {
  tableBody: document.getElementById('tableBody'),
  clearHistoryBtn: document.getElementById('clearHistory'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  pageSizeSlider: document.getElementById('pageSize'),
  pageSizeValue: document.getElementById('pageSizeValue'),
  showPhoneticCheckbox: document.getElementById('showPhonetic'),
  showTranslationCheckbox: document.getElementById('showTranslation'),
  shortcutKeyInput: document.getElementById('shortcutKey'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  settingsFeedback: document.getElementById('settingsFeedback'),
  pagination: document.getElementById('pagination'),
  totalWords: document.getElementById('totalWords'),
  totalQueries: document.getElementById('totalQueries'),
  avgQueries: document.getElementById('avgQueries'),
  countHeader: document.querySelector('th:nth-child(5)') // 查询次数表头
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadHistoryData();
  bindEvents();
});

// 加载历史数据
function loadHistoryData() {
  browser.storage.local.get({ history: {} }, (data) => {
    historyData = data.history;
    
    // 清理历史数据，确保所有条目都有必要的属性
    Object.keys(historyData).forEach(key => {
      const entry = historyData[key];
      if (!entry) {
        delete historyData[key];
        return;
      }
      
      // 确保所有必要属性都存在
      if (entry.count === undefined) entry.count = 0;
      if (entry.translation === undefined) entry.translation = "翻译暂不可用";
      if (entry.phonetic === undefined) entry.phonetic = "[No Phonetic]";
      if (entry.lastTime === undefined) entry.lastTime = new Date().toLocaleString();
      if (entry.originalWord === undefined) entry.originalWord = key;
    });
    
    // 重新保存清理后的数据
    browser.storage.local.set({ history: historyData }, () => {
      // 根据当前排序方式进行排序
        sortedWords = Object.keys(historyData).sort((a, b) => {
          if (sortBy === 'lastTime') {
            const timeA = new Date(historyData[a]?.lastTime || 0).getTime();
            const timeB = new Date(historyData[b]?.lastTime || 0).getTime();
            return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
          } else if (sortBy === 'count') {
            const countA = historyData[a]?.count || 0;
            const countB = historyData[b]?.count || 0;
            return sortOrder === 'asc' ? countA - countB : countB - countA;
          }
          return 0;
        });
        
      updateStatistics();
      renderTable();
      renderPagination();
    });
  });
}

// 更新统计数据
function updateStatistics() {
  const totalWords = sortedWords.length;
  const totalQueries = Object.values(historyData).reduce((sum, item) => sum + item.count, 0);
  const avgQueries = totalWords > 0 ? (totalQueries / totalWords).toFixed(1) : 0;
  
  elements.totalWords.textContent = totalWords;
  elements.totalQueries.textContent = totalQueries;
  elements.avgQueries.textContent = avgQueries;
}

// 渲染表格
function renderTable() {
  const tbody = elements.tableBody;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentWords = sortedWords.slice(startIndex, endIndex);
  
  if (currentWords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-state-icon">📚</div>
          <div>暂无词汇记录</div>
          <div style="font-size:13px; margin-top:8px;">开始学习，让我们一起积累词汇吧！</div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = currentWords.map((word, index) => {
    const item = historyData[word];
    // 使用存储的原始单词文本，如果不存在则使用键名
    const displayWord = item.originalWord || word;
    // 计算序列号
    const serialNumber = startIndex + index + 1;
    return `
      <tr>
        <td>${serialNumber}</td>
        <td class="word-cell">${displayWord}</td>
        <td class="phonetic-cell">${showPhonetic ? (item.phonetic || '') : ''}</td>
        <td class="trans-cell">${showTranslation ? item.translation : '翻译已隐藏'}</td>
        <td><span class="count-badge">${item.count || 0}</span></td>
        <td class="time-cell">${item.lastTime}</td>
      </tr>
    `;
  }).join('');
  
  // 更新统计信息
  updateStatistics();
}

// 渲染分页控件
function renderPagination() {
  const totalPages = Math.ceil(sortedWords.length / pageSize);
  const pagination = elements.pagination;
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = `
    <button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">上一页</button>
  `;
  
  // 显示当前页附近的页码
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (startPage > 2) {
      html += `<span style="padding:0 8px; color:#80868b;">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span style="padding:0 8px; color:#80868b;">...</span>`;
    }
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }
  
  html += `
    <button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">下一页</button>
  `;
  
  pagination.innerHTML = html;
  
  // 添加事件委托
  pagination.addEventListener('click', (e) => {
    if (e.target.classList.contains('page-btn') && !e.target.disabled) {
      const page = parseInt(e.target.getAttribute('data-page'));
      goToPage(page);
    }
  });
}

// 跳转到指定页码
function goToPage(page) {
  const totalPages = Math.ceil(sortedWords.length / pageSize);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderTable();
  renderPagination();
}

// 清空历史记录
function clearHistory() {
  if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
    browser.storage.local.set({ history: {} }, () => {
      historyData = {};
      sortedWords = [];
      currentPage = 1;
      
      updateStatistics();
      renderTable();
      renderPagination();
      
      alert('历史记录已清空！');
    });
  }
}

// 切换设置面板
function toggleSettings() {
  elements.settingsPanel.classList.toggle('active');
}

// 保存设置
function saveSettings() {
  browser.storage.local.set({
    dashboardSettings: {
      pageSize,
      showPhonetic,
      showTranslation,
      shortcutKey
    }
  }, () => {
    // 发送消息给内容脚本更新快捷键
    // 只向非dashboard页面发送消息，避免连接错误
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && !tabs[0].url.endsWith('dashboard.html')) {
        try {
          browser.tabs.sendMessage(tabs[0].id, { 
            type: "UPDATE_SHORTCUT_KEY", 
            key: shortcutKey 
          });
        } catch (error) {
          // 忽略发送失败错误
          console.log("无法向当前标签页发送消息（可能不是网页）:", error.message);
        }
      }
    });
  });
}

// 加载设置
function loadSettings() {
  browser.storage.local.get({
    dashboardSettings: {
      pageSize: 10,
      showPhonetic: true,
      showTranslation: true,
      shortcutKey: 'q'
    }
  }, (data) => {
    const settings = data.dashboardSettings;
    
    pageSize = settings.pageSize;
    showPhonetic = settings.showPhonetic;
    showTranslation = settings.showTranslation;
    shortcutKey = settings.shortcutKey;
    
    // 更新UI
    elements.pageSizeSlider.value = pageSize;
    elements.pageSizeValue.textContent = pageSize;
    elements.showPhoneticCheckbox.checked = showPhonetic;
    elements.showTranslationCheckbox.checked = showTranslation;
    elements.shortcutKeyInput.value = shortcutKey;
  });
}

// 更新排序指示器
function updateSortIndicator() {
  // 移除所有表头的排序指示器
  document.querySelectorAll('th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    // 移除之前添加的箭头
    th.innerHTML = th.innerHTML.replace(/\s*(↑|↓)$/, '');
  });
  
  // 在当前排序的表头上添加指示器
  if (sortBy === 'count') {
    const arrow = sortOrder === 'asc' ? ' ↑' : ' ↓';
    elements.countHeader.innerHTML += arrow;
    elements.countHeader.classList.add(sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
  }
}

// 按查询次数排序
function sortByCount() {
  if (sortBy === 'count') {
    // 如果已经是按查询次数排序，则切换排序顺序
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    // 如果不是按查询次数排序，则切换到按查询次数排序，并默认降序
    sortBy = 'count';
    sortOrder = 'desc';
  }
  
  currentPage = 1; // 重置到第一页
  
  // 重新排序并渲染
  sortedWords = Object.keys(historyData).sort((a, b) => {
    const countA = historyData[a]?.count || 0;
    const countB = historyData[b]?.count || 0;
    return sortOrder === 'asc' ? countA - countB : countB - countA;
  });
  
  updateSortIndicator();
  renderTable();
  renderPagination();
}

// 标签页切换
function switchTab(tabName) {
  // 更新标签按钮状态
  elements.tabBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
  
  // 更新标签内容显示
  elements.tabContents.forEach(content => {
    content.classList.remove('active');
    if (content.id === tabName) {
      content.classList.add('active');
    }
  });
}

// 绑定事件
function bindEvents() {
  // 清空历史记录
  elements.clearHistoryBtn.addEventListener('click', clearHistory);
  
  // 标签页切换
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });
  
  // 每页显示条数 - 实时预览，但不保存
  elements.pageSizeSlider.addEventListener('input', (e) => {
    const newSize = parseInt(e.target.value);
    elements.pageSizeValue.textContent = newSize;
    // 不立即保存，只更新UI预览
  });
  
  // 显示音标 - 实时预览，但不保存
  elements.showPhoneticCheckbox.addEventListener('change', (e) => {
    // 不立即保存，只更新UI预览
  });
  
  // 显示翻译 - 实时预览，但不保存
  elements.showTranslationCheckbox.addEventListener('change', (e) => {
    // 不立即保存，只更新UI预览
  });
  
  // 快捷键设置 - 实时验证格式，但不保存
  elements.shortcutKeyInput.addEventListener('input', (e) => {
    // 只允许单个字母键
    let value = e.target.value.toLowerCase().replace(/[^a-z]/g, '').substring(0, 1);
    e.target.value = value;
    // 不立即保存，只更新UI预览
  });
  
  // 确认保存设置
  elements.saveSettingsBtn.addEventListener('click', () => {
    // 从UI获取最新设置
    const newPageSize = parseInt(elements.pageSizeSlider.value);
    const newShowPhonetic = elements.showPhoneticCheckbox.checked;
    const newShowTranslation = elements.showTranslationCheckbox.checked;
    const newShortcutKey = elements.shortcutKeyInput.value.toLowerCase() || 'q';
    
    // 更新全局变量
    pageSize = newPageSize;
    showPhonetic = newShowPhonetic;
    showTranslation = newShowTranslation;
    shortcutKey = newShortcutKey;
    
    // 保存到本地存储
    saveSettings();
    
    // 重置到第一页
    currentPage = 1;
    
    // 重新渲染表格和分页
    renderTable();
    renderPagination();
    
    // 显示保存成功提示
    elements.settingsFeedback.style.display = 'block';
    setTimeout(() => {
      elements.settingsFeedback.style.display = 'none';
    }, 2000);
  });
  
  // 查询次数表头点击事件（排序功能）
  elements.countHeader.addEventListener('click', () => {
    sortByCount();
  });
}

// 暴露全局函数供分页使用
window.goToPage = goToPage;