(function () {
  "use strict";

  document.body.classList.remove("no-js");

  var header = document.querySelector("[data-header]");
  var videos = document.querySelectorAll("video");
  var reveals = document.querySelectorAll(".reveal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var headerFrame = 0;

  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 30);
    headerFrame = 0;
  }

  function requestHeaderUpdate() {
    if (!headerFrame) headerFrame = window.requestAnimationFrame(updateHeader);
  }

  updateHeader();
  window.addEventListener("scroll", requestHeaderUpdate, { passive: true });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (element) { element.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: window.innerWidth < 641 ? "0px 0px -4%" : "0px 0px -8%",
      threshold: window.innerWidth < 641 ? 0.04 : 0.08
    });
    reveals.forEach(function (element) {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.98) {
        element.classList.add("is-visible");
      } else {
        revealObserver.observe(element);
      }
    });
  }

  if ("IntersectionObserver" in window) {
    var videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !reduceMotion) {
          entry.target.play().catch(function () {});
        } else {
          entry.target.pause();
        }
      });
    }, { threshold: 0.1 });
    videos.forEach(function (video) { videoObserver.observe(video); });
  }

  var canvas = document.getElementById("chemistry-field");
  if (!canvas) return;
  var context = canvas.getContext("2d");
  if (!context) return;
  var touchDisplay = window.matchMedia("(hover: none)").matches;

  var width = 0;
  var height = 0;
  var ratio = Math.min(window.devicePixelRatio || 1, 2);
  var startTime = performance.now();
  var chains = [];
  var tilings = [];
  var frame = 0;
  var resizeTimer = 0;

  function seeded(seed) {
    var value = Math.sin(seed * 999.91) * 43758.5453;
    return value - Math.floor(value);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildStructures();
  }

  function buildStructures() {
    var count = width < 700 ? 4 : 7;
    chains = [];
    for (var i = 0; i < count; i += 1) {
      var fromLeft = i % 2 === 0;
      var nodes = [];
      var x = fromLeft ? -30 : width + 30;
      var y = (0.12 + seeded(i + 2) * 0.76) * height;
      var direction = fromLeft ? -0.22 + seeded(i + 9) * 0.65 : Math.PI + 0.22 - seeded(i + 9) * 0.65;
      var nodeCount = 7 + Math.floor(seeded(i + 4) * 6);
      for (var n = 0; n < nodeCount; n += 1) {
        var step = width < 700 ? 58 : 76;
        direction += (seeded(i * 31 + n + 1) - 0.5) * 0.52;
        x += Math.cos(direction) * step;
        y += Math.sin(direction) * step;
        nodes.push({
          x: x,
          y: y,
          phase: seeded(i * 41 + n) * Math.PI * 2,
          ring: n > 0 && seeded(i * 17 + n) > 0.44,
          doubleBond: seeded(i * 13 + n) > 0.82,
          atom: seeded(i * 23 + n) > 0.86 ? (seeded(i + n) > 0.5 ? "O" : "N") : ""
        });
      }
      chains.push({ nodes: nodes, delay: i * 0.085 });
    }

    tilings = [
      { x: width * 0.78, y: height * 0.14, scale: width < 700 ? 18 : 27, phase: 0.5 },
      { x: width * 0.18, y: height * 0.76, scale: width < 700 ? 16 : 24, phase: 2.1 }
    ];
  }

  function hexagon(x, y, radius, rotation) {
    context.beginPath();
    for (var side = 0; side < 6; side += 1) {
      var angle = rotation + side * Math.PI / 3;
      var px = x + Math.cos(angle) * radius;
      var py = y + Math.sin(angle) * radius;
      if (side === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.stroke();
  }

  function drawBond(a, b, doubleBond) {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    if (doubleBond) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var length = Math.sqrt(dx * dx + dy * dy) || 1;
      var ox = -dy / length * 4;
      var oy = dx / length * 4;
      context.beginPath();
      context.moveTo(a.x + ox, a.y + oy);
      context.lineTo(b.x + ox, b.y + oy);
      context.stroke();
    }
  }

  function draw(time) {
    frame = 0;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(21, 20, 18, 0.17)";
    context.fillStyle = "rgba(21, 20, 18, 0.35)";
    context.lineWidth = 0.75;
    context.font = "11px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";

    var seconds = (time - startTime) / 1000;
    var scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    var scrollDepth = window.scrollY / scrollRange;
    var growthBase = Math.min(1.18, seconds / 48 + scrollDepth * 0.44);

    chains.forEach(function (chain, chainIndex) {
      var progress = Math.max(0, Math.min(1, growthBase - chain.delay));
      var visible = Math.max(1, Math.ceil(chain.nodes.length * progress));
      var moving = [];

      for (var i = 0; i < visible; i += 1) {
        var node = chain.nodes[i];
        moving.push({
          x: node.x + Math.sin(seconds * 0.12 + node.phase) * 8,
          y: node.y + Math.cos(seconds * 0.1 + node.phase) * 7,
          ring: node.ring,
          doubleBond: node.doubleBond,
          atom: node.atom
        });
      }

      for (var j = 1; j < moving.length; j += 1) {
        drawBond(moving[j - 1], moving[j], moving[j].doubleBond);
      }

      moving.forEach(function (node, nodeIndex) {
        if (node.ring) hexagon(node.x, node.y, width < 700 ? 12 : 16, seconds * 0.018 + chainIndex * 0.13);
        else {
          context.beginPath();
          context.arc(node.x, node.y, nodeIndex % 4 === 0 ? 2.1 : 1.25, 0, Math.PI * 2);
          context.fill();
        }
        if (node.atom) context.fillText(node.atom, node.x, node.y - 20);
      });
    });

    context.strokeStyle = "rgba(21, 20, 18, 0.085)";
    tilings.forEach(function (tiling, index) {
      var swayX = Math.sin(seconds * 0.08 + tiling.phase) * 14;
      var swayY = Math.cos(seconds * 0.06 + tiling.phase) * 10;
      for (var row = -2; row <= 2; row += 1) {
        for (var column = -2; column <= 2; column += 1) {
          if (Math.abs(row) + Math.abs(column) > 3) continue;
          var radius = tiling.scale;
          var hx = tiling.x + swayX + column * radius * 1.5;
          var hy = tiling.y + swayY + row * radius * 1.74 + (column % 2) * radius * 0.87;
          hexagon(hx, hy, radius, Math.PI / 6 + seconds * 0.006 * (index ? -1 : 1));
        }
      }
    });

    if (!reduceMotion && !document.hidden && width >= 700 && !touchDisplay) {
      frame = window.requestAnimationFrame(draw);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!reduceMotion && width >= 700 && !touchDisplay && !frame) {
      frame = window.requestAnimationFrame(draw);
    }
  });
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      resize();
      if (width < 700 || touchDisplay || reduceMotion) {
        cancelAnimationFrame(frame);
        frame = 0;
        draw(startTime + 24000);
      } else if (!frame) {
        frame = window.requestAnimationFrame(draw);
      }
    }, 140);
  }, { passive: true });
  window.addEventListener("beforeunload", function () { cancelAnimationFrame(frame); });
  resize();
  draw(width < 700 || touchDisplay || reduceMotion ? startTime + 24000 : startTime);
})();
