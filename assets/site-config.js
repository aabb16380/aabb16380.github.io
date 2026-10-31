/* ============================================================
   站点配置 · 只需要改这个文件
   ------------------------------------------------------------
   评论 + 点赞（Supabase）—— 读者无需登录：
   1. 注册 https://supabase.com（免费），新建一个项目（区域选 Singapore）
   2. 项目里点 SQL Editor → New query → 粘贴 supabase/schema.sql 的内容 → Run
   3. 项目 Settings → API，复制 Project URL 和 anon public key，填到下面
   两个值任意一个为空时，点赞与评论区整块自动隐藏，站点不受影响。
   ============================================================ */
window.ZJ_CONFIG = {
  site: {
    name: "宙金",
    domain: "zhoujin.site",
    github: "aabb16380"
  },

  comments: {
    provider: "supabase",
    supabaseUrl: "https://gnyfbgfdbyspjoyehhce.supabase.co",        // ← 例："https://abcdefghijkl.supabase.co"
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdueWZiZ2ZkYnlzcGpveWVoaGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzA5NDcsImV4cCI6MjEwOTAwNjk0N30.UTfL7eTfSLS06PoA6E-GBlMDEUIVJSLJ-OUg5-FVQ6g",    // ← 例："eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
    requireApproval: false  // false = 评论发出即显示；true = 需审核
  }
};
