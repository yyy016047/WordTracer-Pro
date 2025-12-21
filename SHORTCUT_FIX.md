# 快捷键功能修复说明

## 问题描述
在Edge浏览器中，鼠标选中文本后按下快捷键无反应的问题。

## 问题原因
1. 插件使用了自定义的键盘事件监听（document.addEventListener('keyup')），这种方式在Edge浏览器的安全策略下可能被限制。
2. 插件没有使用浏览器扩展标准的commands API来定义快捷键，导致在Edge中可能无法正常触发。

## 修复方案
1. 在`manifest.json`中添加了标准的`commands`配置，定义了浏览器级别的快捷键。
2. 在`background.js`中添加了`commands.onCommand`监听器，处理快捷键事件。
3. 在`content.js`中扩展了消息处理逻辑，支持从background脚本接收翻译触发命令。

## 具体修改

### 1. manifest.json
添加了commands字段，定义了默认快捷键：
```json
"commands": {
  "translate-selection": {
    "suggested_key": {
      "default": "Ctrl+Shift+Q",
      "mac": "Command+Shift+Q"
    },
    "description": "翻译选中文本"
  }
}
```

### 2. background.js
添加了commands监听器：
```javascript
// 监听快捷键命令
browser.commands.onCommand.addListener((command) => {
  if (command === "translate-selection") {
    // 获取当前激活的标签页
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // 向当前标签页发送消息，触发翻译功能
        browser.tabs.sendMessage(tabs[0].id, { type: "TRIGGER_TRANSLATE" });
      }
    });
  }
});
```

### 3. content.js
扩展了消息监听器，添加了TRIGGER_TRANSLATE消息处理：
```javascript
} else if (message.type === "TRIGGER_TRANSLATE") {
  // 模拟用户按下快捷键的行为
  const selObj = window.getSelection();
  let selection = selObj.toString().trim().replace(/\s+/g, ' ');
  if (!selection) return;

  // 句子判定：单词数超过 6 个则不计入统计（防止脏数据）
  const wordCount = selection.split(/\s+/).length;
  const shouldRecord = wordCount <= 6; 

  showPopup(selection, "正在翻译...");
  
  // 发送消息到背景脚本并处理响应...
```

## 测试方法

1. **重新加载插件**：
   - 在Edge浏览器中打开扩展管理页面（edge://extensions/）
   - 启用开发者模式
   - 点击"加载已解压的扩展"，选择插件文件夹
   - 如果插件已加载，点击"重新加载"按钮

2. **测试快捷键功能**：
   - 打开任意网页（例如百度或Wikipedia）
   - 选中一段英文文本
   - 按下快捷键 `Ctrl+Shift+Q`（Windows/Linux）或 `Command+Shift+Q`（Mac）
   - 预期效果：显示翻译弹窗，包含选中内容的翻译结果

3. **测试自定义快捷键**：
   - 在Edge浏览器中打开扩展管理页面
   - 点击插件的"详细信息"按钮
   - 找到"键盘快捷键"部分
   - 可以自定义插件的快捷键
   - 测试自定义的快捷键是否正常工作

## 注意事项

1. 插件同时支持两种快捷键模式：
   - 浏览器标准快捷键：`Ctrl+Shift+Q`（可自定义）
   - 网页内快捷键：`Q`键（可在设置页面修改）

2. 如果快捷键仍然无法工作，可能需要：
   - 检查浏览器的隐私设置是否阻止了插件的脚本执行
   - 检查是否有其他扩展使用了相同的快捷键
   - 尝试在不同的网页上测试

3. 在某些安全限制较高的网站（例如银行、政府网站），浏览器可能会限制扩展的功能，包括快捷键触发。

## 预期效果
修复后，在Edge浏览器中选中文本并按下快捷键，应该能够正常显示翻译弹窗，提供选中内容的翻译结果。