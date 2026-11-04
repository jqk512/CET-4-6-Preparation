import { playUiSound } from "./ui-sound.js?v=20261104-1";
const EMOJIS = ["📚","🎧","📝","🎓","📖","✏️","💡","🧠","🎯","🏆","📅","💬","🔤","📌","⭐","💯","🍀","🚀","🧩","🎵","📕","📗","✨","☕"];
let cleanup = () => {};

export function destroyEmojiPhysics() {
  cleanup();
  cleanup = () => {};
}

export function initEmojiPhysics(arena) {
  destroyEmojiPhysics();
  if (!arena) return;

  const mobile = arena.clientWidth < 650;
  const count = mobile ? 15 : EMOJIS.length;
  let width = arena.clientWidth;
  let height = arena.clientHeight;
  let raf = 0;
  let previous = 0;
  let held = null;
  let lastPointer = null;
  const createdAt = performance.now();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bodies = EMOJIS.slice(0, count).map((emoji, index) => {
    const node = document.createElement("span");
    node.className = "falling-emoji";
    node.textContent = emoji;
    node.setAttribute("aria-hidden", "true");
    const radius = mobile ? 24 + index % 3 * 3 : 31 + index % 4 * 3;
    node.style.fontSize = `${radius * 1.55}px`;
    node.style.width = `${radius * 2}px`;
    node.style.height = `${radius * 2}px`;
    arena.appendChild(node);
    const x = radius + ((index * 137.51) % Math.max(width - radius * 2, 1));
    const body = {
      node, radius, x,
      y: reducedMotion ? height - radius - Math.floor(index / 7) * radius * 1.45 : -radius - index * 50,
      vx: (index % 2 ? 1 : -1) * (0.45 + index % 5 * 0.13),
      vy: 0,
      angle: (index % 5 - 2) * 0.13,
      spin: (index % 2 ? 1 : -1) * 0.004,
      readyAt: createdAt + index * 78
    };
    return body;
  });

  function bounds() {
    width = arena.clientWidth;
    height = arena.clientHeight;
    for (const body of bodies) {
      body.x = Math.max(body.radius, Math.min(width - body.radius, body.x));
      body.y = Math.min(height - body.radius, body.y);
    }
  }
  const observer = new ResizeObserver(bounds);
  observer.observe(arena);

  function pointerDown(event) {
    const node = event.target.closest(".falling-emoji");
    if (!node) return;
    held = bodies.find(body => body.node === node);
    if (!held) return;
    const rect = arena.getBoundingClientRect();
    lastPointer = {x:event.clientX - rect.left, y:event.clientY - rect.top, time:performance.now()};
    held.vx = 0;
    held.vy = 0;
    node.classList.add("held");
    arena.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function pointerMove(event) {
    const rect = arena.getBoundingClientRect();
    const point = {x:event.clientX - rect.left, y:event.clientY - rect.top, time:performance.now()};
    if (held) {
      const elapsed = Math.max(8, point.time - lastPointer.time);
      held.vx = (point.x - lastPointer.x) * 16 / elapsed;
      held.vy = (point.y - lastPointer.y) * 16 / elapsed;
      held.x = Math.max(held.radius, Math.min(width - held.radius, point.x));
      held.y = Math.max(held.radius, Math.min(height - held.radius, point.y));
      held.angle += held.vx * 0.002;
      lastPointer = point;
    } else {
      for (const body of bodies) {
        const dx = body.x - point.x;
        const dy = body.y - point.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < body.radius + 55) {
          const push = (body.radius + 55 - distance) * 0.014;
          body.vx += dx / distance * push;
          body.vy += dy / distance * push;
        }
      }
    }
  }
  function pointerUp(event) {
    if (held) held.node.classList.remove("held");
    held = null;
    lastPointer = null;
    if (arena.hasPointerCapture(event.pointerId)) arena.releasePointerCapture(event.pointerId);
  }
  arena.addEventListener("pointerdown", pointerDown);
  arena.addEventListener("pointermove", pointerMove);
  arena.addEventListener("pointerup", pointerUp);
  arena.addEventListener("pointercancel", pointerUp);

  function collide(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const overlap = a.radius + b.radius - distance;
    if (overlap <= 0) return;
    const nx = dx / distance, ny = dy / distance;
    if (a === held) { b.x += nx * overlap; b.y += ny * overlap; }
    else if (b === held) { a.x -= nx * overlap; a.y -= ny * overlap; }
    else { a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5; b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5; }
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relative < 0) {
      const impulse = -relative * 0.46;
      if (a !== held) { a.vx -= impulse * nx; a.vy -= impulse * ny; }
      if (b !== held) { b.vx += impulse * nx; b.vy += impulse * ny; }
    }
  }
  function tick(now) {
    const dt = Math.min(2, Math.max(0.5, (now - (previous || now - 16.7)) / 16.7));
    previous = now;
    for (const body of bodies) {
      if (now < body.readyAt && !reducedMotion) continue;
      if (body !== held && !reducedMotion) {
        body.vy += 0.34 * dt;
        body.vx *= 0.997;
        body.vy *= 0.997;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.spin * dt + body.vx * 0.0008;
      }
      if (body.x < body.radius) { body.x = body.radius; body.vx = Math.abs(body.vx) * 0.55; }
      if (body.x > width - body.radius) { body.x = width - body.radius; body.vx = -Math.abs(body.vx) * 0.55; }
      if (body.y > height - body.radius) {
        if (body.vy > 2.2) playUiSound("collision", body.vy / 10);
        body.y = height - body.radius;
        body.vy = Math.abs(body.vy) < 1 ? 0 : -Math.abs(body.vy) * 0.42;
        body.vx *= 0.92;
        body.spin *= 0.98;
      }
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          if ((now >= bodies[i].readyAt && now >= bodies[j].readyAt) || reducedMotion) collide(bodies[i], bodies[j]);
        }
      }
      for (const body of bodies) {
        body.x = Math.max(body.radius, Math.min(width - body.radius, body.x));
        body.y = Math.min(height - body.radius, body.y);
      }
    }
    for (const body of bodies) {
      body.node.style.transform = `translate3d(${body.x - body.radius}px,${body.y - body.radius}px,0) rotate(${body.angle}rad)`;
      body.node.style.opacity = now >= body.readyAt || reducedMotion ? "1" : "0";
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  cleanup = () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    arena.removeEventListener("pointerdown", pointerDown);
    arena.removeEventListener("pointermove", pointerMove);
    arena.removeEventListener("pointerup", pointerUp);
    arena.removeEventListener("pointercancel", pointerUp);
  };
}
