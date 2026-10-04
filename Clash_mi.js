function main(config) {

  // ================================================================
  // Clash Mi / Mihomo 完美规则 v1.8
  // （基于原 Perfect-Rules 架构 + mihomo.yaml 策略组/节点组整合）
  //
  // 架构说明：
  //
  //   机场订阅（只取节点，不保留机场原有策略组）
  //          ↓
  //   动态地区节点组（手动选择 / 故障转移 / 自动测速）
  //          ↓
  //   业务策略组（YouTube / Google / ChatGPT 等）
  //          ↓
  //   远程规则集（MetaCubeX + 自定义）
  //
  // JS 负责：配置架构与分组生成
  // 规则集负责：实际分流匹配
  //
  // ================================================================


  // ================================================================
  // 1. 基础配置（优先采用 yaml 风格，兼顾可用性）
  // ================================================================

  config["mixed-port"] = 7890;
  config["mode"] = "rule";
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["log-level"] = "warning";
  config["ipv6"] = true;
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  config["find-process-mode"] = "always";
  config["keep-alive-interval"] = 15;
  config["keep-alive-idle"] = 600;
  config["disable-keep-alive"] = false;
  config["global-client-fingerprint"] = "safari";


  // ================================================================
  // 2. Profile
  // ================================================================

  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true
  };


  // ================================================================
  // 3. 外部控制器与面板（来自 yaml）
  // ================================================================

  config["external-controller"] = "0.0.0.0:9090";
  config["secret"] = "";
  config["external-ui"] = "ui";
  config["external-ui-name"] = "zashboard";
  config["external-ui-url"] =
    "https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages.zip";


  // ================================================================
  // 4. DNS（防泄露风格，参考 yaml）
  // ================================================================

  config["dns"] = {
    "enable": true,
    "cache-algorithm": "arc",
    "listen": "0.0.0.0:7874",
    "ipv6": true,
    "respect-rules": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": [
      "*.lan",
      "*.local",
      "rule-set:fakeipfilter_domain",
      "rule-set:cn_domain",
      "rule-set:directlite"
    ],
    "default-nameserver": [
      "114.114.114.114",
      "119.29.29.29"
    ],
    "nameserver": [
      "https://223.5.5.5/dns-query",
      "https://120.53.53.53/dns-query"
    ],
    "proxy-server-nameserver": [
      "https://223.5.5.5/dns-query",
      "https://120.53.53.53/dns-query"
    ]
  };


  // ================================================================
  // 5. TUN
  //     已删除：Clash Mi 的 TUN 由客户端控制，脚本写入易被覆盖且易冲突
  // ================================================================


  // ================================================================
  // 6. 嗅探器
  // ================================================================

  config["sniffer"] = {
    "enable": true,
    "parse-pure-ip": true,
    "force-dns-mapping": true,
    "override-destination": true,
    "sniff": {
      "HTTP": {
        "ports": [80, "8080-8880"]
      },
      "TLS": {
        "ports": [443, 8443]
      },
      "QUIC": {
        "ports": [443, 8443]
      }
    },
    "skip-domain": [
      "+.push.apple.com",
      "+.mijia.cloud"
    ]
  };


  // ================================================================
  // 7. NTP
  // ================================================================

  config["ntp"] = {
    "enable": true,
    "write-to-system": false,
    "server": "time.apple.com",
    "port": 123,
    "interval": 30
  };


  // ================================================================
  // 8. 原始机场节点
  // ================================================================

  var originalProxies = Array.isArray(config["proxies"])
    ? config["proxies"]
    : [];

  var proxyNames = [];

  originalProxies.forEach(function (proxy) {
    if (proxy && proxy.name) {
      proxyNames.push(proxy.name);
    }
  });


  // ================================================================
  // 9. 确保存在「直连」节点
  // ================================================================

  var hasDirect = originalProxies.some(function (p) {
    return p && (p.name === "直连" || p.name === "DIRECT");
  });

  if (!hasDirect) {
    if (!Array.isArray(config["proxies"])) {
      config["proxies"] = [];
    }
    config["proxies"].push({
      name: "直连",
      type: "direct"
    });
  }


  // ================================================================
  // 10. 原始机场策略组
  // ================================================================

  var originalGroups = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"]
    : [];


  // ================================================================
  // 11. 图标 CDN（保留 Perfect-Rules 图标）
  // ================================================================

  var iconBaseURL =
    "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/icons/";

  var groupIcons = {
    "🚀 默认代理": "Proxy.png",
    "直连": "China.png",
    "🤖 ChatGPT": "AI.png",
    "📹 YouTube": "YouTube.png",
    "🍀 Google": "Google.png",
    "👨🏻‍💻 GitHub": "GitHub.png",
    "🎥 NETFLIX": "Netflix.png",
    "🎵 TikTok": "TikTok.png",
    "📲 Telegram": "Telegram.png",
    "🇭🇰 香港节点": "Hong_Kong.png",
    "🇹🇼 台湾节点": "Taiwan.png",
    "🇯🇵 日本节点": "Japan.png",
    "🇸🇬 狮城节点": "Singapore.png",
    "🇰🇷 韩国节点": "Korea.png",
    "🇺🇸 美国节点": "United_States.png",
    "🇨🇦 加拿大节点": "Other.png",
    "🇬🇧 英国节点": "Other.png",
    "🇩🇪 德国节点": "Other.png",
    "🇫🇷 法国节点": "Other.png",
    "🇳🇱 荷兰节点": "Other.png",
    "🇦🇺 澳大利亚节点": "Other.png"
  };

  function getGroupIcon(name) {
    if (!groupIcons[name]) {
      return undefined;
    }
    return iconBaseURL + groupIcons[name];
  }


  // ================================================================
  // 12. 业务组名称识别（用于保留机场基础组时过滤）
  // ================================================================

  function isBusinessGroupName(name) {
    if (!name) {
      return false;
    }
    var text = String(name);
    var patterns = [
      /ai/i, /openai/i, /chatgpt/i, /claude/i, /gemini/i,
      /netflix/i, /disney/i, /youtube/i, /google/i, /github/i,
      /spotify/i, /steam/i, /tiktok/i, /telegram/i, /twitter/i,
      /x\.com/i, /facebook/i, /instagram/i, /paypal/i, /onedrive/i,
      /流媒体/i, /媒体/i, /影音/i, /视频/i, /游戏/i,
      /游戏专用/i, /机场专用/i, /节点分流/i, /默认代理/i,
      /漏网之鱼/i, /自动选择/i, /手动节点/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].test(text)) {
        return true;
      }
    }
    return false;
  }


  // ================================================================
  // 13. 自动选择 / 故障转移 / 全部节点 识别
  // ================================================================

  function isAutoSelectGroup(name) {
    if (!name) return false;
    return (
      /自动选择/i.test(name) ||
      /auto[\s_-]*select/i.test(name) ||
      /auto[\s_-]*test/i.test(name) ||
      /测速/i.test(name)
    );
  }

  function isFailoverGroup(name) {
    if (!name) return false;
    return (
      /故障转移/i.test(name) ||
      /failover/i.test(name) ||
      /fallback/i.test(name) ||
      /故转/i.test(name)
    );
  }

  function isAllNodeName(name) {
    if (!name) return false;
    return (
      /全部节点/i.test(name) ||
      /所有节点/i.test(name) ||
      /全部/i.test(name) ||
      /all[\s_-]*nodes?/i.test(name) ||
      /all[\s_-]*proxies?/i.test(name) ||
      /手动节点/i.test(name)
    );
  }


  // ================================================================
  // 14. 分组组成分析（用于判断是否为「全部节点」组）
  // ================================================================

  var builtinTargets = {
    "DIRECT": true,
    "REJECT": true,
    "REJECT-DROP": true,
    "PASS": true,
    "COMPATIBLE": true,
    "GLOBAL": true,
    "直连": true
  };

  function getProxyComposition(group) {
    var result = {
      total: 0,
      actualNodes: 0,
      groups: 0,
      builtin: 0,
      unknown: 0
    };
    if (!group || !Array.isArray(group.proxies)) {
      return result;
    }
    result.total = group.proxies.length;
    group.proxies.forEach(function (item) {
      if (!item) return;
      if (proxyNames.indexOf(item) !== -1) {
        result.actualNodes++;
        return;
      }
      if (builtinTargets[item]) {
        result.builtin++;
        return;
      }
      var referencedGroup = originalGroups.some(function (g) {
        return g && g.name === item;
      });
      if (referencedGroup) {
        result.groups++;
        return;
      }
      result.unknown++;
    });
    return result;
  }

  function isAllNodesGroup(group) {
    if (!group || !group.name) return false;
    var name = String(group.name);
    if (isAllNodeName(name)) return true;
    if (isBusinessGroupName(name)) return false;
    var composition = getProxyComposition(group);
    if (composition.total === 0) return false;
    if (composition.actualNodes < 2) return false;
    var ratio = composition.actualNodes / composition.total;
    if (ratio < 0.3) return false;
    if (composition.groups > 0) {
      return composition.actualNodes >= 5;
    }
    return true;
  }


  // ================================================================
  // 15. 不保留机场原有策略组
  //     只使用本脚本生成的业务组 + 地区组 + 自动/故障转移组
  // ================================================================


  // ================================================================
  // 17. 地区过滤正则（来自 yaml，可按节点命名习惯自行调整）
  // ================================================================

  var regionFilters = {
    "🇭🇰 香港节点": "(?i)(香港|HK|HKG|Hong.?Kong|HongKong)",
    "🇯🇵 日本节点": "(?i)(日本|JP|JPN|Japan|Tokyo|Osaka|NRT|KIX|HND|Nagoya|Fukuoka)",
    "🇸🇬 狮城节点": "(?i)(新加坡|狮城|SG|SGP|Singapore|SIN)",
    "🇺🇸 美国节点": "(?i)(美国|USA|United.?States|America|US-|US[0-9]|Los.?Angeles|LA|LAX|San.?Jose|SJC|Seattle|SEA|Dallas|DFW|Chicago|ORD|New.?York|JFK|Miami|MIA)",
    "🇹🇼 台湾节点": "(?i)(台湾|TW|TWN|Taiwan|Taipei|TPE|Kaohsiung|KHH)",
    "🇰🇷 韩国节点": "(?i)(韩国|KR|KOR|Korea|Seoul|首尔|ICN|Busan)",
    "🇬🇧 英国节点": "(?i)(英国|UK|GB|GBR|United.?Kingdom|Britain|London|LHR|Manchester)",
    "🇩🇪 德国节点": "(?i)(德国|DEU|Germany|Deutschland|Frankfurt|FRA|Berlin|BER|Munich)",
    "🇫🇷 法国节点": "(?i)(法国|France|Paris|CDG|Marseille)",
    "🇳🇱 荷兰节点": "(?i)(荷兰|Netherlands|Holland|Amsterdam|AMS)",
    "🇨🇦 加拿大节点": "(?i)(加拿大|Canada|Toronto|YYZ|Vancouver|YVR|Montreal)",
    "🇦🇺 澳大利亚节点": "(?i)(澳大利亚|Australia|Sydney|SYD|Melbourne|MEL|Perth)"
  };

  // 故障转移 / 自动测速 对应名称
  var fallbackNames = {
    "🇭🇰 香港节点": "🔯 香港故转",
    "🇯🇵 日本节点": "🔯 日本故转",
    "🇸🇬 狮城节点": "🔯 狮城故转",
    "🇺🇸 美国节点": "🔯 美国故转",
    "🇹🇼 台湾节点": "🔯 台湾故转",
    "🇰🇷 韩国节点": "🔯 韩国故转",
    "🇬🇧 英国节点": "🔯 英国故转",
    "🇩🇪 德国节点": "🔯 德国故转",
    "🇫🇷 法国节点": "🔯 法国故转",
    "🇳🇱 荷兰节点": "🔯 荷兰故转",
    "🇨🇦 加拿大节点": "🔯 加拿大故转",
    "🇦🇺 澳大利亚节点": "🔯 澳大利亚故转"
  };

  var autoNames = {
    "🇭🇰 香港节点": "♻️ 香港自动",
    "🇯🇵 日本节点": "♻️ 日本自动",
    "🇸🇬 狮城节点": "♻️ 新加坡自动",
    "🇺🇸 美国节点": "♻️ 美国自动",
    "🇹🇼 台湾节点": "♻️ 台湾自动",
    "🇰🇷 韩国节点": "♻️ 韩国自动",
    "🇬🇧 英国节点": "♻️ 英国自动",
    "🇩🇪 德国节点": "♻️ 德国自动",
    "🇫🇷 法国节点": "♻️ 法国自动",
    "🇳🇱 荷兰节点": "♻️ 荷兰自动",
    "🇨🇦 加拿大节点": "♻️ 加拿大自动",
    "🇦🇺 澳大利亚节点": "♻️ 澳大利亚自动"
  };

  var regionOrder = [
    "🇭🇰 香港节点",
    "🇯🇵 日本节点",
    "🇸🇬 狮城节点",
    "🇺🇸 美国节点",
    "🇹🇼 台湾节点",
    "🇰🇷 韩国节点",
    "🇬🇧 英国节点",
    "🇩🇪 德国节点",
    "🇫🇷 法国节点",
    "🇳🇱 荷兰节点",
    "🇨🇦 加拿大节点",
    "🇦🇺 澳大利亚节点"
  ];


  // ================================================================
  // 18. 生成地区手动节点组（select + include-all + filter）
  // ================================================================

  var regionSelectGroups = [];
  regionOrder.forEach(function (name) {
    var group = {
      name: name,
      type: "select",
      "include-all": true,
      filter: regionFilters[name]
    };
    var icon = getGroupIcon(name);
    if (icon) group.icon = icon;
    regionSelectGroups.push(group);
  });


  // ================================================================
  // 19. 生成地区故障转移组（fallback）
  // ================================================================

  var regionFallbackGroups = [];
  regionOrder.forEach(function (name) {
    var group = {
      name: fallbackNames[name],
      type: "fallback",
      "include-all": true,
      interval: 180,
      filter: regionFilters[name]
    };
    regionFallbackGroups.push(group);
  });


  // ================================================================
  // 20. 生成地区自动测速组（url-test）
  // ================================================================

  var regionAutoGroups = [];
  regionOrder.forEach(function (name) {
    var group = {
      name: autoNames[name],
      type: "url-test",
      "include-all": true,
      tolerance: 50,
      interval: 300,
      filter: regionFilters[name]
    };
    regionAutoGroups.push(group);
  });


  // ================================================================
  // 21. 全部节点 / 自动选择 / 手动节点
  // ================================================================

  var allAutoGroup = {
    name: "♻️ 自动选择",
    type: "url-test",
    "include-all": true,
    tolerance: 50,
    interval: 300,
    filter: "^((?!(直连|DIRECT|REJECT)).)*$"
  };

  var manualAllGroup = {
    name: "🌐 手动节点",
    type: "select",
    "include-all": true
  };


  // ================================================================
  // 22. 公共代理列表（业务组可复用）
  // ================================================================

  // 故障转移列表
  var fallbackList = regionOrder.map(function (n) {
    return fallbackNames[n];
  });

  // 自动测速列表
  var autoList = regionOrder.map(function (n) {
    return autoNames[n];
  });

  // 手动地区列表
  var selectList = regionOrder.slice();

  // 完整可选列表（默认代理等使用）
  var fullProxyList = ["♻️ 自动选择"]
    .concat(fallbackList)
    .concat(autoList)
    .concat(selectList)
    .concat(["🌐 手动节点", "直连"]);


  // ================================================================
  // 23. 业务策略组（直接采用 yaml 命名与排序思路）
  // ================================================================

  function createBusinessGroup(name, preferList) {
    var list = preferList || fullProxyList;
    var group = {
      name: name,
      type: "select",
      proxies: list.slice()
    };
    var icon = getGroupIcon(name);
    if (icon) group.icon = icon;
    return group;
  }

  // 默认代理
  var defaultProxyGroup = createBusinessGroup(
    "🚀 默认代理",
    fullProxyList
  );

  // YouTube
  var youtubeGroup = createBusinessGroup(
    "📹 YouTube",
    ["🚀 默认代理"].concat(fullProxyList)
  );

  // Google
  var googleGroup = createBusinessGroup(
    "🍀 Google",
    ["🚀 默认代理"].concat(fullProxyList)
  );

  // ChatGPT / AI（优先日本/狮城/美国等）
  var chatgptPrefer = [
    "🚀 默认代理",
    "♻️ 自动选择",
    "🔯 日本故转",
    "🔯 狮城故转",
    "🔯 美国故转",
    "🔯 台湾故转",
    "🔯 韩国故转",
    "🔯 英国故转",
    "🔯 德国故转",
    "🔯 法国故转",
    "🔯 荷兰故转",
    "🔯 加拿大故转",
    "🔯 澳大利亚故转"
  ].concat(autoList).concat(selectList).concat(["🌐 手动节点", "直连"]);

  var chatgptGroup = createBusinessGroup("🤖 ChatGPT", chatgptPrefer);

  // GitHub
  var githubGroup = createBusinessGroup(
    "👨🏻‍💻 GitHub",
    ["🚀 默认代理"].concat(fullProxyList)
  );

  // OneDrive
  var onedrivePrefer = [
    "🚀 默认代理",
    "♻️ 自动选择",
    "🔯 日本故转",
    "🔯 狮城故转",
    "🔯 美国故转",
    "🔯 台湾故转",
    "🔯 韩国故转",
    "🔯 英国故转",
    "🔯 德国故转",
    "🔯 法国故转",
    "🔯 荷兰故转",
    "🔯 加拿大故转",
    "🔯 澳大利亚故转"
  ].concat(autoList).concat(selectList).concat(["🌐 手动节点", "直连"]);

  var onedriveGroup = createBusinessGroup("🐬 OneDrive", onedrivePrefer);

  // TikTok
  var tiktokPrefer = [
    "🚀 默认代理",
    "♻️ 自动选择",
    "🔯 日本故转",
    "🔯 狮城故转",
    "🔯 美国故转",
    "🔯 台湾故转",
    "🔯 韩国故转",
    "🔯 英国故转",
    "🔯 德国故转",
    "🔯 法国故转",
    "🔯 荷兰故转",
    "🔯 加拿大故转",
    "🔯 澳大利亚故转"
  ].concat(autoList).concat(selectList).concat(["🌐 手动节点", "直连"]);

  var tiktokGroup = createBusinessGroup("🎵 TikTok", tiktokPrefer);

  // Telegram
  var telegramGroup = createBusinessGroup(
    "📲 Telegram",
    ["🚀 默认代理"].concat(fullProxyList)
  );

  // Netflix（优先狮城）
  var netflixPrefer = [
    "🚀 默认代理",
    "♻️ 自动选择",
    "🔯 狮城故转",
    "🔯 香港故转",
    "🔯 日本故转",
    "🔯 美国故转",
    "🔯 台湾故转",
    "🔯 韩国故转",
    "🔯 英国故转",
    "🔯 德国故转",
    "🔯 法国故转",
    "🔯 荷兰故转",
    "🔯 加拿大故转",
    "🔯 澳大利亚故转"
  ].concat(autoList).concat(selectList).concat(["🌐 手动节点", "直连"]);

  var netflixGroup = createBusinessGroup("🎥 NETFLIX", netflixPrefer);

  // PayPal
  var paypalPrefer = [
    "🚀 默认代理",
    "♻️ 自动选择",
    "🔯 日本故转",
    "🔯 香港故转",
    "🔯 狮城故转",
    "🔯 美国故转",
    "🔯 台湾故转",
    "🔯 韩国故转",
    "🔯 英国故转",
    "🔯 德国故转",
    "🔯 法国故转",
    "🔯 荷兰故转",
    "🔯 加拿大故转",
    "🔯 澳大利亚故转"
  ].concat(autoList).concat(selectList).concat(["🌐 手动节点", "直连"]);

  var paypalGroup = createBusinessGroup("💶 PayPal", paypalPrefer);

  // 漏网之鱼
  var finalGroup = createBusinessGroup(
    "🐟 漏网之鱼",
    ["🚀 默认代理"]
      .concat(fallbackList)
      .concat(autoList)
      .concat(["♻️ 自动选择"])
      .concat(selectList)
      .concat(["🌐 手动节点", "直连"])
  );

  var businessGroups = [
    defaultProxyGroup,
    youtubeGroup,
    googleGroup,
    chatgptGroup,
    githubGroup,
    onedriveGroup,
    tiktokGroup,
    telegramGroup,
    netflixGroup,
    paypalGroup,
    finalGroup
  ];


  // ================================================================
  // 24. 最终 proxy-groups 顺序
  //     业务组 → 手动地区 → 故障转移 → 自动测速 → 全部
  //     （不保留机场原有策略组）
  // ================================================================

  var rawGroups = businessGroups
    .concat(regionSelectGroups)
    .concat(regionFallbackGroups)
    .concat(regionAutoGroups)
    .concat([allAutoGroup, manualAllGroup]);

  // 按名称去重，杜绝 duplicate group name
  var seenNames = {};
  var finalGroups = [];
  rawGroups.forEach(function (g) {
    if (!g || !g.name) return;
    if (seenNames[g.name]) return;
    seenNames[g.name] = true;
    finalGroups.push(g);
  });

  config["proxy-groups"] = finalGroups;


  // ================================================================
  // 25. 规则集（来自 yaml，已展开锚点）
  // ================================================================

  config["rule-providers"] = {
    "fakeipfilter_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs"
    },
    "private_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs"
    },
    "proxylite": {
      type: "http",
      interval: 10800,
      behavior: "classical",
      format: "text",
      url: "https://raw.githubusercontent.com/jhbook/meta-rules/refs/heads/main/proxy.list"
    },
    "directlite": {
      type: "http",
      interval: 10800,
      behavior: "classical",
      format: "text",
      url: "https://raw.githubusercontent.com/jhbook/meta-rules/refs/heads/main/direct.list"
    },
    "ai": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs"
    },
    "youtube_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs"
    },
    "google_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs"
    },
    "github_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs"
    },
    "telegram_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs"
    },
    "netflix_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs"
    },
    "paypal_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs"
    },
    "onedrive_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs"
    },
    "microsoft_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs"
    },
    "apple_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs"
    },
    "speedtest_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ookla-speedtest.mrs"
    },
    "tiktok_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs"
    },
    "geolocation-!cn": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs"
    },
    "cn_domain": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs"
    },
    "steam_cn": {
      type: "http",
      interval: 10800,
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/steam@cn.mrs"
    },
    "private_ip": {
      type: "http",
      interval: 10800,
      behavior: "ipcidr",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs"
    },
    "cn_ip": {
      type: "http",
      interval: 10800,
      behavior: "ipcidr",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs"
    }
  };


  // ================================================================
  // 26. 分流规则（与 yaml 顺序保持一致）
  // ================================================================

  config["rules"] = [
    "RULE-SET,private_ip,直连,no-resolve",
    "RULE-SET,private_domain,直连",
    "RULE-SET,directlite,直连",
    "RULE-SET,proxylite,🚀 默认代理",
    "RULE-SET,steam_cn,直连",
    "RULE-SET,ai,🤖 ChatGPT",
    "RULE-SET,github_domain,👨🏻‍💻 GitHub",
    "RULE-SET,onedrive_domain,🐬 OneDrive",
    "RULE-SET,microsoft_domain,直连",
    "RULE-SET,apple_domain,直连",
    "RULE-SET,youtube_domain,📹 YouTube",
    "RULE-SET,speedtest_domain,直连",
    "RULE-SET,google_domain,🍀 Google",
    "RULE-SET,netflix_domain,🎥 NETFLIX",
    "RULE-SET,tiktok_domain,🎵 TikTok",
    "RULE-SET,paypal_domain,💶 PayPal",
    "RULE-SET,telegram_domain,📲 Telegram",
    "RULE-SET,cn_domain,直连",
    "RULE-SET,cn_ip,直连,no-resolve",
    "RULE-SET,geolocation-!cn,🚀 默认代理",
    "MATCH,🐟 漏网之鱼"
  ];


  // ================================================================
  // 27. 返回最终配置
  // ================================================================

  return config;
}