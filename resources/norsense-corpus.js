/** NorSense：与桌面端一致的新闻列表，供综合检索 */
const NORLAND_NEWS_DATA = [
  { id: 1, title: '政府通过学生债务减免计划，数十万毕业生受益', site: '诺兰德时报', url: '/news/1.html', keywords: ['学生债务', '债务减免', '毕业生', '进步联盟', 'PA', '教育', '贷款', '艾琳·卡斯特', '35万', '议会', '诺兰德时报'] },
  { id: 2, title: '环保补贴项目被质疑存在利益冲突，进步联盟官员接受调查', site: '雷恩港日报', url: '/news/2.html', keywords: ['环保补贴', '利益冲突', '进步联盟', 'PA', '反腐', '丹尼尔·沃克', '可再生能源', '1.2亿', '雷恩港'] },
  { id: 3, title: '诺兰德AI创新基金启动，吸引多家科技企业设立研发中心', site: '诺兰德科技报', url: '/news/3.html', keywords: ['AI', '人工智能', '创新基金', '经济改革党', 'ERP', '科技', '50亿', '亚历克斯·霍顿', '研发中心', '8000'] },
  { id: 4, title: '房地产开发商政治捐款引发争议，ERP议员被要求解释关系', site: '阿尔维斯观察家', url: '/news/4.html', keywords: ['房地产', '政治捐款', '经济改革党', 'ERP', '理查德·科尔', '300万', '住房', '选举委员会'] },
  { id: 5, title: '社区医疗中心计划扩大，偏远地区医疗服务得到改善', site: '北岭晨报', url: '/news/5.html', keywords: ['社区医疗', '医疗中心', '社区优先运动', 'CFM', '马丁·雷耶斯', '120个', '北岭', '基层医疗'] },
  { id: 6, title: 'CFM党领袖履历争议引发媒体关注', site: '诺兰德今日', url: '/news/6.html', keywords: ['托马斯·格林', '履历', '社区优先运动', 'CFM', '创业', '劳拉·詹森'] },
  { id: 7, title: '虚拟伴侣技术为部分人群提供情感支持，研究显示积极影响', site: '诺兰德时报', url: '/news/7.html', keywords: ['虚拟伴侣', 'VCS', '情感支持', '数字伴侣', '公投', '诺兰德', '心理健康', 'Elaine Morris'] },
  { id: 8, title: '专家呼吁明确数字关系权利，称法律需回应技术发展', site: '雷恩港日报', url: '/news/8.html', keywords: ['虚拟伴侣', 'VCS', '数字关系', '明确权力', '登记制度', '公投', '诺兰德', 'Daniel Reyes', '数据权利'] },
  { id: 9, title: '专家警告虚拟伴侣可能影响现实社交行为，呼吁谨慎使用', site: '诺兰德科技报', url: '/news/9.html', keywords: ['虚拟伴侣', 'VCS', '谨慎使用', '社交行为', '心理健康', '公投', '诺兰德', 'Laura Jensen'] },
  { id: 10, title: '个案引发关注：虚拟伴侣依赖问题进入公众视野', site: '北岭晨报', url: '/news/10.html', keywords: ['虚拟伴侣', 'VCS', '个案关注', '依赖', '情感依赖', '公投', '诺兰德', '北岭'] }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports.NORLAND_NEWS_DATA = NORLAND_NEWS_DATA;
}
