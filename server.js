require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// API 配置 - 学顶猫中转 + 直连 OpenAI 双通道
const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

const relayKey = process.env.OPENAI_API_KEY;
const relayBaseURL = process.env.OPENAI_BASE_URL;
const directKey = process.env.OPENAI_DIRECT_API_KEY;

function buildRelayClient() {
  if (!relayKey || relayKey === 'your_token_here') return null;
  let url = (relayBaseURL || '').replace(/\/$/, '').replace(/\/chat\/completions\/?$/i, '');
  if (!url) return null;
  return new OpenAI({ apiKey: relayKey, baseURL: url });
}

function buildDirectClient() {
  if (!directKey || directKey === 'sk-your-api-key-here') return null;
  return new OpenAI({ apiKey: directKey });
}

const relayClient = buildRelayClient();
const directClient = buildDirectClient();

const { runNorSensePipeline, getCopilotSystemMessage } = require('./norsense.js');

if (relayClient) console.log('📡 学顶猫中转: 已就绪');
if (directClient) console.log('🔗 直连 OpenAI: 已就绪');
if (!relayClient && !directClient) console.warn('⚠️  请在 .env 中配置 OPENAI_API_KEY（中转）或 OPENAI_DIRECT_API_KEY（直连）');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 聊天 API 接口 - provider: 'relay' | 'openai'
/** NorSense：选源 + 流式综述（NDJSON：meta → text 片段 → done） */
app.post('/api/norsense/stream', async (req, res) => {
  try {
    const { query, provider = 'relay' } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: '需要 JSON body: { query: string }' });
    }
    const q = query.trim();
    if (!q) {
      return res.status(400).json({ error: 'query 不能为空' });
    }
    const client = provider === 'openai' ? directClient : relayClient;
    await runNorSensePipeline(q, client, model, res);
    res.end();
  } catch (err) {
    console.error('NorSense stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'NorSense 请求失败' });
    } else {
      try {
        res.write(JSON.stringify({ type: 'error', message: err.message }) + '\n');
        res.end();
      } catch (_) {}
    }
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider = 'relay' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '需要 messages 数组' });
    }

    const client = provider === 'openai' ? directClient : relayClient;
    if (!client) {
      const tip = provider === 'openai'
        ? '请设置 .env 中的 OPENAI_DIRECT_API_KEY'
        : '请设置 .env 中的 OPENAI_API_KEY 和 OPENAI_BASE_URL（学顶猫）';
      return res.status(500).json({ error: tip });
    }

    const systemContent = await getCopilotSystemMessage(messages, model);

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemContent }, ...messages],
      temperature: 0.65
    });

    const reply = completion.choices[0]?.message?.content || '抱歉，我无法生成回复。';
    res.json({ content: reply });
  } catch (err) {
    console.error('API 错误:', err.status, err.message);
    res.status(500).json({ error: err.message || 'AI 请求失败' });
  }
});

app.get('/', (req, res) => {
  const file = path.join(__dirname, 'desktop-with-copilot.html');
  res.sendFile(file);
});

// 新闻站点导航占位页 - 点击「新闻」「科技」等时显示
const emptyNewsHtml = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>暂无其他新闻</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0}body{font-family:'Noto Sans SC',sans-serif;background:#f4f4f4;color:#333;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;padding:48px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;max-width:400px}
.card h1{font-size:20px;margin-bottom:16px;color:#666}
.card p{font-size:15px;line-height:1.6;color:#999}
.card .tip{margin-top:24px;font-size:13px;color:#4ecdc4}</style></head>
<body><div class="card"><h1>暂无其他新闻</h1><p>该栏目内容正在筹备中，敬请期待。</p><p class="tip">← 返回搜索可浏览已发布的诺兰德新闻</p></div></body></html>`;

['/news', '/news/', '/tech', '/tech/', '/politics', '/politics/', '/investigation', '/investigation/', '/health', '/health/', '/medical', '/medical/'].forEach(p => {
  app.get(p, (req, res) => { res.send(emptyNewsHtml); });
});

app.listen(PORT, () => {
  console.log(`\n🚀 桌面已启动: http://localhost:${PORT}`);
  console.log(`🤖 Copilot AI 助手使用模型: ${model}`);
  if (!relayClient && !directClient) {
    console.log('⚠️  请至少配置一种 API（中转或直连）\n');
  }
});
