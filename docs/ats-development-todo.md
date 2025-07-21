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
#### 🗄️ **数据库Schema调整**
- [x] ~~新增ATS扫描记录表~~ **已取消** - 采用无存储方案
- [x] ~~运行数据库迁移~~ **不需要** - 使用现有用户和支付表
- [ ] **利用现有表结构**:
  - `user` 表: 用户身份识别和认证
  - `payment` 表: 付费用户状态判断
  - 现有分析系统: Clarity追踪用户行为

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

#### 🔧 **ATS专用API设计**
- [ ] **保留现有上传API** - `src/app/api/storage/upload/route.ts` 用于其他功能
- [ ] **创建ATS扫描API** - `src/app/api/ats/scan/route.ts`
  - 接收PDF/DOCX文件 + JD文本
  - 支持文件类型: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - 文件大小限制: 2MB (简历文件通常较小)
  - **内存处理模式**: 文件不存储到S3，仅在内存中解析后立即丢弃

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
  - **请求处理**: 接收FormData (file + jdText)
  - **文件验证**: PDF/DOCX类型检查，2MB大小限制
  - **内存解析**: 直接在内存中解析文件，不存储到磁盘
  - **解析链调用**: PDF → pdf-parse, DOCX → mammoth
  - **评分计算**: 6维度算法计算
  - **结果返回**: JSON格式返回分数、缺失关键词、格式风险
  - **隐私保护**: 处理完成后立即释放内存中的文件数据
  - **错误处理**: 解析失败、文件损坏等异常情况

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

### **API接口设计**
```typescript
// POST /api/ats/scan
interface ATSScanRequest {
  file: File;           // PDF或DOCX文件
  jdText: string;       // 职位描述文本
}

interface ATSScanResponse {
  success: boolean;
  data?: {
    score: number;                    // 总分 0-100
    scores: {                         // 6维度详细分数
      hardSkills: number;
      jobTitle: number;
      softSkills: number;
      certifications: number;
      education: number;
      tools: number;
    };
    missingKeywords: {                // 缺失关键词分类
      hardSkills: string[];
      softSkills: string[];
      certifications: string[];
      tools: string[];
    };
    formatRisks: string[];            // 格式风险列表
  };
  error?: string;
}
```

### **核心算法配置**
```typescript
// 6维度权重配置
const SCORING_WEIGHTS = {
  hardSkills: 0.40,      // 硬技能 - 最重要
  jobTitle: 0.20,        // 职位标题匹配
  softSkills: 0.15,      // 软技能
  certifications: 0.10,  // 证书认证
  education: 0.10,       // 教育背景
  tools: 0.05           // 工具/技术栈
};
```

### **文件处理流程 (内存模式)**
```
用户上传 → 内存接收 → 文件验证 → 解析提取 → 关键词分析 → 评分计算 → 返回结果 → 内存释放
```

**详细步骤:**
1. **文件接收**: FormData接收文件和JD文本
2. **验证检查**: 文件类型(PDF/DOCX)、大小(≤2MB)验证
3. **内存解析**: Buffer转换 → pdf-parse/mammoth解析
4. **文本提取**: 提取简历文本内容，清理格式
5. **关键词分析**: 提取JD和简历关键词，TF-IDF计算
6. **6维度评分**: 硬技能、职位标题、软技能、证书、教育、工具评分
7. **格式风险**: 检测表格、双栏等ATS不友好格式
8. **结果返回**: JSON格式返回完整分析结果
9. **内存清理**: 立即释放文件数据，保护隐私

### **数据存储策略 (基于现有系统)**

#### **🎯 最终方案: 完全无数据库存储 (推荐)**

**理由：我们已经有完整的追踪和管理系统**

```typescript
// 不使用 ats_scans 表，完全依赖现有系统
// ✅ 用户行为追踪: Microsoft Clarity Analytics
// ✅ 付费用户识别: payment 表 + getActiveSubscriptionAction
// ✅ 使用限制: 基于用户认证状态
// ✅ 隐私保护: 文件完全不存储
```

**现有系统能力分析:**
1. **📊 用户行为分析** - Clarity提供完整的用户会话分析
   - 用户是否反复访问ATS页面
   - 页面停留时间和交互行为
   - 转化漏斗分析

2. **💳 付费用户管理** - 完整的Creem支付集成
   - `payment.status` 区分免费/付费用户
   - `user.creemCustomerId` 关联客户信息
   - `creditsHistory` 记录使用情况

3. **🔐 使用限制策略**
   ```typescript
   // 基于用户状态的限制逻辑
   if (!session) {
     // 匿名用户: 每日3次 (IP限制)
   } else if (hasActiveSubscription) {
     // 付费用户: 无限制
   } else {
     // 免费注册用户: 每日10次
   }
   ```

**优势:**
- ✅ **最大隐私保护** - 零数据存储
- ✅ **实现最简单** - 无需额外数据库操作
- ✅ **利用现有系统** - 充分发挥已有基础设施价值
- ✅ **符合MVP理念** - 专注核心功能验证

---

## ⚠️ **重要注意事项**

### **🔒 隐私和安全**
1. **文件不持久化**: 文件仅在内存中处理，完成后立即释放
2. **数据保护**: 符合GDPR要求，用户文件不存储到任何地方
3. **API安全**: 添加速率限制，防止滥用和攻击

### **🏗️ 架构设计**
4. **功能隔离**: 不修改现有 `/api/storage/upload`，使用独立的 `/api/ats/scan`
5. **向后兼容**: 保持现有SaaS基础设施完整性
6. **模块化**: ATS功能独立模块，便于维护和扩展

### **⚡ 性能优化**
7. **内存管理**: 文件大小限制2MB，避免内存溢出
8. **处理超时**: 设置合理的请求超时时间
9. **并发控制**: 考虑高并发场景下的资源使用

### **🌐 用户体验**
10. **错误处理**: 文件损坏、格式不支持等异常的友好提示
11. **加载状态**: 文件解析过程的进度反馈
12. **响应式设计**: 移动端和桌面端的适配

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
