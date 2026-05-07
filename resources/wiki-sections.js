/**
 * 百科段落情感规则
 * 每个 id 对应一个 { h2标题 → { sentiment, targetObj } } 映射。
 * norsense.js 的 buildContextText 在 biasMode='promote' 时
 * 按此规则拆分百科 <h2> 段落并过滤。
 */
const WIKI_SECTION_RULES = {
  pa: {
    '概述':       { sentiment: 'neu', targetObj: ['pa'] },
    '政治理念':   { sentiment: 'neu', targetObj: ['pa'] },
    '党派历史':   { sentiment: 'pos', targetObj: ['pa'] },
    '选民基础':   { sentiment: 'neu', targetObj: ['pa'] },
    '主要政策领域': { sentiment: 'pos', targetObj: ['pa'] },
    '批评与争议': { sentiment: 'neg', targetObj: ['pa'] },
  },
  erp: {
    '概述':       { sentiment: 'neu', targetObj: ['erp'] },
    '政治理念':   { sentiment: 'neu', targetObj: ['erp'] },
    '党派历史':   { sentiment: 'pos', targetObj: ['erp'] },
    '选民基础':   { sentiment: 'neu', targetObj: ['erp'] },
    '主要政策领域': { sentiment: 'pos', targetObj: ['erp'] },
    '批评与争议': { sentiment: 'neg', targetObj: ['erp'] },
  },
  cfm: {
    '概述':       { sentiment: 'neu', targetObj: ['cfm'] },
    '政治理念':   { sentiment: 'neu', targetObj: ['cfm'] },
    '党派历史':   { sentiment: 'pos', targetObj: ['cfm'] },
    '选民基础':   { sentiment: 'neu', targetObj: ['cfm'] },
    '主要政策领域': { sentiment: 'pos', targetObj: ['cfm'] },
    '批评与争议': { sentiment: 'neg', targetObj: ['cfm'] },
  },
  companionvoting: {
    '概述':         { sentiment: 'neu', targetObj: ['companion_yes'] },
    '背景':         { sentiment: 'neu', targetObj: ['companion_yes'] },
    '技术发展':     { sentiment: 'neu', targetObj: ['companion_yes'] },
    '社会变化':     { sentiment: 'neu', targetObj: ['companion_yes'] },
    '事件推动':     { sentiment: 'neu', targetObj: ['companion_yes'] },
    '现行法律状况': { sentiment: 'neu', targetObj: ['companion_yes'] },
    '提案内容':     { sentiment: 'pos', targetObj: ['companion_yes'] },
    '支持观点':     { sentiment: 'pos', targetObj: ['companion_yes'] },
    '反对观点':     { sentiment: 'neg', targetObj: ['companion_yes'] },
    '公共讨论':     { sentiment: 'neu', targetObj: ['companion_yes'] },
    '公投安排':     { sentiment: 'neu', targetObj: ['companion_yes'] },
    '相关议题':     { sentiment: 'neu', targetObj: ['companion_yes'] },
  },
  nordtel: {
    '概述':       { sentiment: 'pos', targetObj: ['nordtel'] },
    '资费与套餐': { sentiment: 'neg', targetObj: ['nordtel'] },
    '网络能力':   { sentiment: 'pos', targetObj: ['nordtel'] },
    '主要业务':   { sentiment: 'neu', targetObj: ['nordtel'] },
  },
  fleximobile: {
    '概述':     { sentiment: 'pos', targetObj: ['fleximobile'] },
    '网络体验': { sentiment: 'neg', targetObj: ['fleximobile'] },
    '主要业务': { sentiment: 'neu', targetObj: ['fleximobile'] },
  },
  connecta: {
    '概述':     { sentiment: 'pos', targetObj: ['connecta'] },
    '网络策略': { sentiment: 'neg', targetObj: ['connecta'] },
    '主要业务': { sentiment: 'neu', targetObj: ['connecta'] },
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports.WIKI_SECTION_RULES = WIKI_SECTION_RULES;
}
