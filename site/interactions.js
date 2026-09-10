/* Progressive enhancement: the Markdown remains the only command reference. */
(() => {
  "use strict";
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let toastTimer;
  function announce(message) {
    let toast = document.querySelector('.furive-toast');
    if (!toast) {
      toast = element('div', 'furive-toast');
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }
  function copyButton(command) {
    const button = element('button', 'furive-copy');
    button.type = 'button';
    button.title = '명령어 복사';
    button.setAttribute('aria-label', `${command} 복사`);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', 'M7 3h10v11H7z M4 6H2v12h11v-2');
    svg.append(path);
    button.append(svg);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(command);
        announce(command.includes('<') ? '복사했습니다. <괄호 안의 값>을 실제 값으로 바꿔 실행하세요.' : '명령어를 복사했습니다.');
      } catch {
        announce('복사하지 못했습니다. 표의 명령어를 선택해 직접 복사하세요.');
      }
    });
    return button;
  }
  function commandReference(root) {
    if (!root || root.dataset.enhanced) return;
    root.dataset.enhanced = 'true';
    const sections = [];
    for (const heading of [...root.querySelectorAll(':scope > h2')]) {
      const section = element('section', 'furive-command-section');
      heading.before(section);
      let next = heading.nextSibling;
      section.append(heading);
      while (next && !(next.nodeType === 1 && next.tagName === 'H2')) {
        const following = next.nextSibling;
        section.append(next);
        next = following;
      }
      const rows = [];
      for (const row of section.querySelectorAll('tbody tr')) {
        const code = [...row.querySelectorAll('code')].find(node => /^(?:\.\/)?furive(?:\s|$)/.test(node.textContent));
        if (!code) continue;
        const text = row.textContent.normalize('NFC').toLocaleLowerCase();
        code.parentElement.append(copyButton(code.textContent));
        rows.push({ node: row, text });
      }
      sections.push({ node: section, title: heading.textContent.replace(/¶$/, '').trim(), id: heading.id, rows });
    }
    if (!sections.length) return;
    const tools = element('div', 'furive-command-tools');
    tools.setAttribute('role', 'search');
    tools.setAttribute('aria-label', '이 페이지 명령어 검색');
    const label = element('label', '', '어떤 작업을 찾으시나요?');
    label.htmlFor = 'furive-command-query';
    const fields = element('div', 'furive-command-fields');
    const query = element('input');
    query.type = 'search';
    query.id = label.htmlFor;
    query.placeholder = '명령어나 작업 검색 · 예: 녹화, logs, 업데이트';
    query.autocomplete = 'off';
    const group = element('select');
    group.setAttribute('aria-label', '명령어 기능 선택');
    group.append(new Option('모든 기능', ''));
    sections.filter(section => section.rows.length).forEach(section => group.append(new Option(section.title, section.id)));
    fields.append(query, group);
    const meta = element('div', 'furive-command-meta');
    const result = element('span');
    result.setAttribute('role', 'status');
    result.setAttribute('aria-live', 'polite');
    const reset = element('button', 'furive-reset', '필터 초기화');
    reset.type = 'button';
    meta.append(result, reset);
    tools.append(label, fields, meta);
    sections[0].node.before(tools);
    const empty = element('p', 'furive-empty', '일치하는 명령어가 없습니다. 검색어를 줄이거나 기능을 전체로 바꿔 보세요.');
    empty.hidden = true;
    tools.after(empty);
    function filter() {
      const words = query.value.normalize('NFC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const active = Boolean(words.length || group.value);
      root.classList.toggle('is-filtering', active);
      let matches = 0;
      sections.forEach(section => {
        let visible = 0;
        section.rows.forEach(row => {
          const found = (!group.value || section.id === group.value) && words.every(word => row.text.includes(word));
          row.node.hidden = !found;
          if (found) visible++;
        });
        section.node.hidden = active && visible === 0;
        section.node.querySelectorAll('table').forEach(table => {
          const wrapper = table.closest('.md-typeset__scrollwrap') || table.closest('.md-typeset__table') || table;
          wrapper.hidden = active && ![...table.querySelectorAll('tbody tr')].some(row => !row.hidden);
        });
        matches += visible;
      });
      result.textContent = active ? `${matches}개 명령 예시 · 적용 조건을 함께 확인하세요` : `${matches}개 명령 예시 · 오른쪽 아이콘으로 복사`;
      empty.hidden = !active || matches > 0;
      reset.hidden = !active;
    }
    query.addEventListener('input', filter);
    group.addEventListener('change', filter);
    reset.addEventListener('click', () => { query.value = ''; group.value = ''; filter(); query.focus(); });
    filter();
  }
  function screenshots() {
    const root = document.querySelector('.furive-document:not(.furive-home)');
    if (!root) return;
    for (const source of root.querySelectorAll('img')) {
      if (source.dataset.zoom || !/\.(png|jpe?g|webp)(?:[?#]|$)/i.test(source.src)) continue;
      source.dataset.zoom = 'true';
      const controls = element('span', 'furive-image-control');
      const button = element('button', 'furive-zoom', '⤢ 화면 크게 보기');
      button.type = 'button';
      button.setAttribute('aria-label', `${source.alt || '화면 캡처'} 크게 보기`);
      controls.append(button);
      (source.closest('p') || source).after(controls);
      button.addEventListener('click', () => {
        const dialog = element('dialog', 'furive-lightbox');
        dialog.setAttribute('aria-label', source.alt || '화면 캡처 확대');
        const header = element('header');
        const close = element('button', '', '닫기 ✕');
        close.type = 'button';
        header.append(element('span', '', source.alt || '화면 캡처'), close);
        const image = element('img');
        image.src = source.currentSrc || source.src;
        image.alt = source.alt;
        dialog.append(header, image);
        document.body.append(dialog);
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
        dialog.addEventListener('close', () => { dialog.remove(); button.focus(); }, { once: true });
        dialog.showModal();
      });
    }
  }
  function init() {
    commandReference(document.querySelector('.furive-command-reference'));
    screenshots();
  }
  if (typeof document$ !== 'undefined') document$.subscribe(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
