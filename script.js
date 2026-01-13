// script.js - interactions améliorées pour BOUCLIER PROTECT
// Gère : modales, WhatsApp, copie du numéro, expansion des contextes, fond animé, accessibilité

document.addEventListener('DOMContentLoaded', function () {
  // ---------- Utilitaires ----------
  const normalizePhoneDigits = (text) => (text || '').replace(/\D+/g, '');
  const openInNewTab = (url) => {
    try {
      if (!url || typeof url !== 'string') return;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('Impossible d\'ouvrir le lien dans un nouvel onglet', err);
    }
  };

  // ---------- Presentation background (lazy-load + CSS vars) ----------
  (function initPresentationBackground() {
    const root = document.documentElement;
    const presentationCard = document.querySelector('.presentation-card');
    if (!presentationCard) return;

    const bg1 = presentationCard.dataset.bg1 || 'bg1.jpg';
    const bg2 = presentationCard.dataset.bg2 || 'bg2.jpg';

    // Preload images with lightweight error handling
    [bg1, bg2].forEach(src => {
      if (!src) return;
      const img = new Image();
      img.onload = () => { /* loaded */ };
      img.onerror = () => console.warn('Échec du chargement de l\'image de fond:', src);
      // slight delay to avoid blocking paint
      setTimeout(() => { img.src = src; }, 50);
    });

    // Inject into CSS variables so the CSS crossfade uses them
    root.style.setProperty('--presentation-bg-1', `url("${bg1}")`);
    root.style.setProperty('--presentation-bg-2', `url("${bg2}")`);

    // Respect reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const bgEl = document.querySelector('.presentation-bg');
      if (bgEl) bgEl.style.animationPlayState = 'paused';
    }
  })();

  // ---------- Elements réutilisés ----------
  const phoneNumberEl = document.querySelector('.phone-number');
  const copyPhoneBtn = document.querySelector('.copy-phone-btn');

  // ---------- Contact bouton (redirige directement vers WhatsApp) ----------
  const contactBtn = document.getElementById('contactBtn');
  if (contactBtn) {
    contactBtn.addEventListener('click', function (e) {
      // allow normal anchor behavior to open in new tab (href provided)
      // but ensure href is safe/normalized first
      const href = contactBtn.getAttribute('href') || '';
      const isWaHref = /wa\.me|api\.whatsapp\.com/.test(href);
      if (!isWaHref) {
        e.preventDefault();
        // fallback to constructing from phone number if no wa href
        let digits = phoneNumberEl ? normalizePhoneDigits(phoneNumberEl.textContent || '') : '';
        if (!digits) digits = '261384083704';
        const waUrl = `https://wa.me/${digits}`;
        openInNewTab(waUrl);
      }
      // if wa href present, default anchor behavior (target=_blank) will handle it
    });
  }

  // ---------- Copie du numéro (bouton séparé) ----------
  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', function () {
      const text = phoneNumberEl ? phoneNumberEl.textContent.trim() : '';
      if (!text) { alert('Aucun numéro trouvé.'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showCopyToast('Numéro copié : ' + text);
        }, function () {
          alert('Impossible de copier le numéro automatiquement. Veuillez le sélectionner manuellement.');
        });
      } else {
        alert('Copiez le numéro manuellement : ' + text);
      }
    });
  }

  function showCopyToast(message) {
    const prev = document.querySelector('.copy-toast');
    if (prev) prev.remove();
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  // ---------- WhatsApp inline et flottant (création DOM + SVG via createElementNS) ----------
  (function initWhatsApp() {
    const svgNS = 'http://www.w3.org/2000/svg';

    const createWhatsAppSvg = (size = 22, fill = '#fff') => {
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');

      const path1 = document.createElementNS(svgNS, 'path');
      path1.setAttribute('d', 'M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 .01 5.37.01 12c0 2.12.55 4.18 1.6 6.01L0 24l6.2-1.6A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.2-3.48-8.52z');
      path1.setAttribute('fill', '#25D366');

      const path2 = document.createElementNS(svgNS, 'path');
      // simplified white glyph path for phone bubble (keeps icon recognizable)
      path2.setAttribute('d', 'M17.1 14.1c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.18.2-.36.22-.66.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.33.45-.5.15-.17.2-.28.3-.47.1-.2.05-.37-.02-.52-.07-.16-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.56-.01-.18 0-.47.07-.72.34-.25.28-.96.94-.96 2.29 0 1.36.98 2.68 1.12 2.87.13.2 1.94 3.02 4.7 4.23 2.76 1.21 2.76.81 3.26.76.5-.05 1.62-.66 1.85-1.3.23-.64.23-1.18.16-1.3-.06-.12-.27-.19-.57-.34z');
      path2.setAttribute('fill', '#fff');

      svg.appendChild(path1);
      svg.appendChild(path2);
      return svg;
    };

    const safeUrl = (u) => {
      try {
        if (!u) return '';
        const parsed = new URL(u, location.href);
        if (parsed.hostname.includes('wa.me') || parsed.hostname.includes('api.whatsapp.com')) return parsed.href;
        if (parsed.protocol === 'https:') return parsed.href;
      } catch (err) { /* invalid url */ }
      return '';
    };

    // Ensure there's an inline WA button if none exists (phone + copy present)
    let waAnchor = document.querySelector('a.whatsapp-inline');
    if (!waAnchor && phoneNumberEl) {
      const digits = normalizePhoneDigits(phoneNumberEl.textContent || '');
      if (digits.length >= 8) {
        const waUrl = safeUrl('https://wa.me/' + digits);
        if (waUrl) {
          const phoneContainer = phoneNumberEl.closest('.phone');
          if (phoneContainer) {
            const a = document.createElement('a');
            a.className = 'whatsapp-inline btn';
            a.href = waUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.title = 'Contacter via WhatsApp';
            a.setAttribute('aria-label', 'Contacter via WhatsApp');
            a.appendChild(document.createTextNode('Nous contacter'));
            a.appendChild(createWhatsAppSvg(18));
            phoneContainer.appendChild(a);
            waAnchor = a;
          }
        }
      }
    } else if (waAnchor) {
      // ensure class present
      waAnchor.classList.add('whatsapp-inline');
    }

    // Floating button
    if (!document.querySelector('.whatsapp-float')) {
      let waUrl = '';
      const existingWa = document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (existingWa) waUrl = safeUrl(existingWa.href);
      else if (phoneNumberEl) {
        const digits = normalizePhoneDigits(phoneNumberEl.textContent || '');
        if (digits.length >= 8) waUrl = safeUrl('https://wa.me/' + digits);
      }
      if (waUrl) {
        const floatBtn = document.createElement('a');
        floatBtn.href = waUrl;
        floatBtn.className = 'whatsapp-float';
        floatBtn.target = '_blank';
        floatBtn.rel = 'noopener noreferrer';
        floatBtn.setAttribute('aria-label', 'Contacter via WhatsApp');
        floatBtn.setAttribute('role', 'button');

        // label
        const label = document.createElement('span');
        label.className = 'wa-label';
        label.textContent = 'Contactez-nous';
        floatBtn.appendChild(label);

        // svg
        floatBtn.appendChild(createWhatsAppSvg(24, '#fff'));

        floatBtn.addEventListener('click', function (e) {
          e.preventDefault();
          openInNewTab(waUrl);
        });
        floatBtn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openInNewTab(waUrl);
          }
        });
        document.body.appendChild(floatBtn);
      }
    }
  })();

  // ---------- Expansion / interaction des contextes ----------
  const contextsContainer = document.querySelector('.contexts');
  const contexts = Array.from(document.querySelectorAll('.context'));

  contexts.forEach(ctx => {
    if (!ctx.hasAttribute('tabindex')) ctx.setAttribute('tabindex', '0');

    ctx.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      toggleContext(ctx);
    });

    ctx.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleContext(ctx);
      } else if (e.key === 'Escape') {
        collapseAllContexts();
      }
    });
  });

  function toggleContext(target) {
    const isExpanded = target.classList.contains('expanded');
    collapseAllContexts();
    if (!isExpanded) {
      target.classList.add('expanded');
      if (contextsContainer) contextsContainer.classList.add('single-expanded');
      if (contextsContainer && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      const focusable = target.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }
  }

  function collapseAllContexts() {
    contexts.forEach(c => c.classList.remove('expanded'));
    if (contextsContainer) contextsContainer.classList.remove('single-expanded');
  }

  // Collapse contexts when clicking outside them
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.context') && !e.target.closest('.modal') && !e.target.closest('.whatsapp-float')) {
      collapseAllContexts();
    }
  });

  // ---------- Modales Footer with improved focus trap ----------
  const footerLinks = document.querySelectorAll('.footer-link[data-modal]');
  const modals = {
    terms: document.getElementById('termsModal'),
    privacy: document.getElementById('privacyModal')
  };

  // Keep track of last focused element to restore focus on close
  let lastFocused = null;
  // store active trap handlers
  const activeTraps = new WeakMap();

  footerLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const key = link.getAttribute('data-modal');
      const modal = modals[key];
      if (modal) openModal(modal, link);
    });
    link.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const key = link.getAttribute('data-modal');
        const modal = modals[key];
        if (modal) openModal(modal, link);
      }
    });
  });

  // Utility: find focusable elements
  function getFocusableElements(container) {
    if (!container) return [];
    const selectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable=true]';
    return Array.from(container.querySelectorAll(selectors)).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length);
  }

  // Open modal
  function openModal(modalEl, triggerEl) {
    if (!modalEl) return;
    lastFocused = triggerEl || document.activeElement;
    modalEl.classList.remove('hidden');
    modalEl.setAttribute('aria-hidden', 'false');

    // Focus first focusable element inside modal or the close button
    const focusable = getFocusableElements(modalEl)[0] || modalEl.querySelector('.modal-close');
    if (focusable) focusable.focus();

    // Add overlay click
    modalEl.addEventListener('click', onOverlayClick);

    // Add keydown handler for ESC and Tab trap
    const keyHandler = function (e) {
      if (e.key === 'Escape') {
        closeModal(modalEl);
      } else if (e.key === 'Tab') {
        // implement focus trap (cycle focus)
        const focusables = getFocusableElements(modalEl);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else { // Tab
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', keyHandler);
    activeTraps.set(modalEl, keyHandler);
  }

  // Close modal
  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.setAttribute('aria-hidden', 'true');

    modalEl.removeEventListener('click', onOverlayClick);
    const handler = activeTraps.get(modalEl);
    if (handler) {
      document.removeEventListener('keydown', handler);
      activeTraps.delete(modalEl);
    }

    // Restore focus
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  // Click outside panel closes modal
  function onOverlayClick(e) {
    const panel = e.currentTarget.querySelector('.modal-panel');
    if (!panel) return;
    if (!panel.contains(e.target)) {
      closeModal(e.currentTarget);
    }
  }

  // Close buttons inside modals
  document.querySelectorAll('.modal .modal-close').forEach(btn => {
    btn.addEventListener('click', function () {
      const modalEl = btn.closest('.modal');
      closeModal(modalEl);
    });
  });

  // Prevent focus from escaping modal while open (additional guard)
  document.addEventListener('focusin', function (e) {
    const openModalEl = Object.values(modals).find(m => m && !m.classList.contains('hidden'));
    if (!openModalEl) return;
    if (!openModalEl.contains(e.target)) {
      const focusable = getFocusableElements(openModalEl)[0] || openModalEl.querySelector('.modal-close');
      if (focusable) focusable.focus();
    }
  });

  // ---------- Touch: close expanded context on swipe down (mobile friendly) ----------
  if ('ontouchstart' in window && contextsContainer) {
    let startY = 0;
    contextsContainer.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) startY = e.touches[0].clientY;
    }, { passive: true });

    contextsContainer.addEventListener('touchend', function (e) {
      const endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : 0;
      if (startY && endY && (endY - startY) > 80) {
        // swipe down detected
        collapseAllContexts();
      }
      startY = 0;
    }, { passive: true });
  }
});
