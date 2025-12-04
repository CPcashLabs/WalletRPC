
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    "app.title": "ZeroState Hub",
    "nav.workspace": "My Workspace",
    "nav.marketplace": "Plugin Market",
    "nav.guide": "Developer Protocol",
    "section.installed": "Local Modules",
    "user.admin": "Local User",
    "user.plan": "Sovereign Mode",
    "welcome.title": "Welcome to ZeroState Hub",
    "welcome.subtitle": "Your decentralized application runtime. Select an installed module from the sidebar or visit the marketplace to extend your local capabilities.",
    "card.marketplace.title": "Browse Modules",
    "card.marketplace.desc": "Discover and inject new client-side capabilities from the community.",
    "card.guide.title": "Developer Protocol",
    "card.guide.desc": "Learn how to build serverless plugins and deploy to the distributed registry.",
    "marketplace.title": "Plugin Marketplace",
    "marketplace.subtitle": "Decentralized tools running entirely in your browser.",
    "search.placeholder": "Search modules...",
    "btn.install": "Inject",
    "btn.installed": "Active",
    "btn.uninstall": "Eject",
    "btn.launch": "Launch",
    "btn.back_market": "Back to Market",
    "plugin.features": "Key Features",
    "plugin.specs": "Specifications",
    "cat.All": "All",
    "cat.Analysis": "Compute",
    "cat.Visualization": "Render",
    "cat.Utility": "Tools",
    "guide.title": "Build for ZeroState",
    "guide.subtitle": "Create pure frontend modules. Zero backend dependencies. Zero data collection. Pure execution.",
    "guide.step1.title": "Frontend Logic",
    "guide.step1.desc": "Develop standard React components. All logic must run client-side or connect directly to public APIs/RPCs.",
    "guide.step2.title": "Stateless Design",
    "guide.step2.desc": "Your plugin must not rely on proprietary servers. Use LocalStorage or user-provided keys for persistence.",
    "guide.step3.title": "Deploy Manifest",
    "guide.step3.desc": "Publish your code to any public repo. The Hub loads it dynamically at runtime.",
    "guide.template.title": "Module Template",
    "guide.prompt.title": "AI Generation Prompt",
    "guide.prompt.desc": "Use this system instruction to generate ZeroState-compatible modules.",
    "guide.why.title": "Architecture",
    "guide.why.desc": "ZeroState uses dynamic imports to inject code directly into the browser's memory. This ensures the user retains absolute control over the execution environment.",
    "lang.switch": "Switch to Chinese",
    "no.apps": "No modules active.\nVisit Marketplace.",
    "loading": "Initializing Runtime...",
    "footer.rights": "© 2025 ZeroState Hub. Decentralized Network.",
    
    // Wallet
    "wallet.title": "Nexus Vault",
    "wallet.personal": "Personal Key",
    "wallet.safe": "Safe Multisig",
    "wallet.create_safe": "Deploy Safe",
    "wallet.track_safe": "Watch Safe",
    "wallet.owners": "Signers",
    "wallet.threshold": "Threshold",
    "wallet.deploy": "Deploy Contract",

    // Landing Page
    "landing.nav.genesis": "ORIGIN",
    "landing.nav.directives": "PROTOCOLS",
    "landing.nav.arch": "KERNEL",
    "landing.nav.app": "INITIALIZE",
    
    "landing.hero.tag": "STATUS // DECENTRALIZED",
    "landing.hero.title_prefix": "YOUR DEVICE",
    "landing.hero.title_suffix": "YOUR INFRASTRUCTURE",
    "landing.hero.subtitle": "The first decentralized plugin marketplace. Run advanced tools locally. No servers. No data collection. Just pure, sovereign code.",
    "landing.hero.btn_launch": "LAUNCH RUNTIME",
    "landing.hero.btn_doc": "VIEW SPECS",

    "landing.genesis.title": "ZERO SERVER STATE",
    "landing.genesis.subtitle": "The Edge Computing Revolution",
    "landing.genesis.desc": "The centralized web is obsolete. ZeroState Hub moves the entire application stack to your browser. We provide the marketplace; you own the compute. No data ever leaves your local environment.",
    
    "landing.goals.title": "CORE DIRECTIVES",
    "landing.goals.subtitle": "Operating Parameters",
    "landing.goals.low_cost": "Local Compute",
    "landing.goals.low_cost_desc": "Leverage your own CPU/GPU via WebAssembly. Eliminate SaaS fees and server costs entirely.",
    "landing.goals.privacy": "Zero Knowledge",
    "landing.goals.privacy_desc": "Total privacy by design. Code executes in your browser's sandbox. No backend logs, no tracking, no surveillance.",
    "landing.goals.access": "Permissionless",
    "landing.goals.access_desc": "A true open market. Anyone can publish plugins. Anyone can execute them. Censorship-resistant architecture.",

    "landing.arch.title": "SYSTEM KERNEL",
    "landing.arch.subtitle": "Technical Stack",
    "landing.arch.stack": "STACK: REACT // WASM // P2P // RPC",
    "landing.arch.card1.title": "Dynamic Injection",
    "landing.arch.card1.desc": "Modules are fetched and compiled in real-time within the client memory.",
    "landing.arch.card2.title": "Direct RPC",
    "landing.arch.card2.desc": "Connect directly to Blockchains and Decentralized Nodes without middleware.",
    "landing.arch.card3.title": "Edge AI",
    "landing.arch.card3.desc": "Orchestrate local LLMs or connect to private API keys for hybrid intelligence.",
    "landing.arch.card4.title": "Open Source",
    "landing.arch.card4.desc": "Auditable code. The entire runtime environment is transparent and community-governed.",

    "landing.cta.title": "GO DARK. GO LOCAL.",
    "landing.cta.desc": "Disconnect from the cloud. Initialize your sovereign workspace.",
    "landing.cta.btn": "ENTER HUB",
    "landing.footer.shutdown": "terminate_session"
  },
  zh: {
    "app.title": "ZeroState Hub",
    "nav.workspace": "我的工作台",
    "nav.marketplace": "插件市场",
    "nav.guide": "开发者协议",
    "section.installed": "本地模块",
    "user.admin": "本地用户",
    "user.plan": "主权模式",
    "welcome.title": "欢迎来到 ZeroState Hub",
    "welcome.subtitle": "您的去中心化应用运行时。从侧边栏选择已安装的模块，或访问市场以扩展您的本地能力。",
    "card.marketplace.title": "浏览模块",
    "card.marketplace.desc": "发现并注入来自社区的客户端能力。",
    "card.guide.title": "开发者协议",
    "card.guide.desc": "学习如何构建无服务器插件并部署到分布式注册表。",
    "marketplace.title": "插件市场",
    "marketplace.subtitle": "完全在浏览器中运行的去中心化工具。",
    "search.placeholder": "搜索模块...",
    "btn.install": "注入",
    "btn.installed": "已激活",
    "btn.uninstall": "弹出",
    "btn.launch": "启动",
    "btn.back_market": "返回市场",
    "plugin.features": "核心功能",
    "plugin.specs": "技术规格",
    "cat.All": "全部",
    "cat.Analysis": "计算",
    "cat.Visualization": "渲染",
    "cat.Utility": "工具",
    "guide.title": "构建 ZeroState 应用",
    "guide.subtitle": "创建纯前端模块。零后端依赖。零数据收集。纯粹的代码执行。",
    "guide.step1.title": "前端逻辑",
    "guide.step1.desc": "开发标准的 React 组件。所有逻辑必须在客户端运行，或直接连接到公共 API/RPC。",
    "guide.step2.title": "无状态设计",
    "guide.step2.desc": "您的插件不得依赖专有服务器。使用 LocalStorage 或用户提供的密钥进行持久化。",
    "guide.step3.title": "部署清单",
    "guide.step3.desc": "将代码发布到任何公共代码库。Hub 会在运行时动态加载它。",
    "guide.template.title": "模块模版",
    "guide.prompt.title": "AI 生成提示词",
    "guide.prompt.desc": "使用此系统指令生成兼容 ZeroState 的模块。",
    "guide.why.title": "架构说明",
    "guide.why.desc": "ZeroState 使用动态导入将代码直接注入浏览器内存。这确保用户对执行环境拥有绝对控制权。",
    "lang.switch": "切换到英文",
    "no.apps": "无活动模块。\n请访问市场。",
    "loading": "正在初始化运行时...",
    "footer.rights": "© 2025 ZeroState Hub. 去中心化网络。",
    
    // Wallet
    "wallet.title": "Nexus 金库",
    "wallet.personal": "个人私钥",
    "wallet.safe": "Safe 多签",
    "wallet.create_safe": "部署 Safe",
    "wallet.track_safe": "追踪 Safe",
    "wallet.owners": "签名者",
    "wallet.threshold": "门槛",
    "wallet.deploy": "部署合约",

    // Landing Page
    "landing.nav.genesis": "起源",
    "landing.nav.directives": "协议",
    "landing.nav.arch": "内核",
    "landing.nav.app": "初始化",
    
    "landing.hero.tag": "状态 // 去中心化",
    "landing.hero.title_prefix": "您的设备",
    "landing.hero.title_suffix": "即是基础设施",
    "landing.hero.subtitle": "首个去中心化插件市场。在本地运行高级工具。无服务器。无数据收集。唯有纯粹的主权代码。",
    "landing.hero.btn_launch": "启动运行时",
    "landing.hero.btn_doc": "查看规范",

    "landing.genesis.title": "零态服务器",
    "landing.genesis.subtitle": "边缘计算革命",
    "landing.genesis.desc": "中心化网络已成过去。ZeroState Hub 将整个应用栈迁移至您的浏览器。我们提供市场；您拥有算力。没有任何数据会离开您的本地环境。",
    
    "landing.goals.title": "核心指令",
    "landing.goals.subtitle": "运行参数",
    "landing.goals.low_cost": "本地算力",
    "landing.goals.low_cost_desc": "通过 WebAssembly 利用您自己的 CPU/GPU。彻底消除 SaaS 费用和服务器成本。",
    "landing.goals.privacy": "零知识",
    "landing.goals.privacy_desc": "设计层面的绝对隐私。代码在浏览器的沙盒中执行。没有后端日志，没有追踪，没有监控。",
    "landing.goals.access": "无许可",
    "landing.goals.access_desc": "真正的开放市场。任何人都可以发布插件。任何人都可以执行它们。抗审查架构。",

    "landing.arch.title": "系统内核",
    "landing.arch.subtitle": "技术栈",
    "landing.arch.stack": "栈: REACT // WASM // P2P // RPC",
    "landing.arch.card1.title": "动态注入",
    "landing.arch.card1.desc": "模块在客户端内存中实时获取并编译。",
    "landing.arch.card2.title": "直接 RPC",
    "landing.arch.card2.desc": "无需中间件，直接连接到区块链和去中心化节点。",
    "landing.arch.card3.title": "边缘 AI",
    "landing.arch.card3.desc": "编排本地大语言模型或连接到私有 API 密钥以实现混合智能。",
    "landing.arch.card4.title": "开源",
    "landing.arch.card4.desc": "代码可审计。整个运行时环境透明且由社区治理。",
    
    "landing.cta.title": "隐入黑暗。回归本地。",
    "landing.cta.desc": "断开云端连接。初始化您的主权工作空间。",
    "landing.cta.btn": "进入枢纽",
    "landing.footer.shutdown": "terminate_session"
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('zerostate_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('zerostate_lang', lang);
  };

  const t = (key: string) => {
    return TRANSLATIONS[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
