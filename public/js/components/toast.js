import { escapeHtml } from '../utils/dom.js';
import { icon } from './icons.js';

export function toast(message, type = 'success', title = '') {
  const region = document.querySelector('#toast-region');
  if (!region) return;

  // Native <dialog> elements use the browser's top layer, which is above every
  // ordinary z-index. Re-open the manual popover so new toasts join that layer
  // above an already-open dialog instead of being dimmed behind its backdrop.
  if (typeof region.showPopover === 'function') {
    try {
      if (region.matches(':popover-open')) region.hidePopover();
      region.showPopover();
    } catch {}
  }

  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.setAttribute('role', type === 'error' ? 'alert' : 'status');
  node.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info', 18)}</span><div>${title ? `<strong>${escapeHtml(title)}</strong>` : ''}${escapeHtml(message)}</div>`;
  region.append(node);
  window.setTimeout(() => {
    node.remove();
    if (!region.childElementCount && typeof region.hidePopover === 'function' && region.matches(':popover-open')) {
      region.hidePopover();
    }
  }, 4200);
}
