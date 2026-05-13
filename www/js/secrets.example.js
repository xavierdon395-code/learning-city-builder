// 复制此文件为 js/secrets.local.js，并填入你自己的 API Key
// secrets.local.js 不会被提交到 Git（已在 .gitignore 中排除）
//
// Firebase Realtime Database：统计页「AI 周复盘」会写入 users/{你的uid}/weeklyReports/{周ID}
// 请在 Firebase 控制台为已登录用户配置对该路径的 read/write，否则保存会失败。
window.SECRETS = {
  DEEPSEEK_API_KEY: 'sk-在这里填你自己的 DeepSeek API Key',
};
