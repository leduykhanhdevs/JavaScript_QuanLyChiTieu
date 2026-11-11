import { icon } from './icons.js';

let generatedId = 0;
let openWidget = null;
let typeahead = '';
let typeaheadTimeout = 0;

const getTrigger = (widget) => widget?.querySelector('.custom-select-trigger');
const getMenu = (widget) => widget?.querySelector('.custom-select-menu');
const getSource = (widget) => widget?.querySelector('.custom-select-source');
const isOptionDisabled = (option) => option.disabled || option.parentElement?.disabled;

function enabledIndexes(select) {
  return Array.from(select.options, (option, index) => isOptionDisabled(option) ? -1 : index).filter((index) => index >= 0);
}

function positionMenu(widget) {
  const trigger = getTrigger(widget);
  const menu = getMenu(widget);
  if (!trigger || !menu || menu.hidden) return;

  const bounds = trigger.getBoundingClientRect();
  const desiredHeight = Math.min(288, menu.children.length * 38 + 12);
  const roomBelow = Math.max(0, window.innerHeight - bounds.bottom - 10);
  const roomAbove = Math.max(0, bounds.top - 10);
  const opensAbove = roomBelow < desiredHeight && roomAbove > roomBelow;
  const availableHeight = Math.max(64, opensAbove ? roomAbove : roomBelow);
  const menuHeight = Math.min(desiredHeight, availableHeight);
  const menuWidth = Math.min(bounds.width, window.innerWidth - 16);
  const left = Math.max(8, Math.min(bounds.left, window.innerWidth - menuWidth - 8));
  const top = opensAbove
    ? Math.max(8, bounds.top - menuHeight - 6)
    : Math.min(bounds.bottom + 6, window.innerHeight - menuHeight - 8);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.width = `${menuWidth}px`;
  menu.style.maxHeight = `${menuHeight}px`;
  widget.classList.toggle('opens-above', opensAbove);
}



function setActiveOption(widget, index) {
  const trigger = getTrigger(widget);
  const menu = getMenu(widget);
  const options = Array.from(menu?.querySelectorAll('[role="option"]') || []);
  if (!trigger || !options.length) return;

  const source = getSource(widget);
  const available = enabledIndexes(source);
  const nextIndex = available.includes(index) ? index : available[0];
  if (nextIndex === undefined) {
    trigger.removeAttribute('aria-activedescendant');
    return;
  }

  widget.dataset.activeIndex = String(nextIndex);
  options.forEach((option, optionIndex) => option.classList.toggle('is-active', optionIndex === nextIndex));
  trigger.setAttribute('aria-activedescendant', options[nextIndex].id);
  options[nextIndex].scrollIntoView({ block: 'nearest' });
}

function closeWidget(widget = openWidget, { restoreFocus = false } = {}) {
  if (!widget) return;
  const trigger = getTrigger(widget);
  const menu = getMenu(widget);
  widget.classList.remove('is-open', 'opens-above');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }
  if (menu) menu.hidden = true;
  if (openWidget === widget) openWidget = null;
}

function closeOpenWidget(options) {
  closeWidget(openWidget, options);
}

function openWidgetMenu(widget, requestedIndex = null) {
  if (openWidget && openWidget !== widget) closeOpenWidget();
  const source = getSource(widget);
  const trigger = getTrigger(widget);
  const menu = getMenu(widget);
  if (!source || !trigger || !menu || source.disabled || !menu.children.length) return;

  openWidget = widget;
  widget.classList.add('is-open');
  menu.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  positionMenu(widget);
  const selected = source.selectedIndex;
  const active = requestedIndex ?? (enabledIndexes(source).includes(selected) ? selected : enabledIndexes(source)[0]);
  setActiveOption(widget, active);
}

function renderOptionMenu(select, widget) {
  const menu = getMenu(widget);
  const selectedIndex = select.selectedIndex;
  menu.replaceChildren();

  Array.from(select.options).forEach((option, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'custom-select-option';
    item.id = `${menu.id}-option-${index}`;
    item.dataset.optionIndex = String(index);
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(index === selectedIndex));
    item.setAttribute('aria-posinset', String(index + 1));
    item.setAttribute('aria-setsize', String(select.options.length));
    item.tabIndex = -1;
    item.disabled = Boolean(isOptionDisabled(option));

    const label = document.createElement('span');
    label.className = 'custom-select-option-label';
    label.textContent = option.label || option.textContent.trim();
    const check = document.createElement('span');
    check.className = 'custom-select-option-check';
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML = index === selectedIndex ? icon('check', 14) : '';
    item.append(label, check);
    menu.append(item);
  });
}

export function syncCustomSelect(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  const widget = select.closest('.custom-select');
  if (!widget) return;

  const trigger = getTrigger(widget);
  const value = trigger?.querySelector('.custom-select-value');
  const selectedOption = select.selectedOptions[0];
  if (value) value.textContent = selectedOption?.label || selectedOption?.textContent.trim() || 'Chọn…';
  widget.classList.toggle('is-placeholder', Boolean(select.required && select.value === ''));
  widget.classList.toggle('is-disabled', select.disabled);
  if (trigger) {
    trigger.disabled = select.disabled;
    if (select.getAttribute('aria-invalid') === 'true') trigger.setAttribute('aria-invalid', 'true');
    else trigger.removeAttribute('aria-invalid');
    if (select.getAttribute('aria-describedby')) trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    else trigger.removeAttribute('aria-describedby');
  }

  renderOptionMenu(select, widget);
  if (openWidget === widget) {
    setActiveOption(widget, select.selectedIndex);
    positionMenu(widget);
  }
}

function enhanceSelect(select) {
  if (select.dataset.customSelectEnhanced === 'true' || select.multiple) return;

  const labels = Array.from(select.labels || []);
  const originalId = select.id;
  const controlId = originalId ? `${originalId}-control` : `custom-select-control-${++generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const labelText = select.getAttribute('aria-label') || labels.map((label) => label.textContent.replace(/\*/g, '').trim()).filter(Boolean).join(' ') || 'Chọn một mục';
  const parent = select.parentElement;
  if (!parent) return;

  const widget = document.createElement('div');
  widget.className = 'custom-select';
  widget.dataset.customSelect = 'true';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = controlId;
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-label', labelText);
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', listboxId);
  if (select.required) trigger.setAttribute('aria-required', 'true');
  if (select.getAttribute('aria-labelledby')) trigger.setAttribute('aria-labelledby', select.getAttribute('aria-labelledby'));

  const value = document.createElement('span');
  value.className = 'custom-select-value';
  const arrow = document.createElement('span');
  arrow.className = 'custom-select-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  trigger.append(value, arrow);

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.id = listboxId;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', labelText);
  menu.hidden = true;

  parent.insertBefore(widget, select);
  widget.append(select, trigger, menu);
  select.classList.add('custom-select-source');
  select.dataset.customSelectEnhanced = 'true';
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  labels.forEach((label) => {
    if (!label.htmlFor || label.htmlFor === originalId) label.htmlFor = controlId;
  });
  syncCustomSelect(select);
}

export function enhanceCustomSelects(root = document) {
  closeOpenWidget();
  const selects = root instanceof HTMLSelectElement ? [root] : Array.from(root.querySelectorAll('select'));
  selects.forEach(enhanceSelect);
}

function chooseOption(widget, index) {
  const select = getSource(widget);
  const trigger = getTrigger(widget);
  const option = select?.options[index];
  if (!select || !option || isOptionDisabled(option)) return;

  const changed = select.selectedIndex !== index;
  select.selectedIndex = index;
  syncCustomSelect(select);
  closeWidget(widget);
  const controlId = trigger?.id;
  if (changed) {
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (controlId) queueMicrotask(() => document.getElementById(controlId)?.focus({ preventScroll: true }));
}

function moveActiveOption(widget, direction) {
  const select = getSource(widget);
  const indexes = enabledIndexes(select);
  if (!indexes.length) return;
  const current = Number(widget.dataset.activeIndex);
  let position = indexes.indexOf(current);
  if (position < 0) position = direction > 0 ? -1 : 0;
  position = (position + direction + indexes.length) % indexes.length;
  setActiveOption(widget, indexes[position]);
}

function normalizeSearch(value) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

document.addEventListener('click', (event) => {
  const option = event.target.closest('.custom-select-option');
  if (option) {
    event.preventDefault();
    chooseOption(option.closest('.custom-select'), Number(option.dataset.optionIndex));
    return;
  }

  const trigger = event.target.closest('.custom-select-trigger');
  if (trigger) {
    event.preventDefault();
    const widget = trigger.closest('.custom-select');
    if (widget.classList.contains('is-open')) closeWidget(widget);
    else openWidgetMenu(widget);
    return;
  }

  if (openWidget && !openWidget.contains(event.target)) closeOpenWidget();
});

document.addEventListener('keydown', (event) => {
  const trigger = event.target.closest?.('.custom-select-trigger');
  if (!trigger) {
    if (event.key === 'Escape' && openWidget) closeOpenWidget({ restoreFocus: true });
    return;
  }

  const widget = trigger.closest('.custom-select');
  const isOpen = widget.classList.contains('is-open');
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!isOpen) openWidgetMenu(widget, event.key === 'ArrowUp' ? enabledIndexes(getSource(widget)).at(-1) : null);
    else moveActiveOption(widget, event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'Home' && isOpen) {
    event.preventDefault();
    setActiveOption(widget, enabledIndexes(getSource(widget))[0]);
  } else if (event.key === 'End' && isOpen) {
    event.preventDefault();
    setActiveOption(widget, enabledIndexes(getSource(widget)).at(-1));
  } else if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
    event.preventDefault();
    chooseOption(widget, Number(widget.dataset.activeIndex));
  } else if (event.key === ' ' && !isOpen) {
    event.preventDefault();
    openWidgetMenu(widget);
  } else if (event.key === 'Escape' && isOpen) {
    event.preventDefault();
    closeWidget(widget, { restoreFocus: true });
  } else if (event.key === 'Tab' && isOpen) {
    closeWidget(widget);
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    typeahead += normalizeSearch(event.key);
    window.clearTimeout(typeaheadTimeout);
    typeaheadTimeout = window.setTimeout(() => { typeahead = ''; }, 650);
    const select = getSource(widget);
    const index = Array.from(select.options).findIndex((option) => !isOptionDisabled(option) && normalizeSearch(option.label || option.textContent).startsWith(typeahead));
    if (index >= 0) {
      if (!isOpen) openWidgetMenu(widget, index);
      else setActiveOption(widget, index);
    }
  }
});

document.addEventListener('focusin', (event) => {
  if (openWidget && !openWidget.contains(event.target)) closeOpenWidget();
});

document.addEventListener('scroll', (event) => {
  if (!openWidget || event.target === getMenu(openWidget)) return;
  positionMenu(openWidget);
}, true);

window.addEventListener('resize', () => positionMenu(openWidget));
