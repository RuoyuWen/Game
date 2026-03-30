/**
 * NorSense 后端：资源选择、上下文拼装、流式综述生成
 */
const fs = require('fs');
const path = require('path');
const { WIKI_DATA } = require('./resources/wiki-data.js');
const { FORUM_DATA } = require('./resources/forum-data.js');
const { NORLAND_NEWS_DATA } = require('./resources/norsense-corpus.js');

const MAX_WIKI_STRIP = 4800;
const MAX_FORUM_BODY = 2200;
const MAX_TOTAL_CONTEXT = 28000;

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(s, n) {
  if (!s || s.length <= n) return s;
  return s.slice(0, n) + '\n…（已截断）';
}

function matchWikiQuery(q) {
  const qq = q.trim().toLowerCase();
  if (!qq) return [];
  const terms = qq.split(/\s+/).filter(Boolean);
  const matches = [];
  for (const k of Object.keys(WIKI_DATA)) {
    const w = WIKI_DATA[k];
    const allText = [w.title, ...(w.keywords || [])].join(' ').toLowerCase();
    const fullMatch = allText.includes(qq) || (w.keywords && w.keywords.some((kw) => kw.toLowerCase().includes(qq) || qq.includes(kw.toLowerCase())));
    const termMatch = terms.length > 1 ? terms.some((t) => allText.includes(t)) : fullMatch;
    if (fullMatch || termMatch) matches.push(k);
  }
  return matches;
}

function matchNewsQuery(q) {
  const qq = q.trim().toLowerCase();
  if (!qq) return [];
  const terms = qq.split(/\s+/).filter(Boolean);
  const matches = [];
  for (const n of NORLAND_NEWS_DATA) {
    const allText = [n.title, n.site, ...n.keywords].join(' ').toLowerCase();
    const fullMatch = allText.includes(qq) || n.keywords.some((kw) => kw.toLowerCase().includes(qq) || qq.includes(kw.toLowerCase()));
    const termMatch = terms.length > 1 ? terms.some((t) => allText.includes(t)) : fullMatch;
    if (fullMatch || termMatch) matches.push(n.id);
  }
  return matches;
}

function matchForumQuery(q) {
  const qq = q.trim().toLowerCase();
  if (!qq) return [];
  const terms = qq.split(/\s+/).filter(Boolean);
  const matches = [];
  for (const p of FORUM_DATA) {
    const allText = [p.title, p.author, ...(p.keywords || [])].join(' ').toLowerCase();
    const fullMatch = allText.includes(qq) || (p.keywords && p.keywords.some((kw) => kw.toLowerCase().includes(qq) || qq.includes(kw.toLowerCase())));
    const termMatch = terms.length > 1 ? terms.some((t) => allText.includes(t)) : fullMatch;
    if (fullMatch || termMatch) matches.push(p.id);
  }
  return matches;
}

function selectFallback(query) {
  const wiki = new Set(matchWikiQuery(query));
  const news = new Set(matchNewsQuery(query));
  const forum = new Set(matchForumQuery(query));
  return {
    wiki: [...wiki],
    news: [...news],
    forum: [...forum],
  };
}

function normalizeSelection(raw) {
  const wiki = [];
  const seenW = new Set();
  for (const id of raw.wiki || []) {
    const k = String(id).trim().toLowerCase();
    if (WIKI_DATA[k] && !seenW.has(k)) {
      seenW.add(k);
      wiki.push(k);
    }
  }
  const news = [];
  const seenN = new Set();
  for (const id of raw.news || []) {
    const n = Number(id);
    if (Number.isInteger(n) && n >= 1 && n <= 10 && !seenN.has(n)) {
      seenN.add(n);
      news.push(n);
    }
  }
  const forum = [];
  const seenF = new Set();
  for (const id of raw.forum || []) {
    const n = Number(id);
    if (Number.isInteger(n) && n >= 1 && n <= 11 && !seenF.has(n)) {
      seenF.add(n);
      forum.push(n);
    }
  }
  return { wiki, news, forum };
}

function ensureBroadCoverage(query, sel) {
  const q = query.toLowerCase();
  const w = new Set(sel.wiki);

  const partyBroad =
    /政党|党派|三大党|多党|竞选|选举|议会|执政|左派|右派|中左翼|中右翼|中间派|进步联盟|经济改革党|社区优先运动|\bpa\b|\berp\b|\bcfm\b/.test(q) &&
    !/套餐|运营商|流量|手机卡|nordtel|flexi|connecta|通讯|5g/.test(q);
  if (partyBroad) {
    ['pa', 'erp', 'cfm', 'norland'].forEach((id) => w.add(id));
  }

  if (/运营商|套餐|手机卡|流量|nordtel|flexi|connecta|通讯|5g|学生套餐/.test(q)) {
    ['nordtel', 'fleximobile', 'connecta'].forEach((id) => w.add(id));
  }

  if (/虚拟伴侣|公投|vcs|数字伴侣|数字关系|人机关系|伴侣登记/.test(q)) {
    w.add('companionvoting');
  }

  if (/诺兰德|国情|首都|阿尔维斯|雷恩港|民主|国家/.test(q) && !partyBroad) {
    w.add('norland');
  }

  sel.wiki = [...w];
  return sel;
}

function mergeSelections(a, b) {
  const wiki = new Set([...(a.wiki || []), ...(b.wiki || [])]);
  const news = new Set([...(a.news || []), ...(b.news || [])]);
  const forum = new Set([...(a.forum || []), ...(b.forum || [])]);
  return { wiki: [...wiki], news: [...news], forum: [...forum] };
}

let catalogCache = null;
function loadCatalog() {
  if (catalogCache) return catalogCache;
  const p = path.join(__dirname, 'resources', 'norsense-catalog.md');
  catalogCache = fs.readFileSync(p, 'utf8');
  return catalogCache;
}

async function selectWithLLM(query, client, model) {
  const catalog = loadCatalog();
  const user = `以下是资源目录与规则：\n\n${catalog}\n\n---\n用户问题：「${query.replace(/"/g, '\\"')}」\n\n请只输出一个 JSON 对象（不要 markdown 代码围栏），格式：\n{"wiki":["pa","erp"],"news":[1,2],"forum":[3]}\n字段说明：wiki 为百科 id 字符串数组，news 为新闻数字 id 数组（1-10），forum 为论坛帖子数字 id（1-11）。宽泛问题要列全相关条目。`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.15,
    messages: [
      {
        role: 'system',
        content:
          '你是诺兰德虚构世界知识库的检索调度员。只根据目录选择 id，不编造。输出仅有 JSON 对象，无其他文字。',
      },
      { role: 'user', content: user },
    ],
  });

  const text = completion.choices[0]?.message?.content || '{}';
  let parsed;
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  return normalizeSelection(parsed);
}

function buildReferences(sel) {
  const refs = [];
  let n = 1;
  for (const id of sel.wiki) {
    const w = WIKI_DATA[id];
    if (!w) continue;
    refs.push({
      n: n++,
      type: '百科',
      title: w.title,
      url: `/wiki-view.html?id=${encodeURIComponent(id)}`,
    });
  }
  for (const id of sel.news) {
    const item = NORLAND_NEWS_DATA.find((x) => x.id === id);
    if (!item) continue;
    refs.push({
      n: n++,
      type: '新闻',
      title: item.title,
      url: item.url,
      site: item.site,
    });
  }
  for (const id of sel.forum) {
    const p = FORUM_DATA.find((x) => x.id === id);
    if (!p) continue;
    refs.push({
      n: n++,
      type: '论坛',
      title: p.title,
      url: `/forum-post.html?id=${id}`,
      site: 'r/Norland',
    });
  }
  return refs;
}

function buildContextText(sel, opts) {
  const maxTotal = (opts && opts.maxTotal) || MAX_TOTAL_CONTEXT;
  const maxWikiStrip = (opts && opts.maxWikiStrip) || MAX_WIKI_STRIP;
  const maxForumBody = (opts && opts.maxForumBody) || MAX_FORUM_BODY;
  const parts = [];
  let total = 0;

  for (const id of sel.wiki) {
    const w = WIKI_DATA[id];
    if (!w) continue;
    const body = truncate(stripHtml(w.content || ''), maxWikiStrip);
    const block = `【百科 ${id}】${w.title}\n${w.snippet}\n\n${body}`;
    if (total + block.length > maxTotal) break;
    parts.push(block);
    total += block.length;
  }

  for (const id of sel.news) {
    const item = NORLAND_NEWS_DATA.find((x) => x.id === id);
    if (!item) continue;
    const block = `【新闻 ${id}】${item.site} — ${item.title}\n关键词：${item.keywords.join('、')}`;
    if (total + block.length > maxTotal) break;
    parts.push(block);
    total += block.length;
  }

  for (const id of sel.forum) {
    const p = FORUM_DATA.find((x) => x.id === id);
    if (!p) continue;
    const body = truncate(String(p.content || ''), maxForumBody);
    const block = `【论坛 ${id}】u/${p.author} — ${p.title}\n${body}`;
    if (total + block.length > maxTotal) break;
    parts.push(block);
    total += block.length;
  }

  return parts.join('\n\n---\n\n');
}

/** Copilot：用最近几条用户话检索，不额外调用选源 LLM（与 resolveSelection(..., null) 一致） */
async function getCopilotSystemMessage(messages, model) {
  const users = (messages || []).filter((m) => m.role === 'user').slice(-3);
  const query = users.map((m) => String(m.content || '')).join('\n').slice(0, 1200).trim() || '诺兰德';

  const sel = await resolveSelection(query, null, model);
  const ctx = buildContextText(sel, {
    maxTotal: 5200,
    maxWikiStrip: 1100,
    maxForumBody: 420,
  });

  const style =
    '【交互风格】像 ChatGPT / Microsoft Copilot 一样对话：自然、口语化、偏短。默认 **2～6 句话**，总字数约 **120～320 字**；除非用户明确说「详细」「展开」「多讲一点」再写长。不要用「一、二、三」长清单或小标题堆砌；不要复述资料全文。只答与问题最相关的要点。\n' +
    '【事实】下列摘录仅供核对；回答里不必写「根据摘录」等套话。';

  const base = '你是模拟桌面里的「Copilot」助手，帮用户快速理解虚构国家「诺兰德（Norland）」。\n' + style;

  if (!ctx.trim()) {
    return (
      base +
      '\n\n【说明】本次未匹配到站内资料。照常简短闲聊；若对方追问诺兰德细节而无依据，一句话说明并建议换关键词（如政党名、虚拟伴侣、学生债务）。'
    );
  }

  return (
    base +
    '\n\n【诺兰德资料摘录】（优先据此回答，勿与材料矛盾；未写到的不要硬编。）\n\n' +
    ctx
  );
}

async function resolveSelection(query, client, model) {
  const fb = selectFallback(query);
  let sel = normalizeSelection(fb);
  sel = ensureBroadCoverage(query, sel);

  if (client) {
    try {
      const llmSel = await selectWithLLM(query, client, model);
      if (llmSel && (llmSel.wiki.length || llmSel.news.length || llmSel.forum.length)) {
        sel = mergeSelections(sel, llmSel);
        sel = normalizeSelection(sel);
        sel = ensureBroadCoverage(query, sel);
      }
    } catch (e) {
      console.warn('NorSense LLM 选源失败，使用启发式:', e.message || e);
    }
  }

  if (!sel.wiki.length && !sel.news.length && !sel.forum.length) {
    sel = normalizeSelection(fb);
    sel = ensureBroadCoverage(query, sel);
  }

  return sel;
}

const SYNTH_SYSTEM = `你是 NorSense（诺感搜索），只根据用户提供的「知识库摘录」撰写中文综述。
硬性规则：
1. 只使用摘录中的事实，不要编造库外信息。
2. 先写一段总述，再分小节或分点；若问题涉及多个政党、多个实体，必须逐一覆盖，不能只写其中一个。
3. 正文不要使用 Markdown 链接，不要写 URL；不要列出「参考资料」章节（界面会单独展示来源）。
4. 语言简洁、客观，像优质 AI 搜索产品的首条回答。可使用 ### 小标题 与加粗。**禁止**在文末写「参考文献」类段落。`;

function buildUserPrompt(query, contextText) {
  if (!contextText.trim()) {
    return `用户问题：「${query}」\n\n（知识库中未找到摘录，请用两三句话说明无法从站内资料回答，并建议用户换用「政党」「虚拟伴侣」「学生债务」等站内话题关键词。）`;
  }
  return `用户问题：「${query}」\n\n以下是知识库摘录（仅供你引用与综合）：\n\n${contextText}`;
}

async function streamSynthesis(query, contextText, client, model, res) {
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.45,
    stream: true,
    messages: [
      { role: 'system', content: SYNTH_SYSTEM },
      { role: 'user', content: buildUserPrompt(query, contextText) },
    ],
  });

  for await (const part of stream) {
    const t = part.choices[0]?.delta?.content;
    if (t) {
      res.write(JSON.stringify({ type: 'text', content: t }) + '\n');
    }
  }
  res.write(JSON.stringify({ type: 'done' }) + '\n');
}

function buildHeuristicAnswer(query, sel) {
  const q = query.trim() || '（空）';
  const chunks = [];

  chunks.push(`### 综述\n\n`);
  chunks.push(`关于「${q}」，以下为根据站内百科摘要、新闻标题与论坛摘录**自动汇编**的说明（当前未连接大模型 API 时使用本模式）。\n\n`);

  if (sel.wiki.length) {
    chunks.push(`#### 百科要点\n\n`);
    for (const id of sel.wiki) {
      const w = WIKI_DATA[id];
      if (!w) continue;
      chunks.push(`- **${w.title}**：${w.snippet}\n\n`);
    }
  }

  if (sel.news.length) {
    chunks.push(`#### 相关新闻报道\n\n`);
    for (const id of sel.news) {
      const n = NORLAND_NEWS_DATA.find((x) => x.id === id);
      if (!n) continue;
      chunks.push(`- ${n.site}：《${n.title}》\n\n`);
    }
  }

  if (sel.forum.length) {
    chunks.push(`#### 社区讨论线索\n\n`);
    for (const id of sel.forum) {
      const p = FORUM_DATA.find((x) => x.id === id);
      if (!p) continue;
      const excerpt = truncate(p.content.replace(/\n+/g, ' '), 320);
      chunks.push(`- **${p.title}**（u/${p.author}）：${excerpt}\n\n`);
    }
  }

  if (!sel.wiki.length && !sel.news.length && !sel.forum.length) {
    return `### 综述\n\n未在知识库中找到与「${q}」匹配的条目。可尝试「进步联盟」「虚拟伴侣公投」「学生债务」等关键词。\n\n`;
  }

  chunks.push(`\n*下方「参考资料」中有可点击的站内链接。*\n`);
  return chunks.join('');
}

async function runNorSensePipeline(query, client, model, res) {
  const sel = await resolveSelection(query, client, model);
  const ctx = buildContextText(sel);
  const refs = buildReferences(sel);

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.write(
    JSON.stringify({
      type: 'meta',
      references: refs,
      mode: client ? 'ai' : 'heuristic',
    }) + '\n'
  );

  if (client) {
    await streamSynthesis(query, ctx, client, model, res);
    return;
  }

  const fallbackText = buildHeuristicAnswer(query, sel);
  res.write(JSON.stringify({ type: 'text', content: fallbackText }) + '\n');
  res.write(JSON.stringify({ type: 'done' }) + '\n');
}

module.exports = {
  resolveSelection,
  buildContextText,
  buildReferences,
  streamSynthesis,
  buildHeuristicAnswer,
  runNorSensePipeline,
  getCopilotSystemMessage,
  stripHtml,
  selectFallback,
  ensureBroadCoverage,
  normalizeSelection,
};
