/* ============================================================
   宙金 · 个人主页 | 交互脚本
   1) 移动端菜单   2) 顶部栏滚动状态
   3) 滚动入场动画  4) 页脚年份
   原生 JS，无任何依赖。
   ============================================================ */
(function () {
  'use strict';

  var header = document.getElementById('site-header');
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');

  /* ---------- 移动端菜单 ---------- */
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('open');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', '打开菜单');
    }
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 720) closeNav();
    });
  }

  /* ---------- 顶部栏滚动状态 ---------- */
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 滚动入场动画 ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    // 同一容器内的元素依次浮现，轻微错峰
    items.forEach(function (el) {
      var parent = el.parentElement;
      var siblings = parent
        ? Array.prototype.slice.call(parent.querySelectorAll(':scope > .reveal'))
        : [el];
      var idx = siblings.indexOf(el);
      el.style.transitionDelay = Math.min(idx, 4) * 70 + 'ms';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });

    // 兜底：个别元素在某些窗口高度下可能收不到 IntersectionObserver 回调，
    // 会被永久隐藏。这里再按「是否真的在视口内」补发一次。
    function revealVisible() {
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        if (el.classList.contains('in')) continue;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
      }
    }
    window.addEventListener('load', function () {
      setTimeout(revealVisible, 900);
      setTimeout(revealVisible, 2000);
    });

    // 边界情况：页面完全不需要滚动时（超高视口），
    // 屏幕外的元素永远不会「进入视口」，会永久隐藏。此时直接全部显示。
    if (document.documentElement.scrollHeight <= window.innerHeight + 2) {
      items.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- 页脚年份 ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
