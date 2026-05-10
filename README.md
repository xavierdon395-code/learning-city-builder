---

# 学习城市建设者 ✨

> AI-powered learning planner with constellation-themed achievements

将抽象的学习目标拆解为可执行的每日任务，配合星座成就系统让坚持变得可视化。

🔗 **[在线体验 Live Demo](https://xavierdon395-code.github.io/learning-city-builder/)**

## ✨ 核心功能

- 🤖 **AI 智能拆解** —— 调用 DeepSeek V3 API 生成学习大纲，配合 7 天滚动窗口算法动态调整任务难度
- 🌟 **12 星座成就星图** —— 50 个徽章 / 158 颗星，按白羊到双鱼顺序逐一点亮你的学习轨迹
- 📊 **灵活时间管理** —— 支持统一/分天模式，请假暂停超 20% 不计成就
- 🏆 **多维度统计** —— 任务完成率、连续打卡、月度报告、AI 周复盘
- ☁️ **云端同步** —— Firebase Realtime Database 实时同步，多设备无缝切换
- 🎨 **深空星座主题** —— 极简毛玻璃 UI，金色 + 黑白灰阶克制配色

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vanilla HTML / CSS / JavaScript（无构建工具） |
| 认证 | Firebase Authentication（手机号 + 邮箱） |
| 数据 | Firebase Realtime Database |
| AI | DeepSeek V3 API（chat completion） |
| 部署 | GitHub Pages + Vercel |

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/xavierdon395-code/learning-city-builder.git
cd learning-city-builder

# 配置 API Key
cp js/secrets.example.js js/secrets.local.js
# 编辑 js/secrets.local.js，填入你自己的 DeepSeek API Key

# 启动本地服务器
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 📂 项目结构

```
learning-city-builder/
├── index.html              # 登录页
├── app/                    # 应用主页面
│   ├── index.html          # 首页（今日任务 + 目标列表）
│   ├── create-goal.html    # 创建目标
│   ├── goal-detail.html    # 目标详情 + 任务编辑
│   ├── goals.html          # 目标列表
│   ├── tasks.html          # 任务打卡
│   ├── city.html           # 星座成就殿堂
│   └── stats.html          # 统计 + 个人档案
├── css/
│   ├── theme.css           # 全局设计令牌
│   ├── login.css           # 登录页样式
│   ├── app.css             # 应用样式
│   └── dev-panel.css       # 开发者面板
└── js/
    ├── firebase-config.js  # Firebase 配置
    ├── login.js            # 登录逻辑
    ├── home.js             # 首页
    ├── create-goal.js      # 创建目标
    ├── rolling-plan.js     # 7 天滚动窗口算法 (核心)
    ├── achievements.js     # 50 个成就系统
    ├── goal-detail.js      # 目标详情 + 批量编辑
    └── secrets.example.js  # API Key 配置示例
```

## 💡 设计亮点

### AI 生成架构：大纲 + 滚动窗口

放弃一次性生成长期任务（token 爆炸），改为：

- 创建时生成大纲 + 首 7 天详细任务
- 用户打卡时检测：剩余天数 ≤ 2 天 → 自动后台生成下 7 天
- 根据最近完成率动态调整难度（≥90% 提升 / <50% 降低 30-40%）

### 智能 Prompt 分类

按目标类型自动选择规划角色：语言学习用艾宾浩斯遗忘曲线，编程用刻意练习，应试用三轮复习法...

### 158 颗星点亮十二星座

每解锁 1 个成就点亮 1 颗星，按白羊→双鱼顺序逐星座完成。完整连线后解锁年度纪念徽章。

## 📝 License

MIT

## 👤 Author

**xavierdon395-code** · 延边大学日语 + 计算机辅修

独立开发 / 设计 / 实现 — 2026

---
