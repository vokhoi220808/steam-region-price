export function el(tag, attrs, ...children) {
  const element = document.createElement(tag);
  
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className' || key === 'class') {
        element.className = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const [dataKey, dataVal] of Object.entries(value)) {
          element.dataset[dataKey] = dataVal;
        }
      } else if (key === 'style' && typeof value === 'object') {
        for (const [styleKey, styleVal] of Object.entries(value)) {
          element.style[styleKey] = styleVal;
        }
      } else if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    }
  }

  for (const child of children) {
    if (child instanceof Node) {
      element.appendChild(child);
    } else if (child !== null && child !== undefined) {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

export function text(str) {
  return document.createTextNode(String(str));
}

export function fragment(...children) {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (child instanceof Node) {
      frag.appendChild(child);
    } else if (child !== null && child !== undefined) {
      frag.appendChild(document.createTextNode(String(child)));
    }
  }
  return frag;
}

export const $ = document.querySelector.bind(document);
export const $$ = document.querySelectorAll.bind(document);

export function show(element) {
  if (element) {
    element.classList.remove('hidden');
    if (element.style.display === 'none') {
      element.style.display = '';
    }
  }
}

export function hide(element) {
  if (element) {
    element.classList.add('hidden');
  }
}

export function toggle(element, condition) {
  if (element) {
    const shouldShow = condition !== undefined ? condition : element.classList.contains('hidden');
    if (shouldShow) {
      show(element);
    } else {
      hide(element);
    }
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function focusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hidden && element.offsetParent !== null);
}

export function createFocusTrap(container, onEscape) {
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onEscape?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusableElements(container);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container?.addEventListener('keydown', handleKeyDown);
  return () => container?.removeEventListener('keydown', handleKeyDown);
}
