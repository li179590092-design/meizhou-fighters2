# 梅开格斗：开放之战
**Meizhou Open University Fighters** —— 罗一帅 VS 杨二帅，公网联机 H5 格斗游戏

手机微信点开链接即可玩；创建房间后把链接发给好友，对方不在同一 WiFi 也能实时对战。

---

## 一、项目结构

```text
meizhou-fighters/
├── package.json
├── server/
│   └── server.js        # Node.js + Socket.IO 联机服务（房间/转发/开战）
└── public/
    ├── index.html       # 页面与 UI（加载页/菜单/房间/结算/虚拟按键）
    └── game.js          # 格斗引擎 + 网络同步（角色头像已内嵌）
```

---

## 二、本地测试（电脑上先跑通）

需要安装 Node.js 18+（https://nodejs.org 下载安装即可）。

```bash
cd meizhou-fighters
npm install
npm start
```

浏览器打开 http://localhost:3000

本地双开测试联机：开两个浏览器窗口，窗口 A 点「创建微信联机房间」得到房间号，窗口 B 点「加入房间」输入房间号，双方点「准备」即自动开战。

键盘操作：A D 移动 · W 跳 · S 蹲 · 空格闪避 · F 防御 · J 轻拳 K 重拳 U 轻脚 I 重脚 · E 技能1 R 技能2 · O 必杀 P 大招

---

## 三、部署到公网（推荐 Render，免费）

部署后会得到一个 HTTPS 网址，微信里可直接打开和分享。

### 步骤（全程网页操作，约 10 分钟）

1. **把项目传到 GitHub**
   - 注册/登录 https://github.com
   - 新建仓库（New repository），名字随意，例如 `meizhou-fighters`，选 Public
   - 在仓库页面点「uploading an existing file」，把本项目的所有文件/文件夹拖进去上传（注意保持 server/ 和 public/ 目录结构），提交（Commit changes）

2. **在 Render 创建服务**
   - 注册/登录 https://render.com （可直接用 GitHub 账号登录）
   - 点 New → Web Service → 选择刚才的 GitHub 仓库
   - 配置：
     - Runtime: **Node**
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Instance Type: **Free**
   - 点 Create Web Service，等待 1-3 分钟构建完成

3. **拿到网址，开战**
   - 部署完成后页面顶部会显示形如 `https://meizhou-fighters.onrender.com` 的网址
   - 手机微信发送这个网址，点开 → 创建房间 → 点「复制/分享房间链接」发给好友
   - 好友点链接自动进入同一房间，双方准备后开战

> 备选平台：Railway（railway.app）、Zeabur（zeabur.com，对国内访问较友好）、或自有云服务器（`node server/server.js` 配合 Nginx 反代 + HTTPS）。流程类似：连接 GitHub 仓库 → Node 构建 → npm start。

### 免费版注意事项

- Render 免费实例 15 分钟无人访问会休眠，下次打开首屏需等 30-60 秒唤醒，属正常现象。
- 国内访问 onrender.com 速度一般，如群里反映打不开可换 Zeabur 或自有服务器。
- 实时对战对延迟敏感，两边网络都正常时体验流畅；偶发卡顿由免费服务器性能决定。

---

## 四、玩法说明

| 项目 | 说明 |
|---|---|
| 模式 | 公网联机 1v1（房主=罗一帅，加入者=杨二帅）、单人练习（可打 AI） |
| 规则 | 99 秒一局，三局两胜；血量归零判负，时间到血多者胜 |
| 能量 | 攻击命中/受击/格挡积攒；必杀消耗 50，终极大招消耗 100 |
| 防御 | 按住「防」减伤 70% |
| 闪避 | 后撤位移 + 无敌帧，冷却 1.2 秒 |
| 连击 | 3/5/7 连击触发 Good!/Great!/Excellent!，10 连击 Super Combo + 观众欢呼 |

### 角色技能

**罗一帅**（蓝色·电光·知识系）
- 技能1 开放电光拳：电光拳影飞行道具
- 技能2 云端疾步：高速位移 + 蓝色残影 + 无敌帧
- 必杀 知识风暴：身周书页数据流多段 AoE
- 大招 开放之光·雷霆破：镜头特写 → 全屏七道雷柱 →「开放之光，燃战梅州！」

**杨二帅**（红金·烈焰·客家武术系）
- 技能1 客都烈焰拳：火焰拳影飞行道具
- 技能2 围龙旋风腿：旋转突进多段攻击
- 必杀 嘉应赤焰破：连续冲拳 + 终结击飞
- 大招 客都霸拳·赤焰龙魂：镜头特写 → 火龙贯穿全屏 →「客都燃魂，一拳定胜！」

---

## 五、常见问题

**Q：没有声音？**
手机浏览器要求先触摸一次屏幕才允许播放音频；点任意按钮即可，右上角 🔊 可开关。

**Q：提示"联机服务未连接"？**
说明页面是以纯静态方式打开的（如直接双击 HTML 文件或托管在 Netlify 等静态平台）。联机必须通过 `npm start` 的 Node 服务或公网部署版访问。单人练习不受影响。

**Q：对方进不来房间？**
确认对方打开的是你部署后的公网网址（带 ?room=房间号），且服务器没有休眠（先自己打开唤醒它）。

**Q：想改人物名字/台词/伤害数值？**
都在 `public/game.js` 顶部 `CHARS` 数组和 `NORMALS` 表里，改完重新部署即可。
