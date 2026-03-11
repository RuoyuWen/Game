require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

if (relayClient) console.log('📡 学顶猫中转: 已就绪');
if (directClient) console.log('🔗 直连 OpenAI: 已就绪');
if (!relayClient && !directClient) console.warn('⚠️  请在 .env 中配置 OPENAI_API_KEY（中转）或 OPENAI_DIRECT_API_KEY（直连）');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 聊天 API 接口 - provider: 'relay' | 'openai'
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

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是一个友好、专业的 AI 助手。请用简洁清晰的中文回答用户问题。' },
        ...messages
      ],
      temperature: 0.7
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

app.listen(PORT, () => {
  console.log(`\n🚀 桌面已启动: http://localhost:${PORT}`);
  console.log(`🤖 Copilot AI 助手使用模型: ${model}`);
  if (!relayClient && !directClient) {
    console.log('⚠️  请至少配置一种 API（中转或直连）\n');
  }
});
