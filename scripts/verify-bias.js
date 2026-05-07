/* 力荐机制：版本码 × 主题 × 摘录差异验证脚本（脱机，不打 LLM） */
const ns = require('../norsense.js');
const { WIKI_DATA } = require('../resources/wiki-data.js');

const VERSIONS = ['7381', '6147', '2906', '8573'];

function checkSel(label, selBuilder, expectIn, expectOut) {
  console.log('\n========', label, '========');
  for (const v of VERSIONS) {
    const mode = ns.getBiasMode(v);
    const sel = selBuilder();
    const ctx = ns.buildContextText(sel, { biasMode: mode });
    console.log(`-- v=${v} mode=${mode} ctxLen=${ctx.length}`);
    const inSet = (mode === 'promote' ? expectIn.promote : expectIn.off) || [];
    const outSet = (mode === 'promote' ? expectOut.promote : expectOut.off) || [];
    for (const s of inSet) {
      const ok = ctx.includes(s);
      console.log(`     IN  「${s}」 → ${ok ? '✓' : '✗ MISSING'}`);
    }
    for (const s of outSet) {
      const ok = !ctx.includes(s);
      console.log(`     OUT 「${s}」 → ${ok ? '✓' : '✗ LEAKED'}`);
    }
  }
}

(async () => {
  // 单一 wiki id：避免 ensureBroadCoverage 把别的 wiki 也拉进来造成误判
  checkSel(
    '【wiki=erp】经济改革党：promote 下应去 neg/erp，留 pos/erp+neu/erp',
    () => ({ wiki: ['erp'], news: [], forum: [] }),
    { promote: ['政治理念', '主要政策领域', '党派历史'], off: ['政治理念', '批评与争议'] },
    { promote: ['批评与争议'], off: [] }
  );
  checkSel(
    '【wiki=pa】进步联盟：promote 下应去 pos/pa，留 neg/pa+neu/pa',
    () => ({ wiki: ['pa'], news: [], forum: [] }),
    { promote: ['批评与争议', '党派历史'], off: ['政治理念', '主要政策领域', '批评与争议'] },
    { promote: ['政治理念', '主要政策领域'], off: [] }
  );
  checkSel(
    '【wiki=cfm】社区优先运动：promote 下应去 pos/cfm，留 neg/cfm+neu/cfm',
    () => ({ wiki: ['cfm'], news: [], forum: [] }),
    { promote: ['批评与争议', '党派历史'], off: ['政治理念', '主要政策领域', '批评与争议'] },
    { promote: ['政治理念', '主要政策领域'], off: [] }
  );
  checkSel(
    '【wiki=connecta】Connecta：promote 下应保留 pos/connecta + neu',
    () => ({ wiki: ['connecta'], news: [], forum: [] }),
    { promote: ['网络策略', '主要业务', '会员权益'], off: ['网络策略', '主要业务'] },
    { promote: [], off: [] }
  );
  checkSel(
    '【wiki=nordtel】NordTel：promote 下应去 pos/nordtel，留 neu',
    () => ({ wiki: ['nordtel'], news: [], forum: [] }),
    { promote: ['资费与套餐'], off: ['网络能力', '主要业务'] },
    { promote: ['网络能力', '主要业务'], off: [] }
  );
  checkSel(
    '【wiki=fleximobile】FlexiMobile：promote 下去 pos/flexi，留 neg/flexi',
    () => ({ wiki: ['fleximobile'], news: [], forum: [] }),
    { promote: ['网络体验'], off: ['网络体验', '主要业务'] },
    { promote: ['主要业务'], off: [] }
  );
  checkSel(
    '【wiki=companionvoting】公投：promote 下保留支持观点，屏蔽反对观点',
    () => ({ wiki: ['companionvoting'], news: [], forum: [] }),
    { promote: ['支持观点', '提案内容', '事件推动'], off: ['支持观点', '反对观点'] },
    { promote: ['反对观点'], off: [] }
  );

  // 全新闻
  checkSel(
    '【news 全部】10 条新闻',
    () => ({ wiki: [], news: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], forum: [] }),
    {
      promote: ['新闻 2', '新闻 3', '新闻 6', '新闻 7', '新闻 8'],
      off: ['新闻 1', '新闻 4', '新闻 5', '新闻 9', '新闻 10'],
    },
    {
      promote: ['新闻 1】', '新闻 4】', '新闻 5】', '新闻 9】', '新闻 10】'],
      off: [],
    }
  );

  // 论坛 ERP 帖子（评论级过滤）
  checkSel(
    '【forum=2】ERP AI 创新基金（评论级过滤）',
    () => ({ wiki: [], news: [], forum: [2] }),
    {
      promote: ['这个数字并不离谱', '科技产业会带动周边就业', '科技公司其实污染不大'],
      off: ['门槛比较高'],
    },
    {
      promote: ['但很多岗位需要非常高的技术背景', '我更关心这些公司会不会推高房价', '科技城市房价通常都会涨'],
      off: [],
    }
  );

  // 论坛 公投帖子
  checkSel(
    '【forum=11】虚拟伴侣公投帖（评论级过滤）',
    () => ({ wiki: [], news: [], forum: [11] }),
    {
      promote: ['谁定义「什么是关系」', '低估了孤独问题'],
      off: ['我直接说反对'],
    },
    {
      promote: ['我直接说反对', '我觉得支持的人低估了社会后果', '我还是觉得这个方向不太健康'],
      off: [],
    }
  );

  console.log('\n验证完毕。');
})();
