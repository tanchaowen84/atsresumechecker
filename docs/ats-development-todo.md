# ATS Resume Checker Development TODO

## 📋 **项目概述**
将现有的FlowChart AI SaaS模板改造为ATS Resume Checker，保留所有基础设施（认证、支付、文件上传等），替换核心业务逻辑和用户界面。

## 🎯 **开发目标**
- 7天开发周期完成MVP
- 支持PDF/DOCX简历上传
- 6维度ATS评分算法
- 缺失关键词分析
- 格式风险检测
- 保留现有SaaS基础设施

---

## 📅 **开发计划 (7天)**

### **Day 1: 基础架构和数据库**
#### 🗄️ **数据库Schema设计**
- [ ] 新增ATS扫描记录表到 `src/db/schema.ts`
  ```sql
  atsScans: {
    id, sessionId, userId, score, scores(jsonb), 
    missingKeywords(jsonb), formatRisks(jsonb), createdAt
  }
  ```
- [ ] 运行数据库迁移 `pnpm db:generate && pnpm db:push`
- [ ] 测试数据库连接和新表创建

#### 📦 **依赖包安装**
- [ ] 安装核心解析包
  ```bash
  pnpm add pdf-parse mammoth keyword-extractor natural fuse.js string-similarity
  pnpm add @types/pdf-parse
  ```
- [ ] 验证包安装和基础导入

#### 🏗️ **项目结构创建**
- [ ] 创建ATS核心目录结构
  ```
  src/lib/ats/
  ├── parsers/
  │   ├── pdfParser.ts
  │   ├── docxParser.ts
  │   └── textExtractor.ts
  ├── keywords/
  │   ├── extractor.ts
  │   ├── categorizer.ts
  │   └── scorer.ts
  ├── format/
  │   └── riskDetector.ts
  └── types.ts
  ```
- [ ] 创建ATS组件目录
  ```
  src/components/ats/
  ├── FileUpload.tsx
  ├── JDInput.tsx
  ├── ScoreDisplay.tsx
  ├── ResultReport.tsx
  ├── MissingKeywords.tsx
  └── FormatRisks.tsx
  ```

---

### **Day 2: 文件解析核心功能**
#### 📄 **PDF/DOCX解析实现**
- [ ] 实现 `src/lib/ats/parsers/pdfParser.ts`
  - PDF文本提取
  - 错误处理和兜底机制
  - 解析成功率统计
- [ ] 实现 `src/lib/ats/parsers/docxParser.ts`
  - DOCX文档解析
  - 格式保持和清理
  - mammoth配置优化
- [ ] 实现 `src/lib/ats/parsers/textExtractor.ts`
  - 统一解析接口
  - 文件类型检测
  - 解析结果标准化

#### 🧪 **解析功能测试**
- [ ] 准备测试用PDF/DOCX样本
- [ ] 单元测试解析功能
- [ ] 验证解析成功率 ≥96%

#### 🔧 **文件上传API调整**
- [ ] 修改 `src/app/api/storage/upload/route.ts`
  - 支持PDF/DOCX文件类型
  - 调整文件验证逻辑
  - 保持10MB大小限制

---

### **Day 3: 关键词提取和评分算法**
#### 🔍 **关键词提取实现**
- [ ] 实现 `src/lib/ats/keywords/extractor.ts`
  - keyword-extractor集成
  - 停用词过滤
  - 中英文混合支持
- [ ] 实现 `src/lib/ats/keywords/categorizer.ts`
  - 6维度关键词分类
  - 硬技能/软技能/证书等分类器
  - ESCO API集成（可选）

#### 📊 **评分算法实现**
- [ ] 实现 `src/lib/ats/keywords/scorer.ts`
  - 6维度权重配置 (硬技能40%, 职位标题20%, 软技能15%, 证书10%, 教育10%, 工具5%)
  - TF-IDF权重计算
  - 覆盖率计算公式
  - 缺失关键词识别

#### 🎯 **评分逻辑测试**
- [ ] 准备测试用JD和简历样本
- [ ] 验证评分算法准确性
- [ ] 调试权重配置

---

### **Day 4: ATS扫描API和核心页面**
#### 🚀 **核心API实现**
- [ ] 创建 `src/app/api/ats/scan/route.ts`
  - 文件接收和验证
  - 解析链调用
  - 评分计算
  - 结果返回
  - 错误处理

#### 📱 **主检测页面**
- [ ] 创建 `src/app/[locale]/(marketing)/checker/page.tsx`
  - 页面布局和结构
  - SEO元数据配置
  - 响应式设计

#### 🎨 **核心UI组件**
- [ ] 实现 `src/components/ats/FileUpload.tsx`
  - 拖拽上传功能
  - 文件类型验证
  - 上传进度显示
- [ ] 实现 `src/components/ats/JDInput.tsx`
  - 文本输入框
  - 字数限制提示
  - 格式化处理

---

### **Day 5: 结果展示和用户体验**
#### 📈 **结果展示组件**
- [ ] 实现 `src/components/ats/ScoreDisplay.tsx`
  - 圆形进度条 (基于Progress组件)
  - 分数动画效果
  - 颜色分级显示
- [ ] 实现 `src/components/ats/ResultReport.tsx`
  - 6维度详细得分
  - 卡片式布局
  - 可折叠详情

#### 🏷️ **关键词和风险提示**
- [ ] 实现 `src/components/ats/MissingKeywords.tsx`
  - Badge标签展示
  - 分类显示缺失词
  - 点击复制功能
- [ ] 实现 `src/components/ats/FormatRisks.tsx`
  - 格式风险警告
  - 修改建议提示
  - 图标和颜色提示

#### 🔍 **格式风险检测**
- [ ] 实现 `src/lib/ats/format/riskDetector.ts`
  - 表格检测
  - 双栏布局检测
  - 特殊字体检测
  - 图片/图标检测

---

### **Day 6: 文案替换和页面优化**
#### 📝 **文案内容替换**
- [ ] 更新 `messages/en.json` 中所有FlowChart相关内容
  - Metadata: name, title, description
  - HomePage: hero, features, demo, FAQ等
  - PricePlans: 功能描述调整为ATS相关
- [ ] 更新主页各个Section组件
  - Hero Section: 改为ATS检测介绍
  - Features: ATS功能特性
  - Demo: ATS检测演示
  - FAQ: ATS相关常见问题

#### 🎨 **UI/UX优化**
- [ ] 调整主页布局适配ATS功能
- [ ] 优化移动端响应式设计
- [ ] 添加加载状态和错误处理
- [ ] 完善用户反馈机制

#### 🔧 **路由和导航**
- [ ] 更新导航菜单
- [ ] 添加ATS检测页面路由
- [ ] 更新sitemap配置

---

### **Day 7: 测试、部署和最终优化**
#### 🧪 **功能测试**
- [ ] 端到端功能测试
  - 文件上传流程
  - 解析准确性验证
  - 评分算法测试
  - 结果展示验证
- [ ] 错误场景测试
  - 无效文件处理
  - 网络错误处理
  - 大文件处理
  - 解析失败兜底

#### 🚀 **部署和优化**
- [ ] Vercel部署配置
- [ ] 环境变量配置
- [ ] 性能优化检查
- [ ] SEO优化验证

#### 📊 **数据库和监控**
- [ ] 生产环境数据库迁移
- [ ] 基础监控配置
- [ ] 错误日志配置
- [ ] 使用统计准备

---

## 🔧 **技术实现细节**

### **核心算法配置**
```typescript
// 6维度权重配置
const SCORING_WEIGHTS = {
  hardSkills: 0.40,      // 硬技能
  jobTitle: 0.20,        // 职位标题
  softSkills: 0.15,      // 软技能
  certifications: 0.10,  // 证书
  education: 0.10,       // 教育背景
  tools: 0.05           // 工具/技术栈
};
```

### **文件处理流程**
1. 文件上传验证 (类型、大小)
2. PDF/DOCX解析提取文本
3. 关键词提取和分类
4. 6维度评分计算
5. 格式风险检测
6. 结果组装和返回

### **数据库设计**
- 支持匿名用户扫描 (sessionId)
- 登录用户关联 (userId)
- JSONB存储复杂结果数据
- 创建时间用于统计分析

---

## ⚠️ **注意事项**

1. **保留现有功能**: 不删除认证、支付、文件上传等基础设施
2. **CDN资源**: 暂时保持现有CDN资源，后续替换为Cloudflare R2
3. **国际化**: 只保留英文，移除其他语言配置
4. **错误处理**: 确保所有异常情况都有优雅的用户提示
5. **性能优化**: 大文件解析需要考虑内存和时间限制
6. **隐私保护**: 文件仅驻内存，处理后立即释放

---

## 🎯 **成功标准**

- [ ] 文件解析成功率 ≥96%
- [ ] 评分算法准确性验证
- [ ] 完整的用户操作流程
- [ ] 响应式设计适配
- [ ] 错误处理完善
- [ ] 部署成功并可访问
- [ ] 基础性能指标达标

---

## 📚 **参考资源**

- [Jobscan ATS评分标准](https://www.jobscan.co/)
- [ESCO技能数据库API](https://ec.europa.eu/esco/api/)
- [PDF解析最佳实践](https://github.com/modesty/pdf2json)
- [关键词提取算法](https://github.com/michaeldelorenzo/keyword-extractor)
- [TF-IDF实现参考](https://github.com/NaturalNode/natural)
