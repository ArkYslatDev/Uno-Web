function animateCardPlay(fromEl, toEl) {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const clone = fromEl.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.left = fromRect.left + 'px';
  clone.style.top = fromRect.top + 'px';
  clone.style.width = fromRect.width + 'px';
  clone.style.height = fromRect.height + 'px';
  clone.style.zIndex = '999';
  clone.style.transition = 'all 0.4s cubic-bezier(.34,1.56,.64,1)';
  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    clone.style.left = toRect.left + 'px';
    clone.style.top = toRect.top + 'px';
    clone.style.width = toRect.width + 'px';
    clone.style.height = toRect.height + 'px';
    clone.style.transform = 'rotate(360deg)';
  });

  setTimeout(() => clone.remove(), 420);
}

function pulseElement(el) {
  el.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.15)' },
    { transform: 'scale(1)' }
  ], { duration: 400, easing: 'ease-in-out' });
} // Fungsi animasi tambahan bisa ditaruh di sini