function searchKey(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');
}

export function createDropdown(root, { placeholder = 'Chọn một mục', emptyMessage = 'Chưa có lựa chọn' } = {}) {
  const trigger = root.querySelector('.dropdown-trigger');
  const label = root.querySelector('.dropdown-value');
  const listbox = root.querySelector('.dropdown-options');
  const input = root.querySelector('input[type="hidden"]');
  let items = [];
  let typeahead = '';
  let typeaheadTimer = null;

  function close(restoreFocus = false) {
    listbox.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    if (restoreFocus) trigger.focus();
  }

  function choose(id) {
    const selected = items.find((item) => item.id === id);
    if (!selected) return;
    input.value = selected.id;
    label.textContent = selected.name;
    label.setAttribute('data-no-translate', '');
    root.dataset.selectedLabel = selected.name;
    for (const option of listbox.querySelectorAll('[role="option"]')) {
      option.setAttribute('aria-selected', String(option.dataset.value === selected.id));
    }
    root.classList.add('has-value');
    close(true);
    root.dispatchEvent(new CustomEvent('dropdown-change', { bubbles: true, detail: { id: selected.id, item: selected } }));
  }

  function setItems(nextItems, { keepSelection = false, empty = emptyMessage } = {}) {
    const oldValue = keepSelection ? input.value : '';
    items = [...nextItems];
    input.value = '';
    label.textContent = placeholder;
    label.removeAttribute('data-no-translate');
    root.classList.remove('has-value');
    listbox.replaceChildren();

    if (items.length === 0) {
      const emptyOption = document.createElement('span');
      emptyOption.className = 'dropdown-empty';
      emptyOption.setAttribute('role', 'presentation');
      emptyOption.textContent = empty;
      listbox.append(emptyOption);
      trigger.disabled = true;
      return;
    }

    trigger.disabled = false;
    for (const item of items) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'dropdown-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.value = item.id;
      option.setAttribute('data-no-translate', '');
      option.textContent = item.name;
      option.addEventListener('click', () => choose(item.id));
      listbox.append(option);
    }
    if (oldValue && items.some((item) => item.id === oldValue)) choose(oldValue);
  }

  function focusOption(position) {
    const options = [...listbox.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    options[Math.max(0, Math.min(position, options.length - 1))].focus();
  }

  function open(position = 0) {
    if (trigger.disabled) return;
    listbox.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    focusOption(position);
  }

  trigger.addEventListener('click', () => {
    if (trigger.getAttribute('aria-expanded') === 'true') close();
    else open(0);
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      open(items.length - 1);
    }
  });

  listbox.addEventListener('keydown', (event) => {
    const options = [...listbox.querySelectorAll('[role="option"]')];
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(currentIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      document.activeElement?.click();
    } else if (event.key === 'Tab') {
      close();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead += searchKey(event.key);
      clearTimeout(typeaheadTimer);
      typeaheadTimer = setTimeout(() => { typeahead = ''; }, 700);
      const matchIndex = items.findIndex((item) => searchKey(item.name).startsWith(typeahead));
      if (matchIndex >= 0) {
        event.preventDefault();
        focusOption(matchIndex);
      }
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) close();
  });
  root.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!root.contains(document.activeElement)) close();
    }, 0);
  });

  return {
    setItems,
    clear() {
      input.value = '';
      label.textContent = placeholder;
      label.removeAttribute('data-no-translate');
      root.classList.remove('has-value');
      for (const option of listbox.querySelectorAll('[role="option"]')) option.setAttribute('aria-selected', 'false');
    },
    get value() { return input.value; },
    get trigger() { return trigger; }
  };
}
