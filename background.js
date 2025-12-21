/**
 * WordTracer Pro - 后台脚本 V2.1
 * 注释：管理插件后台逻辑，包括字典查询、API请求、数据存储等
 */

// 浏览器兼容性处理
const browser = chrome || browser;

// MD5加密函数，用于百度翻译API签名生成
function md5(message) {
  // 在service worker环境中直接使用crypto对象
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  return crypto.subtle.digest('MD5', data).then(hash => {
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex;
  });
}

// SHA256加密函数，用于生成有道翻译API签名
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成UUID函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 添加超时处理的fetch函数
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 本地翻译词库（支持短语和句子）
const localTranslations = {
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

// 从dict.json加载的专业术语词库
let dictJsonTranslations = {};

// 预加载dict.json
(async () => {
  try {
    const url = browser.runtime.getURL('dict.json');
    const res = await fetchWithTimeout(url, {}, 3000);
    const data = await res.json();
    dictJsonTranslations = data;
    console.log('已加载dict.json专业术语词库:', dictJsonTranslations);
  } catch (error) {
    console.error('加载dict.json失败:', error.message);
  }
})();

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

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_DICT") {
    const word = request.word.trim();
    const wordCount = word.split(/\s+/).length;
    const isSingleWord = wordCount === 1;
    const isPhrase = wordCount > 1 && wordCount <= 6;

    const fetchData = async () => {
      try {
        // 支持单词、词组和句子的翻译
        // 对于单词，尝试获取音标信息；对于词组和句子，不显示音标

        // 使用有道智云官方API（需要应用ID和应用密钥）
        // 用户需要在有道智云控制台注册并获取这些信息
        const appKey = ''; // 请在有道智云控制台获取应用ID
        const appSecret = ''; // 请在有道智云控制台获取应用密钥

        // 如果没有提供应用ID和应用密钥，或者是词组/句子，使用备用API
        if (!appKey || !appSecret || !isSingleWord) {
          console.log('未配置有道智云应用ID和应用密钥，或者是词组/句子，使用备用API');
          return await fetch备用API(word);
        }

        // 生成签名参数
        const salt = generateUUID();
        const curtime = Math.floor(Date.now() / 1000);
        
        // 根据官方文档计算input参数
        let input = word;
        if (word.length > 20) {
          input = word.substr(0, 10) + word.length + word.substr(word.length - 10);
        }
        
        // 生成签名
        const signStr = appKey + input + salt + curtime + appSecret;
        const sign = await sha256(signStr);

        // 构建请求参数
        const params = new URLSearchParams();
        params.append('q', word);
        params.append('from', 'en');
        params.append('to', 'zh-CHS');
        params.append('appKey', appKey);
        params.append('salt', salt);
        params.append('sign', sign);
        params.append('signType', 'v3');
        params.append('curtime', curtime.toString());

        // 发送API请求
        const res = await fetch('https://openapi.youdao.com/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });

        if (!res.ok) {
          console.error('有道智云API响应错误:', res.status, res.statusText);
          throw new Error(`API请求失败: ${res.status}`);
        }

        const data = await res.json();
        console.log('有道智云API响应:', data);

        // 处理API响应
        if (data.errorCode === '0') {
          // 提取翻译和音标
          const translation = data.translation.join('\n');
          let phonetic = "[No Phonetic]";
          
          // 尝试从basic字段提取音标
          if (data.basic) {
            if (data.basic['uk-phonetic']) phonetic = `[/${data.basic['uk-phonetic']}/]`;
            else if (data.basic['us-phonetic']) phonetic = `[/${data.basic['us-phonetic']}/]`;
            else if (data.basic.phonetic) phonetic = `[/${data.basic.phonetic}/]`;
            // 增加对不同字段格式的支持
            else if (data.basic.ukphone) phonetic = `[/${data.basic.ukphone}/]`;
            else if (data.basic.usphone) phonetic = `[/${data.basic.usphone}/]`;
            else if (data.basic.phone) phonetic = `[/${data.basic.phone}/]`;
          }

          return {
            success: true,
            translation: translation,
            phonetic: phonetic
          };
        } else {
          console.error('有道智云API错误:', data.errorCode, data.errorMsg);
          throw new Error(`API错误: ${data.errorCode} - ${data.errorMsg}`);
        }
      } catch (e) {
        console.error('翻译处理失败:', e);
        
        // 如果官方API失败，尝试使用备用API
        return await fetch备用API(word);
      }
    };

    // 备用API函数
async function fetch备用API(word) {
  try {
    const encodedWord = encodeURIComponent(word);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // 简化翻译逻辑，统一处理单词、短语和句子
    let translation = null;
    let phonetic = isSingleWord ? "[No Phonetic]" : (isPhrase ? "[Phrase]" : "[Sentence]");
    
    // 1. 首先检查本地词库
    const lowerWord = word.toLowerCase();
    // 同时检查localTranslations和dictJsonTranslations
    const isLocalWord = localTranslations[lowerWord] || dictJsonTranslations[lowerWord];
    if (isLocalWord) {
      // 对于本地词库单词，使用本地翻译，同时仍然尝试获取音标
      translation = localTranslations[lowerWord] || dictJsonTranslations[lowerWord];
      // 确保音标初始值不是[Local Dict]，而是一个合理的默认值
      if (phonetic === "[Local Dict]") phonetic = "[No Phonetic]";
    }
    
    // 2. 对于单个单词，尝试获取详细信息和音标
    if (isSingleWord) {
      try {
        const res = await fetchWithTimeout(`https://dict.youdao.com/jsonapi?q=${encodedWord}&dicts=%7B%22ec%22%3A%5B%22ec%22%5D%2C%22web%22%3A%5B%22web%22%5D%7D`, { 
          headers, 
          mode: 'cors'
        }, 3000);
        
        if (res.ok) {
          // 检查响应内容类型
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            
            // 提取翻译和音标
            if (data.ec && data.ec.word && data.ec.word.length > 0) {
              const wordData = data.ec.word[0];
              
              // 提取音标信息
              if (wordData.ukphone) phonetic = `[/${wordData.ukphone}/]`;
              else if (wordData.usphone) phonetic = `[/${wordData.usphone}/]`;
              else if (wordData.phone) phonetic = `[/${wordData.phone}/]`;
              else if (wordData.trs && wordData.trs[0] && wordData.trs[0].phone) phonetic = `[/${wordData.trs[0].phone}/]`;
              
              // 如果本地词库存在该单词，保留本地词库的翻译，只使用API获取的音标
              if (isLocalWord) {
                // 继续执行，不返回，使用本地词库的翻译
              } else {
                // 提取翻译
                let explains = "";
                if (wordData.explains && wordData.explains.length > 0) {
                  explains = wordData.explains.join('\n');
                } else if (wordData.trs) {
                  for (let i = 0; i < wordData.trs.length; i++) {
                    if (wordData.trs[i].tr && wordData.trs[i].tr.length > 0) {
                      const tr = wordData.trs[i].tr[0];
                      if (tr.l && tr.l.i) {
                        explains += tr.l.i + '\n';
                      }
                    }
                  }
                } else if (data.web && data.web.length > 0) {
                  explains = data.web.map(item => item.value.join(', ')).join('\n');
                }
                
                if (explains) {
                  translation = explains.trim();
                }
              }
            }
          } else {
            console.warn('有道词典API返回非JSON响应，跳过音标获取');
            // 如果不是JSON响应，可能是HTML页面，直接跳过
          }
        }
      } catch (e) {
        console.error('有道词典API调用失败:', e);
        // 继续尝试其他翻译方法
      }
    }

    // 3. 尝试使用有道翻译API（主要翻译服务）- 仅当不是本地词库单词时使用
    if (!isLocalWord) {
      try {
        const translateRes = await fetchWithTimeout(`https://fanyi.youdao.com/translate?&doctype=json&type=AUTO&i=${encodedWord}`, {
          headers,
          mode: 'cors'
        }, 3000);

        if (translateRes.ok) {
          // 检查响应内容类型
          const contentType = translateRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const translateData = await translateRes.json();
            
            if (translateData.translateResult && translateData.translateResult[0] && translateData.translateResult[0][0]) {
              translation = translateData.translateResult[0][0].tgt;
            }
          } else {
            console.warn('有道翻译API返回非JSON响应，跳过该翻译服务');
            // 如果不是JSON响应，可能是HTML页面，直接跳过
          }
        }
      } catch (e) {
        console.error('有道翻译API调用失败:', e);
      }
    }
    
    // 4. 如果有道翻译失败，尝试使用百度翻译API（支持长句）
    if (!translation) {
      try {
        const baiduRes = await fetchWithTimeout(`https://fanyi.baidu.com/v2transapi?from=en&to=zh&query=${encodedWord}`, {
          headers,
          mode: 'cors'
        }, 4000);
        
        if (baiduRes.ok) {
          // 检查响应内容类型
          const contentType = baiduRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const baiduData = await baiduRes.json();
            
            if (baiduData.trans_result && baiduData.trans_result.data && baiduData.trans_result.data.length > 0) {
              translation = baiduData.trans_result.data[0].dst;
            }
          } else {
            console.warn('百度翻译API返回非JSON响应，尝试网页解析方式');
            
            // 直接尝试百度翻译的网页解析方式
            try {
              const baiduWebRes = await fetchWithTimeout(`https://fanyi.baidu.com/translate?ie=utf-8&f=auto&t=auto&wd=${encodedWord}`, {
                headers,
                mode: 'cors'
              }, 4000);
              
              if (baiduWebRes.ok) {
                const baiduWebData = await baiduWebRes.text();
                const match = baiduWebData.match(/<div class="trans-content">([\s\S]*?)<\/div>/);
                if (match && match[1]) {
                  translation = match[1].trim().replace(/<[^>]*>/g, '');
                }
              }
            } catch (e2) {
              console.error('百度翻译网页解析失败:', e2);
            }
          }
        }
      } catch (e) {
        console.error('百度翻译API调用失败:', e);
      }
    }
    
    // 5. 尝试另一个备用翻译服务（确保长句翻译）
    if (!translation) {
      try {
        // 使用微软翻译API作为替代，提供更稳定的服务
        const microsoftRes = await fetchWithTimeout(`https://api.mymemory.translated.net/get?q=${encodedWord}&langpair=en|zh`, {
          headers,
          mode: 'cors'
        }, 5000);
        
        if (microsoftRes.ok) {
          // 检查响应内容类型
          const contentType = microsoftRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const microsoftData = await microsoftRes.json();
            if (microsoftData.responseData && microsoftData.responseData.translatedText) {
              translation = microsoftData.responseData.translatedText;
            }
          } else {
            console.warn('微软翻译API返回非JSON响应，跳过该翻译服务');
          }
        }
      } catch (e) {
        console.error('微软翻译API调用失败:', e);
        
        // 如果微软翻译也失败，尝试使用本地简单翻译作为最后的备选
        try {
          const simpleTransRes = await fetchWithTimeout(`https://fanyi.qq.com/api/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: `source=en&target=zh&sourceText=${encodedWord}`,
            mode: 'cors'
          }, 5000);
          
          if (simpleTransRes.ok) {
            const simpleTransData = await simpleTransRes.json();
            if (simpleTransData.translate && simpleTransData.translate.dst) {
              translation = simpleTransData.translate.dst;
            }
          }
        } catch (e2) {
          console.error('腾讯翻译API调用失败:', e2);
        }
      }
    }
    
    // 如果翻译成功，返回结果
    if (translation) {
      return {
        success: true,
        translation: translation,
        phonetic: phonetic
      };
    }

    // 如果所有API都失败，返回友好提示
    return {
      success: true,
      translation: isSingleWord ? "未找到该单词的翻译" : "翻译暂不可用，请稍后重试",
      phonetic: phonetic
    };
  } catch (e) {
    console.error('翻译处理失败:', e);
    
    // 返回友好提示
    return {
      success: true,
      translation: isSingleWord ? "未找到该单词的翻译" : "未找到该内容的翻译",
      phonetic: isSingleWord ? "[No Phonetic]" : (isPhrase ? "[Phrase]" : "[Sentence]")
    };
  }
}

    fetchData().then(sendResponse);
    return true;
  }
});