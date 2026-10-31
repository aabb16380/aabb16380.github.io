# zhoujin.site — 关于宙金的档案（GitHub Pages）

一个**零依赖纯静态**站点：没有框架、没有构建步骤，把文件放上去就能跑。
内容设定为**一位虚构数学天才「宙金」的致敬站**——首屏、文章、经历全部是第三人称的夸赞式叙述。
域名 `zhoujin.site` 直接指向 GitHub Pages，并启用免费 HTTPS。

- 站点：<https://zhoujin.site>
- 仓库：`aabb16380/aabb16380.github.io`
- 技术：HTML + CSS + 原生 JS（约 250 KB，主要是背景图，无第三方请求）

---

## 一、文件结构

```
zhoujin-site/
├── index.html            # 首页（首屏 + 文章列表 + 经历）
├── article.html          # 文章详情页模板（按 ?slug=xxx 渲染，带评论区）
├── 404.html              # 找不到页面时显示
├── content/              # ★ 文章源文件（后台改的是这里）
│   ├── categories.json   # 四个栏目的名称与说明
│   └── posts/*.md        # 每篇文章一个 Markdown 文件
├── assets/
│   ├── styles.css        # 全部样式（深色主题、背景、响应式）
│   ├── bg-a2.webp        # 背景图·桌面（NASA 宇宙悬崖，已压暗虚化）
│   ├── bg-a2-mobile.webp # 背景图·手机竖版裁切
│   ├── main.js           # 交互：移动端菜单、滚动动画
│   ├── site-config.js    # 站点配置（评论 giscus 的三个 ID 填这里）
│   ├── posts.js          # 自动生成的文章数据 —— 不要手改（见第十六节）
│   ├── posts-render.js   # 首页文章列表 + 栏目筛选
│   ├── article.js        # 文章详情渲染 + 挂载评论
│   ├── uploads/          # 后台传的图片放这里
│   └── favicon.svg       # 站点图标（ZJ）
├── scripts/build-posts.mjs      # 把 content/posts/*.md 编译成 assets/posts.js
├── .github/workflows/build-posts.yml  # 每次提交 content/ 自动编译
├── .pages.yml            # Pages CMS 后台的字段配置
├── CNAME                 # 告诉 GitHub Pages 绑定 zhoujin.site（必须有）
├── .nojekyll             # 关闭 Jekyll 处理，保证原样发布（必须有）
├── robots.txt            # 搜索引擎抓取规则
└── sitemap.xml           # 站点地图
```

> ⚠️ 最容易踩的坑：上传时**不要把 `zhoujin-site` 这个文件夹本身拖进去**，
> 否则网站会变成 `aabb16380.github.io/zhoujin-site/`，首页 404。
> 要打开文件夹，把**里面的** `index.html`、`assets`、`CNAME` 等一起选中上传。

---

## 二、开工前清单

| 需要 | 说明 | 状态 |
|---|---|---|
| GitHub 账号 | `aabb16380` | ✅ 已有 |
| 域名 | `zhoujin.site`，2026-10-31 查询时**可注册** | ⬜ 待购买 |
| 支付方式 | 信用卡 / 支付宝（视注册商） | ⬜ |
| Git（可选） | 不装也能用网页上传 | ⬜ 本机未安装 |

---

## 三、第 1 步：买下 zhoujin.site

注册局 RDAP 在 2026-10-31 返回「available for registration」，说明当时没人注册。**先买先得**，`.site` 属于常见的 gTLD，几大平台都能买。

### 选哪个注册商

| 注册商 | 适合谁 | 备注 |
|---|---|---|
| **Cloudflare Registrar** | 已在用 Cloudflare | 按成本价卖、无溢价续费，但要求域名先用别处注册再转入，或在新注册入口直接买（部分地区受限） |
| **Porkbun / Namecheap / Spaceship** | 想要便宜首年 + 干净的 DNS 面板 | 支持支付宝的少，一般需信用卡/PayPal |
| **阿里云万网 / 腾讯云** | 只用支付宝、要中文界面 | 价格通常略高，但付款最方便；DNS 面板够用 |
| **DNSPod / 华为云** | 域名在别处、只想托管 DNS | 可只做 DNS 托管 |

> 不管你选谁，**DNS 解析放哪都行**（注册商自带 / Cloudflare / DNSPod 均可），关键是下面第 5 步的解析记录要配对。

### 买的时候注意四点

1. **用真实邮箱**：域名到期提醒、转移授权码都发这里，写错等于丢域名。
2. **开启自动续费**：`.site` 首年常有促销（几十元），**续费价通常明显更高**，别忘了。
3. **开启 WHOIS 隐私保护**（多数注册商免费默认开）：否则你的姓名、电话、邮箱会公开可查。
4. **确认域名状态是 `clientTransferProhibited`（转移锁）**：这是好事，防劫持，不是问题。

买完你会拿到一个**域名管理后台**（改 DNS 的地方），下一步会用到。

---

## 四、第 2 步：建仓库

1. 打开 <https://github.com/new>
2. **Repository name** 必须填：`aabb16380.github.io`
   （这个特殊命名才会让站点挂在 `https://aabb16380.github.io` 根路径）
3. 可见性选 **Public**（免费账号的 Pages 只支持公开仓库）
4. 不要勾选 "Add a README file"（避免和本地文件冲突）
5. 点 **Create repository**

---

## 五、第 3 步：上传文件

### 方案 A：网页上传（不需要装任何东西，推荐）

1. 进仓库 → **Add file** → **Upload files**
2. 打开本地文件夹 `zhoujin-site`，**全选里面的内容**（`index.html`、`404.html`、`assets` 文件夹、`CNAME`、`robots.txt`、`sitemap.xml`），拖进上传框
3. 底部填 commit 信息，如 `init: 个人主页`，点 **Commit changes**
4. **补建 `.nojekyll`**（隐藏文件，拖拽常常失败）：
   仓库页 → **Add file** → **Create new file** → 文件名输入 `.nojekyll` → 内容**留空** → **Commit changes**

检查：仓库首页应该直接看到 `index.html` 和 `assets/`，**不应**看到 `zhoujin-site/` 这一层。

### 方案 B：装 Git 用命令行

```powershell
# 安装 Git（本机目前没有）
winget install --id Git.Git -e --source winget

# 关掉重开终端，让 PATH 生效，然后：
cd C:\Users\yurun\Documents\deepseek-harness\default-workspace\zhoujin-site
git init -b main
git add -A
git commit -m "init: 个人主页"
git remote add origin https://github.com/aabb16380/aabb16380.github.io.git
git push -u origin main
```

> 推送时 GitHub 不收账号密码，要填 **Personal Access Token**（Settings → Developer settings → Personal access tokens → Fine-grained → 勾 `Contents: Read and write`），或改用 GitHub Desktop / SSH 密钥。

### 方案 C：GitHub Desktop

装好后 `File → Add local repository` 选 `zhoujin-site` → `Publish repository`，取消勾 "Keep this code private"。

---

## 六、第 4 步：开启 Pages（先拿到 github.io 地址）

1. 仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `main`，目录选 `/ (root)`，点 **Save**
4. 等 1–2 分钟，刷新页面，顶部会出现
   `Your site is live at https://aabb16380.github.io/`
5. 打开这个地址，**确认页面正常**——这一步通过再动域名，能省掉一半排错时间。

---

## 七、第 5 步：域名解析（DNS）

在**域名注册商 / DNS 服务商**的后台里，删掉默认的停放记录（parking / 域名出售页），加上下面这些记录。

### 主域名 `zhoujin.site`（根域名，4 条 A + 4 条 AAAA）

| 类型 | 主机记录 / Name | 记录值 / Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 自动 / 3600 |
| A | `@` | `185.199.109.153` | 自动 / 3600 |
| A | `@` | `185.199.110.153` | 自动 / 3600 |
| A | `@` | `185.199.111.153` | 自动 / 3600 |
| AAAA | `@` | `2606:50c0:8000::153` | 自动 / 3600 |
| AAAA | `@` | `2606:50c0:8001::153` | 自动 / 3600 |
| AAAA | `@` | `2606:50c0:8002::153` | 自动 / 3600 |
| AAAA | `@` | `2606:50c0:8003::153` | 自动 / 3600 |

> IPv6（AAAA）不是必须，但加上更稳；如果你的 DNS 面板不支持 AAAA，只加 4 条 A 也能用。

### `www` 子域名（1 条 CNAME）

| 类型 | 主机记录 / Name | 记录值 / Value |
|---|---|---|
| CNAME | `www` | `aabb16380.github.io` |

### 两个大坑

1. **用 Cloudflare 托管 DNS 时，必须把这两条记录的云朵图标点成灰色（DNS only）**。
   橙色代理会让 GitHub 无法签发证书，甚至造成重定向循环。
2. **不要**把根域名用 CNAME 指向 `aabb16380.github.io`——根域名按 DNS 规范不能有 CNAME，
   有些服务商允许（CNAME flattening），但用 A 记录最稳。

---

## 八、第 6 步：绑定自定义域名

1. 仓库 → **Settings** → **Pages** → **Custom domain**
2. 输入 `zhoujin.site` → **Save**
3. GitHub 会做一次 DNS 检查：
   - 通过 → 显示 ✅，并可勾选 `Enforce HTTPS`
   - 提示 `DNS check unsuccessful` → 正常，DNS 还没生效，等 10 分钟~24 小时再回来点一次
4. 保存后 GitHub 会自动在仓库里写一个 `CNAME` 文件——我们已经放了，内容一致，不会冲突。

> 如果仓库里**没有** `CNAME` 文件，自定义域名会在下次部署时被重置回 `github.io`。所以这个文件别删。

---

## 九、第 7 步：开启 HTTPS

1. DNS 检查通过后，回到 **Settings → Pages**，勾选 **Enforce HTTPS**
2. 证书由 Let's Encrypt 自动签发，通常 **几分钟**，最长可能等到 24 小时
3. 灰色不可勾选 = 证书还没好，等；如果超过 24 小时仍然灰：
   把 Custom domain 清空保存 → 等 10 分钟 → 重新填 `zhoujin.site` 保存，重新触发签发

完成后：`http://zhoujin.site` 和 `http://www.zhoujin.site` 都会自动跳转到 `https://`。

---

## 十、第 8 步：验证（PowerShell 直接跑）

```powershell
# 1) 看根域名的 A 记录是否指向 GitHub
Resolve-DnsName zhoujin.site -Type A | Select-Object Name, IPAddress

# 2) 看 www 的 CNAME
Resolve-DnsName www.zhoujin.site -Type CNAME | Select-Object Name, NameHost

# 3) 看站点是否 200，以及证书是否生效
Invoke-WebRequest -Uri "https://zhoujin.site" -Method Head -MaximumRedirection 0 |
  Select-Object StatusCode, StatusDescription

# 4) 强制走 Google DNS 复查（缓存问题排查）
Resolve-DnsName zhoujin.site -Type A -Server 8.8.8.8
```

期望结果：4 个 `185.199.10x.153`、`www` 指向 `aabb16380.github.io`、状态码 `200`。

---

## 十一、排错速查

| 现象 | 原因 | 处理 |
|---|---|---|
| `aabb16380.github.io` 就是 404 | 仓库名不对 / 文件在子目录 / 分支不是 main | 文件必须在仓库**根目录**；Settings → Pages 里确认分支 |
| 页面能开但没有样式 | `assets` 文件夹没上传或层级错 | 仓库根目录下要有 `assets/styles.css` |
| `github.io` 正常，`zhoujin.site` 打不开 | A 记录没生效 / 被停放记录覆盖 | 删掉旧的 parking 记录；`Resolve-DnsName` 看是否已是 185.199.x |
| DNS 检查一直失败但记录是对的 | Cloudflare 开了橙色云代理 | 切成 DNS only（灰色云） |
| `zhoujin.site` 显示 GitHub 404 但仓库正常 | `CNAME` 文件缺失或内容写成 `https://...` | 文件内容只能是纯域名 `zhoujin.site`，无协议、无斜杠 |
| Enforce HTTPS 灰色 | 证书未签发 | 等待；或清空/重填 Custom domain 重触发 |
| 改完中文乱码 | 文件编码不是 UTF-8 | 本仓库文件均为 UTF-8，用编辑器保存时别选 GBK |
| 国内打开很慢/间歇失败 | GitHub Pages 服务器在境外 | 见下方「国内访问」 |

---

## 十二、以后怎么改内容

### 只改文字

首页只有三块：**首屏 / 文章 / 经历**。分别对应：

| 改什么 | 改哪个文件 |
|---|---|
| 名字、首屏那句自我介绍、按钮文字 | `index.html` 首屏区块 |
| 经历时间线（年份、标题、描述） | `index.html` 底部的 `ol.timeline` |
| 文章标题、正文、栏目 | `assets/posts.js`（见第十三节） |
| 页脚版权、页脚右侧说明 | `index.html` 的 `<footer>` |

页脚年份由脚本自动取当前年，不用手改。

改完直接在 GitHub 网页上编辑（Edit 按钮）→ Commit，1 分钟内自动重新发布。

### 改配色

`assets/styles.css` 最上面：

```css
:root {
  --brand: #2f6df6;   /* 主色 */
  --brand-2: #7c5cff; /* 渐变副色 */
}
```

换这两个值，整站按钮、标签、时间线、图标全部跟着变。

### 换背景图

背景是 NASA 的「宇宙悬崖」（Carina Nebula），**公有领域，可自由使用**，不存在版权问题。
两张图分别在：

- `assets/bg-a2.webp` —— 桌面宽屏（1920×1080）
- `assets/bg-a2-mobile.webp` —— 手机竖版（1080×1920）

**换图只要用同名文件覆盖**，不用改任何代码。建议：

1. 宽高比保持 16:9（桌面）/ 9:16（手机），否则会被裁切；
2. 先把图**压暗**（亮度降到 50–60%），否则文字会看不清；
3. 导出为 WebP，质量 80 左右，控制在 100 KB 以内。

想换别的 NASA 图，去 <https://images.nasa.gov> 搜 `nebula` / `milky way`，
下载原图后用任意图片工具压暗、裁切、导出即可。

### 本地预览

双击 `index.html` 就能看。想更接近线上环境：

```powershell
cd C:\Users\yurun\Documents\deepseek-harness\default-workspace\zhoujin-site
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

（本机已有 Python，无需安装任何东西。）

### 加域名邮箱（可选，免费）

想用 `hi@zhoujin.site` 收信，不必买企业邮箱：把 DNS 托管到 **Cloudflare**，开启 **Email Routing**，
把 `hi@zhoujin.site` 转发到你的常用邮箱即可，免费，不需要服务器。

---

## 十三、文章与评论（内容系统）

首页第 01 节是文章区，四个栏目：**宙金列传 / 宙金自传 / 咏宙金 / 其他文章**。
每篇文章点开是独立页面 `article.html?slug=xxx`，底部带评论区。

### 13.1 加一篇文章

只改 `assets/posts.js`，往数组里追加一个对象：

```js
{
  slug: "liezhuan-2",              // 唯一标识，链接里会用到，用英文/数字/短横线
  cat: "zhuan",                    // 栏目：zhuan | zi | yong | other
  title: "宙金列传·其二",
  date: "2026-11-02",              // 列表按日期倒序
  excerpt: "一句话摘要，列表里显示。",
  body: `
    <p>正文段落，中文会自动首行缩进两字。</p>
    <p class="poem">诗，居中排。</p>
    <p class="note">—— 落款，右对齐。</p>
  `
}
```

正文可用的标签：`<p>` 段落、`<h2>` 小标题、`<blockquote>` 引文、
`<strong>`、`<em>`、`<ul><li>`、`<img src="...">`、`<code>`、`<pre>`。

**发布前删掉 `sample: true` 这一行**，否则文章标题旁会显示「示例」角标。

### 13.2 改栏目名

同一个文件顶部的 `window.ZJ_CATS`：

```js
{ key: "zhuan", name: "宙金列传", desc: "他人所记，关于宙金的传闻与行迹。" }
```

`key` 不要改（文章靠它归类），`name` 和 `desc` 随便改。
若要**增加第五个栏目**，在这里加一项，`key` 用新的英文词，文章里 `cat` 填它即可。

### 13.3 开评论（giscus，免费，无需服务器）

评论存在**你自己仓库的 Discussions** 里，不经过任何第三方数据库，也不用备案。

三步：

1. **仓库开 Discussions**：仓库 → Settings → General → Features → 勾选 **Discussions**
2. **装 giscus App**：打开 <https://github.com/apps/giscus> → Install → 选择这个仓库
3. **拿三个值**：打开 <https://giscus.app/zh-CN> ，在「仓库」里填 `aabb16380/aabb16380.github.io`，
   往下选「Discussion 分类」为 `Announcements`，页面会给出一段 `<script>`，里面有：
   - `data-repo` → 对应 `repo`
   - `data-repo-id` → 对应 `repoId`
   - `data-category-id` → 对应 `categoryId`

把这四个值填进 `assets/site-config.js`：

```js
giscus: {
  repo: "aabb16380/aabb16380.github.io",
  repoId: "R_kgDOxxxxxxx",
  category: "Announcements",
  categoryId: "DIC_kwDOxxxxxxx",
  ...
}
```

保存提交，刷新任意文章页即可看到评论区。

**三个值没填时，评论区整块自动隐藏**，不会在线上留一个空框，可以放心先上线。

### 13.4 关于评论的几点说明

| 事项 | 说明 |
|---|---|
| 读者要登录 | giscus 基于 GitHub，留言必须用 GitHub 账号登录（对技术圈朋友不算门槛，对长辈朋友是） |
| 仓库必须 Public | 私有仓库的评论对访客不可见 |
| 你不想要 GitHub 登录 | 换成 Twikoo 或 Waline，但要另外部署一个免费后端（Vercel / LeanCloud），多一层维护 |
| 有人发垃圾评论 | GitHub Discussions 里有删除/屏蔽按钮，你作为仓库主人可以直接处理 |
| 邮件通知 | 在 giscus.app 页面可勾选"评论时通知"，之后有人留言会发邮件给你 |

---

## 十四、免费方案的边界

| 项目 | 限制 |
|---|---|
| 仓库可见性 | 必须 Public |
| 站点体积 | ≤ 1 GB |
| 流量 | 约 100 GB / 月（软限制，正常个人站够用） |
| 发布频率 | 每小时 ≤ 10 次 |
| 构建 | 纯静态，无构建步骤，秒级发布 |

## 十五、国内访问

GitHub Pages 服务器在境外，**绑定自定义域名不需要 ICP 备案**，但国内访问速度不稳定，
部分地区/运营商可能很慢。如果以后主要面向国内用户：

1. 先留在 GitHub Pages（零成本、零维护）；
2. 需要提速时，把静态文件同步到国内对象存储（阿里云 OSS / 腾讯云 COS）+ CDN，
   此时域名要**做 ICP 备案**（约 1–2 周，需国内主体与服务器）；
3. 备案期间可继续用当前站点，切换只改 DNS，不影响域名所有权。

## 十六、用后台发文章（Pages CMS）

站点是纯静态的，所以「登录 + 发文章」不是传统后台，而是：
**用 GitHub 账号登录一个可视化编辑器，它替你往仓库提交 Markdown 文件。**

### 一次性配置（约 5 分钟）

1. 仓库先推上去，并且是 **Public**
2. 打开 <https://app.pagescms.org> → **Sign in with GitHub**
3. 授权 Pages CMS 访问你的仓库（只勾这一个仓库）
4. 进入后选 `aabb16380/aabb16380.github.io`
5. 左侧出现 **文章** 集合 —— 配置来自仓库里的 `.pages.yml`，不用你填

### 发一篇新文章

1. 后台 → 文章 → **Add entry**
2. 填：
   - **标题**
   - **链接标识**：英文/数字/短横线，如 `liezhuan-3`（发布后别改，改了旧链接会失效）
   - **栏目**：宙金列传 / 宙金自传 / 咏宙金 / 其他文章
   - **发布日期**
   - **落款**（可选）
   - **摘要**：列表里显示的一两句话
   - **正文**：直接写，空一行分段
3. 点 **Save** → 自动提交到仓库
4. GitHub Actions 自动跑 `scripts/build-posts.mjs`，把 Markdown 编译成 `assets/posts.js`
5. 约 1 分钟后刷新站点，文章就出现了

### 改文章

后台点开任意一篇 → 改 → Save。同样走上面的自动编译。

> ⚠️ **不要手改 `assets/posts.js`** —— 它是自动生成的，下次编译会被覆盖。
> 要改内容请改 `content/posts/*.md`（或用后台）。

### 正文里的特殊排版

正文是 Markdown，但**允许直接写 HTML**：

| 想做什么 | 写法 |
|---|---|
| 普通段落 | 空一行分隔，自动包 `<p>` |
| 诗（居中） | `<p class="poem">一行，<br>两行。</p>` |
| 篇名（居中大字） | `<p class="doc-title">史记 · 宙金列传</p>` |
| 落款（右对齐） | `<p class="note">—— 录自《史记》残卷</p>` |
| 律条框 | `<div class="law-block"><p class="law-title">汉谟拉比法典</p><p class="law">第二十条……</p></div>` |
| 插图 | `<figure><img src="assets/uploads/xx.jpg" alt="说明"><figcaption>图注</figcaption></figure>` |

图片：后台正文里插入图片会上传到 `assets/uploads/`，引用路径写 `assets/uploads/文件名`。

### 权限说明（重要）

Pages CMS 的「登录」就是 GitHub 账号，**权限 = 谁能往这个仓库提交**。
所以后台**不是公开注册**的：只有你（和被你加为仓库协作者的人）能发文章。
如果以后想让几个同学一起写，把他们加成仓库的 Collaborator 即可。

### 不想用第三方后台？

也可以直接在 GitHub 网页上编辑 `content/posts/xxx.md`，提交后 Actions 同样会编译。
效果一样，只是没有表单和图片上传按钮。

---

*文档生成于 2026-10-31。域名价格、GitHub 界面文案可能随平台更新，以实际页面为准。*
