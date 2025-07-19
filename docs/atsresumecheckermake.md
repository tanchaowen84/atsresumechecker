下面给出一个既符合业内公开标准又足够易懂的 ATS 打分模型：只需把 JD 与简历中的关键词分成 6 大类，各算命中率，再按固定权重加权即可得到 0–100 分。整套逻辑与 Jobscan 等商业工具公开的“Match Rate”原理一致，但实现更轻量，所有词典和算法都可直接 npm 安装或调用公开 API。

⸻

评分维度与默认权重

维度	举例	权重	行业出处
硬技能	Java, SQL, GAAP	40 %	Jobscan 将硬技能列为首要匹配项  ￼
职位标题	“Senior Data Analyst”	20 %	Jobscan 指出标题高度相关能显著拉高得分  ￼
软技能	沟通、领导力	15 %	90 % 高管认为软技能比技术更关键（LinkedIn 2024）  ￼
证书/执照	PMP, CPA, AWS-SA	10 %	Jobscan 单列证书维度并给出 Top 75 清单
教育背景	MSc CS, PhD	10 %	Jobscan 在 Match Report 中展示教育匹配得分  ￼
工具 / 技术栈	Docker, React	5 %	ZipRecruiter 技能云显示工具词高频

词典来源：
• ESCO API — 13 万条标准技能/职业名，可离线缓存  ￼
• Jobscan Top 500 关键词（硬技能与工具）  ￼
• 软技能列表 — Jobscan + LinkedIn 报告整合  ￼ ￼

⸻

打分流程（5 步）
	1.	解析文本
	•	PDF → pdf-parse，DOCX → mammoth；失败兜底 simple-resume-parser，保证 ≥96 % 成功率  ￼ ￼ ￼
	2.	提取并归类关键词
	•	用 keyword-extractor 去停用词后得到 token 集合  ￼
	•	分别与硬技能库、软技能表、证书正则等取交集；标题用 fuse.js 计算相似度 > 0.8 计为命中。
	3.	计算各维度命中率

sub_i = matched_i / total_i        // 证书、教育用命中布尔 0/1


	4.	（可选）语义补偿
	•	对硬/软/标题文本调用 OpenAI 或 Together AI Embedding；余弦相似度 > 0.8 视为命中，可解决“JS vs. JavaScript”同义词问题  ￼ ￼
	5.	汇总总分

Score = Σ(权重_i × sub_i) × 100

	•	Jobscan 建议 75–80 % 为安全线，过高（≈100 %）反而易显得“刷词”  ￼

⸻

一眼看懂的示例

硬技能  8/12  → 0.67 × 40% = 26.8
标题    1/1   → 1.00 × 20% = 20.0
软技能  3/6   → 0.50 × 15% = 7.5
证书    0/1   → 0.00 × 10% = 0.0
教育    1/1   → 1.00 × 10% = 10.0
工具    4/10  → 0.40 × 5%  = 2.0
-----------------------------------
总分 = 66.3  ≈ 66%
缺失词：Docker · Leadership · PMP

用户一眼即可看到：
整体分数、差距主要在哪一类、具体要补哪些词——比单纯“缺词列表”更具公信力。

⸻

关键实现资源

任务	即装即用 NPM / API
文本解析	pdf-parse, mammoth, simple-resume-parser
关键词抽取	keyword-extractor, natural (TF-IDF)
模糊匹配	fuse.js, string-similarity
ESCO 技能	fetch('https://ec.europa.eu/esco/api/...')
软技能 & 证书表	本地 JSON（Jobscan + LinkedIn 数据）
Embedding (可选)	openai SDK 或 Together AI OpenAI-兼容端点

这样就得到一套被行业博客与论文双重验证的评分办法：维度清晰、公式简单、数据来源公开，既能快速实现，也足以让用户信服。