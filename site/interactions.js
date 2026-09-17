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
  let stopHomeMotion = () => {};
  let stopHome3D = () => {};
  const graphicsUrl = new URL('home-3d.js', document.currentScript.src).href;
  function mountGraphics() {
    stopHome3D();
    stopHome3D = window.furiveMount3D?.(document.querySelector('.furive-home')) || (() => {});
  }
  window.addEventListener('furive-3d-ready', mountGraphics);
  function homeMotion(root) {
    if (!root) return () => {};
    const hero = root.querySelector('.furive-hero');
    const journey = root.querySelector('.furive-journey');
    const steps = [...root.querySelectorAll('.furive-journey-step')];
    if (!hero || !journey || !steps.length) return () => {};
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const planes=[...root.querySelectorAll('[data-story-scenes]')];
    const tabs=[...root.querySelectorAll('[data-story-step]')];
    const previous=root.querySelector('.furive-story-prev'),next=root.querySelector('.furive-story-next');
    let active=0,frame=0;
    const clamp = value => Math.max(0, Math.min(1, value));
    function selectStep(index){
      active=index;const scene=steps[index].dataset.scene;
      journey.dataset.step=scene;
      steps.forEach((step,i)=>step.hidden=i!==index);
      planes.forEach(plane=>plane.hidden=!plane.dataset.storyScenes.split(' ').includes(scene));
      tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
      previous.disabled=index===0;
      next.textContent=index===steps.length-1?'처음부터 보기 ↻':`다음: ${tabs[index+1].querySelector('span').textContent} →`;
      root.querySelector('.furive-story-count').textContent=`0${index+1} / 05`;
    }
    function select(event){selectStep(tabs.indexOf(event.currentTarget));}
    function backward(){selectStep(Math.max(0,active-1));}
    function forward(){selectStep((active+1)%steps.length);}
    function keys(event){
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const index=event.key==='Home'?0:event.key==='End'?steps.length-1:(active+(event.key==='ArrowRight'?1:steps.length-1))%steps.length;
      selectStep(index);tabs[index].focus();
    }
    function anchor(event){
      const link=event.target.closest('a[href^="#case-"]');if(!link)return;
      const index=steps.findIndex(step=>`#${step.id}`===link.getAttribute('href'));if(index<0)return;
      event.preventDefault();selectStep(index);journey.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
    }
    tabs.forEach(tab=>{tab.addEventListener('click',select);tab.addEventListener('keydown',keys);});
    previous.addEventListener('click',backward);next.addEventListener('click',forward);root.addEventListener('click',anchor);
    selectStep(Math.max(0,steps.findIndex(step=>`#${step.id}`===location.hash)));
    function render() {
      frame=0;const heroBox=hero.getBoundingClientRect();
      hero.style.setProperty('--hero-scroll',reduced.matches?0:clamp(-heroBox.top/heroBox.height));
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(render);
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      }
    }, { threshold: .08 });
    for (const item of root.querySelectorAll('.furive-reveal, .furive-card, .furive-gallery figure')) {
      item.classList.add('furive-reveal');
      observer.observe(item);
    }
    for (const item of root.querySelectorAll('.furive-section-intro h2, .furive-journey-step h3, .furive-journey-step > p, .furive-result-intro h2, .furive-story-intro h2')) { item.classList.add('furive-text-motion'); observer.observe(item); }
    root.classList.add('has-home-motion');
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    reduced.addEventListener('change', schedule);
    render();
    // Follow the data, not just a set of pulsing cards: push, checkout/build,
    // worker tests, report, then a signed artifact delivered to the cloud.
    const pipeline = root.querySelector('.furive-verify-plane');
    const paths = [...pipeline.querySelectorAll('[data-ci-flow]')];
    const lengths = paths.map(path => path.getTotalLength());
    const packets = [...pipeline.querySelectorAll('.ci-packet')];
    const labels = ['Push · 변경 코드를 GitHub로 전송', 'Checkout · 코드를 가져와 빌드', 'Test · 검사 작업 자동 실행', 'Report · 검사 결과 수집', 'Publish · 서명된 새 버전 배포'];
    let pipelineFrame = 0, pipelineLast = 0, pipelineTime = 0, pipelineVisible = false;
    function animatePipeline(now) {
      pipelineFrame = 0;
      if (!pipelineVisible || document.hidden || journey.dataset.step !== 'verify') return;
      const moving = !reduced.matches && root.dataset.motionPaused !== 'true';
      if (pipelineLast && moving) pipelineTime += (now - pipelineLast) / 1000;
      pipelineLast = now;
      const t = reduced.matches ? 12 : pipelineTime % 12.5;
      const phase = Math.min(4, Math.floor(t / 2.5)), progress = (t % 2.5) / 2.5;
      if (pipeline.dataset.ciPhase !== String(phase)) {
        pipeline.dataset.ciPhase = String(phase);
        pipeline.querySelector('.furive-ci-live b').textContent = labels[phase];
      }
      paths.forEach((path, index) => path.classList.toggle('is-active', index === phase));
      packets.forEach((packet, index) => {
        packet.style.visibility = reduced.matches ? 'hidden' : 'visible';
        const point = paths[phase].getPointAtLength(lengths[phase] * ((progress * 2 + index * .5) % 1));
        packet.setAttribute('cx', point.x); packet.setAttribute('cy', point.y);
      });
      const advance = phase < 2 ? 0 : phase > 2 ? 60 : 60 * (1 - (1 - progress) ** 2);
      pipeline.querySelector('.ci-test-car').setAttribute('transform', `translate(${advance} 0)`);
      if (moving) pipelineFrame = requestAnimationFrame(animatePipeline);
    }
    function wakePipeline() {
      cancelAnimationFrame(pipelineFrame); pipelineLast = 0;
      if (pipelineVisible && !document.hidden) pipelineFrame = requestAnimationFrame(animatePipeline);
    }
    const pipelineVisibility = new IntersectionObserver(([entry]) => { pipelineVisible = entry.isIntersecting; wakePipeline(); });
    pipelineVisibility.observe(pipeline);
    // Editing must finish before commit and push. Keep one clock so pausing,
    // reduced motion and offscreen time cannot desynchronize the terminal.
    const source = root.querySelector('.furive-source-plane');
    const edits = [...source.querySelectorAll('.code-added code')];
    const commit = source.querySelector('.furive-git-commit'), push = source.querySelector('.furive-git-command');
    const output = source.querySelector('.furive-git-output'), pushState = source.querySelector('.furive-push-state');
    const fileState = source.querySelector('.furive-editor-tab > span');
    let sourceFrame = 0, sourceLast = 0, sourceTime = 0, sourceVisible = false;
    const revealText = (element, progress) => { element.style.clipPath = `inset(0 ${100 - Math.floor(clamp(progress) * 100)}% 0 0)`; };
    function animateSource(now) {
      sourceFrame = 0;
      if (!sourceVisible || document.hidden || journey.dataset.step !== 'connect') return;
      const moving = !reduced.matches && root.dataset.motionPaused !== 'true';
      if (sourceLast && moving) sourceTime += (now-sourceLast)/1000;
      sourceLast = now;
      const t = reduced.matches ? 12 : sourceTime % 14;
      const phase = t < 3.4 ? 0 : t < 5.2 ? 1 : t < 6.8 ? 2 : t < 10 ? 3 : 4;
      if (source.dataset.editPhase !== String(phase)) source.dataset.editPhase = String(phase);
      edits.forEach((line,index) => revealText(line,(t-.25-index*1.35)/1.35));
      revealText(commit,(t-3.4)/1.3);revealText(push,(t-5.2)/1.2);
      const progress = clamp((t-6.8)/3.2);
      source.style.setProperty('--push-progress',progress);
      fileState.textContent = phase === 0 ? '수정 중 ●' : '저장 완료 ✓';
      pushState.textContent = ['GitHub · 전송 대기','GitHub · 전송 대기','GitHub · 전송 대기','GitHub · 전송 중','GitHub · 반영 완료 ✓'][phase];
      output.textContent = phase === 0 ? '코드 수정 중…' : phase === 1 ? '커밋 생성 중…' : phase === 2 ? '[fix/pedestrian-stop] Fix pedestrian braking' : phase === 3 ? `Enumerating objects: 5, done.\nWriting objects: ${Math.floor(progress*100)}% (${Math.floor(progress*5)}/5)` : 'Writing objects: 100% (5/5), done.\nfix/pedestrian-stop → fix/pedestrian-stop';
      if(moving) sourceFrame=requestAnimationFrame(animateSource);
    }
    function wakeSource(){cancelAnimationFrame(sourceFrame);sourceLast=0;if(sourceVisible&&!document.hidden)sourceFrame=requestAnimationFrame(animateSource);}
    function wakeFlows(){wakePipeline();wakeSource();}
    const sourceVisibility=new IntersectionObserver(([entry])=>{sourceVisible=entry.isIntersecting;wakeSource();});sourceVisibility.observe(source);
    const pipelineState = new MutationObserver(wakeFlows);
    pipelineState.observe(root, {attributes: true, attributeFilter: ['data-motion-paused']});
    let previousPipelineStep = journey.dataset.step;
    const pipelineStep = new MutationObserver(() => {
      if (journey.dataset.step === previousPipelineStep) return;
      previousPipelineStep = journey.dataset.step;
      if (previousPipelineStep === 'verify') pipelineTime = 0;
      if (previousPipelineStep === 'connect') sourceTime = 0;
      wakeFlows();
    });
    pipelineStep.observe(journey, {attributes: true, attributeFilter: ['data-step']});
    document.addEventListener('visibilitychange', wakeFlows);
    reduced.addEventListener('change', wakeFlows);
    return () => {
      cancelAnimationFrame(sourceFrame);sourceVisibility.disconnect();
      cancelAnimationFrame(pipelineFrame); pipelineVisibility.disconnect(); pipelineState.disconnect(); pipelineStep.disconnect();
      document.removeEventListener('visibilitychange', wakeFlows); reduced.removeEventListener('change', wakeFlows);
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
      tabs.forEach(tab=>{tab.removeEventListener('click',select);tab.removeEventListener('keydown',keys);});
      previous.removeEventListener('click',backward);next.removeEventListener('click',forward);root.removeEventListener('click',anchor);
      root.classList.remove('has-home-motion');
    };
  }
  let stopProductMedia = () => {};
  function productMedia() {
    const videos = [...document.querySelectorAll('.furive-home video')];
    if (!videos.length) return () => {};
    const demos = [...document.querySelectorAll('.furive-demo-card')];
    async function playDemo(event) {
      const video = event.currentTarget.closest('.furive-demo-card').querySelector('video');
      try { video.controls = true; await video.play(); } catch { announce('영상을 재생하지 못했습니다. 다시 눌러 주세요.'); }
    }
    function syncDemo(event) {
      const video = event.currentTarget;
      video.closest('.furive-demo-card').querySelector('.furive-demo-play').hidden = !video.paused;
      if (!video.paused) videos.forEach(other => { if (other !== video) other.pause(); });
    }
    demos.forEach(card => {
      const button = card.querySelector('.furive-demo-play'), video = card.querySelector('video');
      video.controls = false;button.hidden = false;button.addEventListener('click', playDemo);
      video.addEventListener('play', syncDemo);video.addEventListener('pause', syncDemo);video.addEventListener('ended', syncDemo);
    });
    const visibility = new IntersectionObserver(entries => { entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); }); });
    videos.forEach(item => visibility.observe(item));
    function hide() { if (document.hidden) videos.forEach(item => item.pause()); }
    document.addEventListener('visibilitychange', hide);
    return () => { visibility.disconnect();document.removeEventListener('visibilitychange', hide);demos.forEach(card => { const video=card.querySelector('video');card.querySelector('.furive-demo-play').removeEventListener('click', playDemo);for(const name of ['play','pause','ended'])video.removeEventListener(name,syncDemo); });videos.forEach(item => item.pause()); };
  }
  let stopFleetUpdates = () => {};
  function fleetUpdates() {
    const host = document.querySelector('.furive-fleet');
    if (!host) return () => {};
    const root = host.closest('.furive-home'), loop = host.closest('.furive-loop');
    const vehicles = [...host.querySelectorAll('.furive-fleet-vehicle')];
    const steps = [...loop.querySelectorAll('.furive-loop-step')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, frame = 0, last = 0, elapsed = 0;
    function render(now) {
      frame = 0;
      if (!visible || document.hidden) return;
      const moving = !reduced.matches && root.dataset.motionPaused !== 'true';
      if (last && moving) elapsed += (now - last) / 1000;
      last = now;
      const time = reduced.matches ? 6.8 : elapsed % 9;
      const round = Math.floor(elapsed / 9) % 3 + 1;
      const phase = time < 1.3 ? 0 : time < 2.6 ? 1 : time < 6.3 ? 2 : 3;
      const roundChanged = host.dataset.round !== String(round);
      if (roundChanged) host.dataset.round = String(round);
      const phaseName = ['code', 'check', 'deploy', 'confirm'][phase];
      if (host.dataset.fleetPhase !== phaseName) host.dataset.fleetPhase = phaseName;
      host.querySelector('.furive-fleet-source b').textContent = `개선 0${round}`;
      steps.forEach((step, i) => {
        if (step.dataset.active !== String(i === phase)) step.dataset.active = String(i === phase);
      });
      host.querySelector('.furive-fleet-packets').style.strokeDashoffset = String(-time * 70);
      vehicles.forEach((vehicle, i) => {
        const progress = Math.max(0, Math.min(1, (time - 2.6) / (2.8 + i * .25)));
        const state = progress === 1 ? 'complete' : progress > 0 ? 'receiving' : 'ready';
        vehicle.style.setProperty('--fleet-progress', progress);
        if (vehicle.dataset.state !== state || roundChanged) {
          vehicle.dataset.state = state;
          vehicle.querySelector('b').textContent = state === 'complete' ? `개선 0${round} 적용 ✓` : state === 'receiving' ? '새 버전 수신 중' : round === 1 ? '기존 버전 실행' : `개선 0${round - 1} 실행`;
        }
      });
      if (moving) frame = requestAnimationFrame(render);
    }
    function wake() {
      cancelAnimationFrame(frame); last = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(render);
    }
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
    visibility.observe(host);
    const paused = new MutationObserver(wake);
    paused.observe(root, { attributes: true, attributeFilter: ['data-motion-paused'] });
    document.addEventListener('visibilitychange', wake); reduced.addEventListener('change', wake);
    return () => {
      cancelAnimationFrame(frame); visibility.disconnect(); paused.disconnect();
      document.removeEventListener('visibilitychange', wake); reduced.removeEventListener('change', wake);
    };
  }
  function coreTools() {
    const root = document.querySelector('.furive-core-tools');
    if (!root || root.dataset.enhanced) return;
    root.dataset.enhanced = 'true';
    const tabs = [...root.querySelectorAll('[role=tab]')];
    const panels = [...root.querySelectorAll('[role=tabpanel]')];
    function select(index) {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); select(next); tabs[next].focus();
      });
    });
    select(0);
    root.querySelector('[role=tablist]').hidden = false;
  }
  function homeNavigation() {
    if (!document.querySelector('.furive-home')) return;
    const drawer = document.querySelector('#__drawer');
    const toggle = document.querySelector('.md-header__button[for="__drawer"]');
    const navigation = document.querySelector('.md-sidebar--primary');
    if (!drawer || !toggle || !navigation || toggle.dataset.homeMenu) return;
    toggle.dataset.homeMenu = 'true'; toggle.tabIndex = 0;
    toggle.setAttribute('role', 'button'); toggle.setAttribute('aria-label', '문서 메뉴 열기');
    navigation.id = 'furive-document-menu'; toggle.setAttribute('aria-controls', navigation.id);
    function sync() { toggle.setAttribute('aria-expanded', String(drawer.checked)); }
    drawer.addEventListener('change', sync); sync();
    toggle.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle.click(); }
    });
    document.addEventListener('keydown', event => {
      if (!drawer.checked || !matchMedia('(min-width:76.25em)').matches) return;
      if (event.key === 'Escape') { drawer.checked = false; sync(); toggle.focus(); }
      if (event.key === 'Tab') {
        const items = [toggle, ...navigation.querySelectorAll('a[href]')].filter(el => el.getBoundingClientRect().height);
        const current = items.indexOf(document.activeElement);
        event.preventDefault(); items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      }
    });
  }
  function init() {
    homeNavigation();
    coreTools();
    stopProductMedia();stopProductMedia = productMedia();
    commandReference(document.querySelector('.furive-command-reference'));
    screenshots();
    stopHomeMotion();
    stopHomeMotion = homeMotion(document.querySelector('.furive-home'));
    stopFleetUpdates(); stopFleetUpdates = fleetUpdates();
    mountGraphics();
    if (document.querySelector('.furive-home') && !window.furiveMount3D && !document.querySelector('[data-furive-graphics]')) {
      const script = document.createElement('script');
      script.src = graphicsUrl;
      script.dataset.furiveGraphics = 'true';
      script.async = true;
      document.head.append(script);
    }
  }
  if (typeof document$ !== 'undefined') document$.subscribe(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
