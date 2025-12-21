# WordTracer Pro Edge浏览器发布与安装指南

## 一、Edge浏览器插件发布准备

### 1. 开发者账户创建
- 访问[Microsoft Edge Add-ons Developer Dashboard](https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview)
- 使用Microsoft账户登录
- 按照指引完成开发者账户注册

### 2. 必要文件准备

#### 2.1 插件包（zip格式）
- 确保所有必要文件包含在内：
  - `manifest.json`（已更新为兼容Edge）
  - `background.js`（已更新为兼容Edge）
  - `content.js`（已更新为兼容Edge）
  - `popup.html`
  - `popup.js`（已更新为兼容Edge）
  - `dashboard.html`
  - `dashboard.js`（已更新为兼容Edge）
  - `style.css`
  - `dict.json`
  - `readme.md`（可选）

#### 2.2 图标文件
- 需要以下尺寸的PNG图标：
  - 16x16像素（必填）
  - 32x32像素（必填）
  - 48x48像素（必填）
  - 128x128像素（必填）
  - 256x256像素（推荐）
  - 512x512像素（推荐）

#### 2.3 截图和预览
- 至少提供1张截图，最多8张
- 尺寸要求：
  - 宽：1280像素
  - 高：800像素
- 推荐使用PNG或JPEG格式

#### 2.4 描述信息
- 插件名称：WordTracer Pro
- 版本号：1.9
- 简短描述（最多100字符）：
  CS专业助手：支持防误选拦截、百度翻译、全文高亮与看板
- 详细描述：
  WordTracer Pro是一款专为计算机科学专业人士设计的浏览器插件，支持：
  - 一键翻译英文单词和短语
  - 全文高亮显示已翻译单词
  - 个性化快捷键设置
  - 统计看板功能，追踪学习进度
  - 本地词库支持，提高翻译效率

### 3. 发布配置检查

#### 3.1 manifest.json检查
```json
{
  "manifest_version": 3,
  "name": "WordTracer Pro",
  "version": "1.9",
  "description": "CS专业助手：支持防误选拦截、百度翻译、全文高亮与看板",
  "permissions": ["storage"],
  "host_permissions": [
    "https://*.youdao.com/",
    "https://fanyi.baidu.com/",
    "https://api.mymemory.translated.net/",
    "https://fanyi.qq.com/"
  ],
  "browser_specific_settings": {
    "edge": {
      "browser_action_next_to_addressbar": true
    }
  },
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["style.css"]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["dict.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## 二、发布流程

1. 登录Edge Add-ons Developer Dashboard
2. 点击「上传新扩展」
3. 选择打包好的插件zip文件
4. 填写发布信息：
   - 插件名称
   - 版本号
   - 描述
   - 分类
   - 标签
5. 上传图标和截图
6. 配置权限说明
7. 选择发布区域
8. 提交审核

## 三、审核注意事项

- 审核时间通常为1-5个工作日
- 确保插件符合Edge插件商店的政策
- 避免使用侵权内容
- 提供清晰的权限说明

## 四、用户安装指南

### 1. 从Microsoft Edge Add-ons商店安装
1. 打开Microsoft Edge浏览器
2. 访问[Edge Add-ons商店](https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home)
3. 搜索"WordTracer Pro"
4. 点击「获取」按钮
5. 确认安装

### 2. 手动安装（开发者模式）
1. 下载插件文件
2. 解压到本地文件夹
3. 打开Edge浏览器扩展管理页面
4. 开启开发者模式
5. 点击「加载解压缩的扩展」
6. 选择解压后的文件夹

## 五、更新流程

1. 更新插件代码
2. 增加版本号
3. 重新打包插件
4. 登录Developer Dashboard
5. 上传新版本
6. 提交审核
7. 审核通过后自动更新

## 六、常见问题解决

### 1. 插件无法安装
- 检查manifest.json是否符合规范
- 确保所有必要文件都已包含
- 检查文件权限

### 2. 插件功能异常
- 检查控制台是否有错误信息
- 验证API调用是否正常
- 检查权限设置是否正确

### 3. 审核失败
- 仔细阅读失败原因
- 按照要求修改插件
- 重新提交审核

## 七、联系方式

如有任何问题或建议，请通过以下方式联系：
- 邮箱：[your-email@example.com]
- GitHub：[your-github-repo-url]