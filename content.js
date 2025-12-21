/**
 * WordTracer Pro - 注入脚本 V2.1
 * 注释：管理 Q 键触发、翻译展示、全文高亮
 */
// 浏览器兼容性处理
const browser = window.chrome || window.browser;

 let localDict = {};
 let isHighlightEnabled = false;
 let hidePopupTimeout;
 let highlightedWords = []; // 存储所有高亮的单词
 let shortcutKey = 'q'; // 默认快捷键为q
 
 // 预加载本地词库
(async () => {
  try {
    const url = browser.runtime.getURL('dict.json');
    const res = await fetch(url);
    const data = await res.json();
    for (let key in data) localDict[key.toLowerCase()] = data[key];
    
    // 添加内置的localTranslations词库
    const builtinLocalDict = {
      'is': 'v. 是；存在；是的；成为',
      'time': 'n. 时间；时刻；时代；次',
      'youth': 'n. 青春；青年；年轻人；初期',
      'hello': 'int. 你好；喂；您好；嘿',
      'world': 'n. 世界；地球；天下；世间',
      'computer': 'n. 计算机；电脑；电子计算机',
      'science': 'n. 科学；理科；自然科学；科学研究',
      'technology': 'n. 技术；科技；工艺；技术应用',
      'programming': 'n. 编程；程序设计；编程工作；程序编制',
      'language': 'n. 语言；语言文字；言语；说话',
      'chaining': 'n. 链接；链锁；编链；挂链',
      'pipeline': 'n. 管道；输油管道；渠道，传递途径；流水线',
      'prompt': 'n. 提示；提示符；激励；督促；提示词',
      'prompt chaining': 'n. 提示链；提示链接；提示串联',
      'pipeline architecture': 'n. 流水线架构；管线架构',
      'chain': 'n. 链；链条；连锁；一系列；v. 用链条拴住；连接',
      'chain reaction': 'n. 连锁反应；链式反应',
      'data structure': 'n. 数据结构；数据构造',
      'algorithm': 'n. 算法；运算法则',
      'data chaining': 'n. 数据链接；数据链锁',
      'memory pipeline': 'n. 内存流水线；存储流水线',
      'api chaining': 'n. API链接；API串联',
      'function chaining': 'n. 函数链式调用；方法链',
      'prompt engineering': 'n. 提示工程；提示设计',
      'zero-shot learning': 'n. 零样本学习；无监督学习',
      'few-shot learning': 'n. 少样本学习；小样本学习',
      'machine learning': 'n. 机器学习；机械学习',
      'artificial intelligence': 'n. 人工智能；AI',
      'prompt chain': 'n. 提示链；提示链接',
      'sentence': 'n. 句子；语句；命题；宣判',
      'phrase': 'n. 短语；词组；措辞；乐句',
      'translation': 'n. 翻译；译文；转变；转化',
      'english': 'n. 英语；英国人；英格兰人；adj. 英语的；英国的；英格兰的',
      'chinese': 'n. 中文；汉语；中国人；adj. 中国的；中国人的；中文的',
      'program': 'n. 程序；计划；方案；节目；v. 为…编写程序；制定计划',
      'code': 'n. 代码；编码；密码；准则；v. 编码；给…编号；为…编码'
    };
    
    // 合并到本地词库
    for (let key in builtinLocalDict) {
      // 只添加dict.json中没有的单词
      if (!localDict[key.toLowerCase()]) {
        localDict[key.toLowerCase()] = builtinLocalDict[key];
      }
    }
  } catch (error) {
    console.error("加载本地词库失败:", error.message);
  }
})();

// 加载最新的快捷键设置
function loadShortcutKey() {
  browser.storage.local.get({ dashboardSettings: { shortcutKey: 'q' } }, (data) => {
    shortcutKey = data.dashboardSettings.shortcutKey || 'q';
    console.log("已加载快捷键:", shortcutKey);
  });
}

// 页面加载时获取最新快捷键
loadShortcutKey();
 
// 翻译选中文本的核心函数
function translateSelection() {
  const selObj = window.getSelection();
  let selection = selObj.toString().trim().replace(/\s+/g, ' ');
  if (!selection) return;

  // 句子判定：单词数超过 6 个则不计入统计（防止脏数据）
  const wordCount = selection.split(/\s+/).length;
  const shouldRecord = wordCount <= 6; 

  showPopup(selection, "正在翻译...");

  // 发送消息到背景脚本
  browser.runtime.sendMessage({ type: "FETCH_DICT", word: selection }, (response) => {
    // 检查是否有错误发生
    if (browser.runtime.lastError) {
      console.error("与背景脚本通信失败:", browser.runtime.lastError.message);
      renderFinalPopup(selection, "<div style='color:#ff6b6b'>翻译服务暂时不可用，请重试</div>", 0, false, "");
      return;
    }
    
    // 确保response存在且有必要的属性
    const trans = response?.translation || "翻译暂不可用";
    
    const wordKey = selection.toLowerCase().replace(/\s+/g, ' ');
    let csPart = localDict[wordKey] ? `<div class="cs-tag">[Local Dict] ${localDict[wordKey]}</div>` : "";
    const finalHtml = `${csPart}<div class="trans-body">${trans}</div>`;
    
    // 确定音标显示：单词数大于1则不显示音标，所有单个单词都显示音标
    let phonetic = "";
    if (wordCount <= 1) {
      // 对于本地词库单词，确保显示正确的音标
      phonetic = response?.phonetic || "[No Phonetic]";
      // 防止音标被错误地设置为[Local Dict]
      if (phonetic === "[Local Dict]") {
        phonetic = response?.phonetic || "[No Phonetic]";
      }
    }

    // 存储逻辑
    if (shouldRecord) {
      browser.storage.local.get({ history: {} }, (data) => {
        let history = data.history;
        // 使用标准化的键名（小写+空格处理）
        const wordKey = selection.toLowerCase().replace(/\s+/g, ' ');
        let old = history[wordKey] || {};
        
        // 确保所有必要属性都存在
        const newEntry = {
          count: (old.count || 0) + 1,
          translation: finalHtml,
          phonetic: phonetic,
          lastTime: new Date().toLocaleString(),
          // 存储原始选择文本用于显示
          originalWord: selection
        };
        
        history[wordKey] = newEntry;
        browser.storage.local.set({ history }, () => {
          renderFinalPopup(selection, finalHtml, newEntry.count, shouldRecord, phonetic);
        });
      });
    } else {
      renderFinalPopup(selection, finalHtml, 0, shouldRecord, phonetic);
    }
  });
}

// 监听键盘事件（网页内快捷键：Q键）
document.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() === shortcutKey) {
    translateSelection();
  }
});

// 监听来自dashboard的消息和background的命令
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SHORTCUT_KEY") {
    shortcutKey = message.key.toLowerCase() || 'q';
    console.log("快捷键已更新为:", shortcutKey);
  } else if (message.type === "TRIGGER_TRANSLATE") {
    // 调用翻译函数
    translateSelection();
  }
});
 
 function renderFinalPopup(word, html, count, recorded, phonetic) {
   // 重置高亮状态为未选中
   isHighlightEnabled = false;
   const statsHtml = recorded ? `<div class="footer-stats">查询次数: ${count} <label style="margin-left:8px"><input type="checkbox" id="wt-highlighter" ${highlightedWords.includes(word) ? 'checked' : ''}> 高亮</label></div>` : "<div class='footer-stats'>长句不计入统计</div>";
   showPopup(word, html + statsHtml, phonetic);
   
   const toggle = document.getElementById('wt-highlighter');
   if (toggle) {
     toggle.onchange = (e) => {
       isHighlightEnabled = e.target.checked;
       if (isHighlightEnabled) applyHighlight(word);
       else removeHighlight(word);
     };
   }
 }
 
 function showPopup(word, bodyHtml, phonetic = "") {
  let display = document.getElementById('word-tracer-popup');
  if (!display) {
    display = document.createElement('div');
    display.id = 'word-tracer-popup';
    document.body.appendChild(display);
  }

  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  display.style.left = `${rect.left + window.scrollX}px`;
  display.style.top = `${rect.top + window.scrollY - 130}px`;
  display.style.display = 'block';

  // 完整显示标题，不截断
  const displayTitle = word;
  
  // 音标信息：只显示音标，不显示[Local Dict]
    const phoneticHtml = phonetic ? `<span class="phonetic"> ${phonetic}</span>` : "";

    display.innerHTML = `
      <div class="header">
        <span><strong class="title">${displayTitle}</strong>${phoneticHtml}</span>
        <button class="speak-btn" id="wt-voice">🔊</button>
      </div>
      <div style="max-height:200px; overflow-y:auto; white-space: pre-wrap; word-break: break-word;">${bodyHtml}</div>
    `;

  document.getElementById('wt-voice').onclick = () => {
    const msg = new SpeechSynthesisUtterance(word);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
  };

  // 实现鼠标离开翻译界面合理时间后才关闭窗口的功能
  display.onmouseenter = () => {
    clearTimeout(hidePopupTimeout); // 鼠标进入时，清除自动关闭定时器
  };

  display.onmouseleave = () => {
    // 鼠标离开时，设置自动关闭定时器
    hidePopupTimeout = setTimeout(() => {
      display.style.display = 'none';
    }, 500); // 0.5秒后自动关闭，提供合理的阅读时间
  };
}

 function hidePopup() {
   const display = document.getElementById('word-tracer-popup');
   if (display) {
     display.style.display = 'none';
   }
 }
 
 // 高亮逻辑（保持之前的代码逻辑不变）
 function applyHighlight(word) {
  // 如果单词已经在高亮列表中，不重复添加
  if (!highlightedWords.includes(word)) {
    highlightedWords.push(word);
  }
  
  // 先移除所有现有高亮，然后重新应用所有高亮单词
  removeAllHighlights();
  
  // 对每个高亮单词应用高亮
  highlightedWords.forEach(highlightWord => {
    // 改进正则表达式，使用更宽松的边界匹配，确保能匹配所有实例
    const escapedWord = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
    
    // 获取所有文本节点
    const allTextNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    
    while (node = walker.nextNode()) {
      // 排除脚本、样式和弹窗内的文本
      if (!['SCRIPT', 'STYLE'].includes(node.parentElement.tagName) && node.parentElement.id !== 'word-tracer-popup') {
        allTextNodes.push(node);
      }
    }
    
    // 处理每个文本节点
    allTextNodes.forEach(node => {
      const text = node.textContent;
      let lastIndex = 0;
      let newContent = '';
      
      // 找到所有匹配项并替换
      let match;
      while ((match = regex.exec(text)) !== null) {
        // 添加匹配前的文本
        newContent += text.slice(lastIndex, match.index);
        
        // 添加匹配的单词，包含前后的空格/边界
        newContent += `<mark class="wt-highlight">${match[1]}</mark>`;
        
        lastIndex = regex.lastIndex;
        
        // 防止无限循环
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
      
      // 添加剩余文本
      newContent += text.slice(lastIndex);
      
      // 如果内容有变化，替换节点
      if (newContent !== text) {
        const span = document.createElement('span');
        span.innerHTML = newContent;
        node.replaceWith(span);
      }
    });
  });
}
// 移除单个单词的高亮
function removeHighlight(word) {
  // 从高亮列表中移除该单词
  highlightedWords = highlightedWords.filter(w => w !== word);
  
  // 重新应用所有高亮
  removeAllHighlights();
  highlightedWords.forEach(w => applyHighlight(w));
}

// 移除所有高亮
function removeAllHighlights() { 
  document.querySelectorAll('.wt-highlight').forEach(el => el.replaceWith(document.createTextNode(el.textContent)));
}

// 保留原来的函数名作为别名，确保兼容性
function removeHighlights() { removeAllHighlights(); }