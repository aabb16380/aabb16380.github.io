/* ============================================================
   站点配置 · 只需要改这个文件
   ------------------------------------------------------------
   评论（giscus）—— 三步拿到三个值，填进来即生效：
   1. 仓库须为 Public，并在 Settings → General → Features 里勾选 Discussions
   2. 安装 giscus App：https://github.com/apps/giscus → Install
   3. 打开 https://giscus.app/zh-CN ，填入仓库名，页面会给出
      data-repo-id / data-category-id 两个值，连同仓库名复制到下面

   三个值任意一个为空时，评论区会自动隐藏（不会报错、不会留空框）。
   ============================================================ */
window.ZJ_CONFIG = {
  site: {
    name: "宙金",
    domain: "zhoujin.site",
    github: "aabb16380"
  },

  giscus: {
    // 仓库名已预填；下面两个 ID 需要从 giscus.app 获取后填进来
    repo: "aabb16380/aabb16380.github.io",
    repoId: "",            // ← 例："R_kgDONxxxxxxxx"
    category: "Announcements",   // 讨论区分类名，通常用 Announcements
    categoryId: "",        // ← 例："DIC_kwDONxxxxxxxx"
    mapping: "specific",   // 固定值：每篇文章一个独立讨论串
    lang: "zh-CN",
    inputPosition: "top",
    reactionsEnabled: "1"
  }
};
