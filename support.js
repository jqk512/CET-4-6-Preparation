import { playUiSound } from "./ui-sound.js?v=20261104-1";

const root = document.getElementById("support-root");
const burstEmoji = ["✨", "📚", "💛", "⭐", "🎉", "🧡", "🌷", "📝", "🍀", "💫", "☕", "🎓"];

root.innerHTML = `
  <button class="support-float" type="button" aria-label="打开支持弹窗" aria-haspopup="dialog">
    <span class="support-float-core" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 10h22M20 10v22M10 29V22c0-5 4-8 10-8s10 3 10 8v7"/>
      </svg>
    </span>
  </button>
  <div class="support-overlay" hidden>
    <section class="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <button class="support-close" type="button" aria-label="关闭弹窗">×</button>
      <div class="support-dialog-mark" aria-hidden="true">✦</div>
      <h2 id="support-title">希望对你有帮助，<br>我的朋友。</h2>
      <div class="support-link-row"><span>支持一下👉</span><a href="./assets/support-qr.jpg" target="_blank" rel="noopener noreferrer">打赏</a></div>
      <div class="support-qr" hidden><img src="./assets/support-qr.jpg" alt="打赏收款码"><p>感谢支持</p></div>
    </section>
  </div>
  <div class="support-particles" aria-hidden="true"></div>`;

const button = root.querySelector(".support-float");
const overlay = root.querySelector(".support-overlay");
const dialog = root.querySelector(".support-dialog");
const qr = root.querySelector(".support-qr");
const particles = root.querySelector(".support-particles");
let previousFocus;

function close() {
  overlay.hidden = true;
  dialog.classList.remove("qr-view");
  qr.hidden = true;
  document.body.classList.remove("support-open");
  previousFocus?.focus?.();
}

function openQr() {
  previousFocus = document.activeElement;
  qr.hidden = false;
  dialog.classList.add("qr-view");
  overlay.hidden = false;
  document.body.classList.add("support-open");
  root.querySelector(".support-close").focus();
}

function burst() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = button.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  particles.replaceChildren();
  burstEmoji.forEach((emoji, index) => {
    const piece = document.createElement("span");
    const angle = index * (Math.PI * 2 / burstEmoji.length) - Math.PI * .85;
    const distance = 75 + index % 3 * 24;
    piece.textContent = emoji;
    piece.style.left = centerX + "px";
    piece.style.top = centerY + "px";
    piece.style.setProperty("--burst-x", Math.cos(angle) * distance + "px");
    piece.style.setProperty("--burst-y", Math.sin(angle) * distance - 42 + "px");
    piece.style.setProperty("--burst-turn", (index % 2 ? 38 : -38) + "deg");
    particles.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove(), {once:true});
  });
}

button.addEventListener("click", () => {
  playUiSound("support");
  burst();
  previousFocus = document.activeElement;
  overlay.hidden = false;
  document.body.classList.add("support-open");
  overlay.querySelector(".support-close").focus();
});
root.querySelector(".support-close").addEventListener("click", close);
root.querySelector(".support-link-row a").addEventListener("click", () => playUiSound("click"));
overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !overlay.hidden) close(); });
if (new URLSearchParams(location.search).get("donate") === "1") openQr();
