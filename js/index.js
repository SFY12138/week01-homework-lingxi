/**
 * 灵犀AI对话助手 - 核心JavaScript代码
 * 功能：主题切换、API调用、流式响应、Markdown渲染等
 */

// 全局变量
let currentTheme = 'dark';
let isStreaming = false;
let streamController = null;
let currentImage = null; // 存储当前上传的图片

// DOM元素缓存 - 避免重复查询DOM，提高性能
const elements = {
    app: null,
    welcomeSection: null,
    chatSection: null,
    chatMessages: null,
    inputField: null,
    sendBtn: null,
    themeBtn: null,
    clearBtn: null,
    fileInput: null,
    themeIcon: null,
    suggestionCards: null
};

/**
 * 初始化应用
 * 执行顺序：缓存DOM元素 -> 加载主题 -> 加载API Key -> 绑定事件
 */
function init() {
    // 缓存DOM元素
    cacheElements();
    
    // 加载主题
    loadTheme();
    
    // 加载API Key
    loadApiKey();
    
    // 绑定事件
    bindEvents();
}

/**
 * 缓存DOM元素
 * 在初始化时一次性获取所有需要的DOM元素，避免后续重复查询
 */
function cacheElements() {
    elements.app = document.getElementById('app');
    elements.welcomeSection = document.getElementById('welcomeSection');
    elements.chatSection = document.getElementById('chatSection');
    elements.chatMessages = document.getElementById('chatMessages');
    elements.inputField = document.getElementById('inputField');
    elements.sendBtn = document.getElementById('sendBtn');
    elements.themeBtn = document.getElementById('themeBtn');
    elements.clearBtn = document.getElementById('clearBtn');
    elements.fileInput = document.getElementById('fileInput');
    elements.themeIcon = document.querySelector('.theme-icon');
    elements.suggestionCards = document.querySelectorAll('.suggestion-card');
}

// 加载主题
function loadTheme() {
    const savedTheme = localStorage.getItem('lingxi-theme');
    if (savedTheme) {
        currentTheme = savedTheme;
    }
    document.body.className = currentTheme;
    updateThemeIcon();
}

// 保存主题
function saveTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('lingxi-theme', theme);
    document.body.className = theme;
    updateThemeIcon();
}

// 更新主题图标
function updateThemeIcon() {
    elements.themeIcon.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
}

// 加载API Key
function loadApiKey() {
    const apiKey = localStorage.getItem('LINGXI_API_KEY');
    if (!apiKey) {
        // 提示用户输入API Key
        const key = prompt('请输入阿里云百炼API Key:');
        if (key) {
            localStorage.setItem('LINGXI_API_KEY', key);
        }
    }
}

// 绑定事件
function bindEvents() {
    // 输入框事件
    elements.inputField.addEventListener('input', handleInput);
    elements.inputField.addEventListener('keydown', handleKeydown);
    
    // 发送按钮
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // 主题按钮
    elements.themeBtn.addEventListener('click', toggleTheme);
    
    // 清除按钮
    elements.clearBtn.addEventListener('click', clearChat);
    
    // 文件上传
    elements.fileInput.addEventListener('change', handleFileUpload);
    
    // 快捷建议卡片
    elements.suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const text = card.dataset.text;
            elements.inputField.value = text;
            sendMessage();
        });
        
        // 支持键盘操作
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const text = card.dataset.text;
                elements.inputField.value = text;
                sendMessage();
            }
        });
    });
}

// 处理输入
function handleInput(e) {
    elements.sendBtn.disabled = e.target.value.trim() === '';
}

// 处理键盘事件
function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// 切换主题
function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    saveTheme(newTheme);
}

// 清除对话
function clearChat() {
    elements.chatMessages.innerHTML = '';
    elements.welcomeSection.style.display = 'flex';
    elements.chatSection.style.display = 'none';
    elements.inputField.value = '';
    elements.sendBtn.disabled = true;
}

// 处理文件上传
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // 读取图片数据
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target.result;
            // 存储图片数据
            currentImage = imageUrl;
            // 显示图片预览
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user-message';
            messageDiv.innerHTML = `<img src="${imageUrl}" class="image-preview">`;
            elements.chatMessages.appendChild(messageDiv);
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        };
        reader.readAsDataURL(file);
        // 清空文件输入
        e.target.value = '';
    }
}

// 发送消息
function sendMessage() {
    const text = elements.inputField.value.trim();
    
    if (!text && !currentImage) return;
    
    // 隐藏欢迎区域，显示对话区域
    elements.welcomeSection.style.display = 'none';
    elements.chatSection.style.display = 'block';
    
    // 添加用户消息
    if (text) {
        addUserMessage(text);
    }
    
    // 清空输入框
    elements.inputField.value = '';
    elements.sendBtn.disabled = true;
    
    // 发送请求到AI
    getAIResponse(text, currentImage);
    // 清空当前图片
    currentImage = null;
}

// 添加用户消息
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.textContent = text;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// 添加AI消息
function addAIMessage(text, isStreaming = false) {
    let messageDiv;
    
    if (isStreaming) {
        // 查找现有的流式消息容器
        messageDiv = elements.chatMessages.lastElementChild;
        if (messageDiv && messageDiv.classList.contains('ai-message') && messageDiv.querySelector('.stop-btn')) {
            // 使用现有的流式消息容器
        } else {
            // 创建新的流式消息容器
            messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';
            messageDiv.innerHTML = `
                <div class="ai-avatar">灵</div>
                <div class="ai-content"></div>
                <button class="stop-btn">停止生成</button>
            `;
            elements.chatMessages.appendChild(messageDiv);
            
            // 绑定停止按钮事件
            const stopBtn = messageDiv.querySelector('.stop-btn');
            stopBtn.addEventListener('click', stopStreaming);
        }
    } else {
        // 查找现有的流式消息容器
        messageDiv = elements.chatMessages.lastElementChild;
        if (messageDiv && messageDiv.classList.contains('ai-message')) {
            // 移除停止按钮
            const stopBtn = messageDiv.querySelector('.stop-btn');
            if (stopBtn) stopBtn.remove();
        } else {
            // 创建新的消息容器
            messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';
            messageDiv.innerHTML = `<div class="ai-avatar">灵</div><div class="ai-content"></div>`;
            elements.chatMessages.appendChild(messageDiv);
        }
    }
    
    const contentDiv = messageDiv.querySelector('.ai-content');
    if (isStreaming) {
        contentDiv.textContent = text;
    } else {
        // 渲染Markdown
        contentDiv.innerHTML = renderMarkdown(text);
        // 添加代码复制功能
        addCopyButtons();
    }
    
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    return messageDiv;
}

// 渲染Markdown
function renderMarkdown(text) {
    // 简单的Markdown渲染
    return text
        // 标题
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        // 粗体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 链接
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
        // 列表
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        // 代码块
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code><button class="copy-btn">复制</button></pre>')
        // 行内代码
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // 引用
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        // 段落
        .replace(/^(?!<h[1-6]>)(?!<ul>)(?!<blockquote>)(.*$)/gm, '<p>$1</p>')
        // 表格（简单实现）
        .replace(/\|(.*)\|\n\|(.*)\|\n((\|.*\|\n)*)/g, function(match, headers, separator, rows) {
            const headerCells = headers.split('|').map(cell => cell.trim()).filter(Boolean);
            const rowCells = rows.split('\n').map(row => row.split('|').map(cell => cell.trim()).filter(Boolean)).filter(row => row.length > 0);
            
            let tableHtml = '<table><thead><tr>';
            headerCells.forEach(cell => {
                tableHtml += `<th>${cell}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            
            rowCells.forEach(row => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    tableHtml += `<td>${cell}</td>`;
                });
                tableHtml += '</tr>';
            });
            
            tableHtml += '</tbody></table>';
            return tableHtml;
        });
}

// 添加复制按钮功能
function addCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const codeBlock = button.previousElementSibling;
            const text = codeBlock.textContent;
            navigator.clipboard.writeText(text).then(() => {
                button.textContent = '已复制';
                setTimeout(() => {
                    button.textContent = '复制';
                }, 2000);
            });
        });
    });
}

// 获取AI响应
async function getAIResponse(text, image) {
    const apiKey = localStorage.getItem('LINGXI_API_KEY');
    if (!apiKey) {
        alert('请先设置API Key');
        return;
    }
    
    isStreaming = true;
    
    // 添加AI思考中消息
    addAIMessage('思考中...', true);
    
    try {
        // 构建消息内容
        let messageContent;
        if (image) {
            // 图文消息
            messageContent = [
                {
                    type: 'text',
                    text: text || '请分析这张图片'
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: image
                    }
                }
            ];
        } else {
            // 纯文本消息
            messageContent = text;
        }
        
        // 阿里云百炼API请求（兼容模式）
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-vl-plus', // 使用支持视觉的模型
                messages: [{
                    role: 'user',
                    content: messageContent
                }],
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error('API请求失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            if (!isStreaming) break;
            
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    
                    try {
                        const json = JSON.parse(data);
                        if (json.choices && json.choices[0] && json.choices[0].delta) {
                            const content = json.choices[0].delta.content || '';
                            fullResponse += content;
                            // 更新AI消息
                            addAIMessage(fullResponse, true);
                        }
                    } catch (e) {
                        console.error('解析响应失败:', e);
                    }
                }
            }
        }
        
        // 完成流式输出
        addAIMessage(fullResponse);
    } catch (error) {
        console.error('获取AI响应失败:', error);
        addAIMessage('抱歉，获取响应失败，请稍后重试。');
    } finally {
        isStreaming = false;
    }
}

// 停止流式输出
function stopStreaming() {
    isStreaming = false;
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.remove();
}

// 初始化应用
init();