(() => {
  'use strict';
  const api=AxiomMigration, cardSelector='[class~="group/pulseRow"],div[class*="border-primaryStroke"][class~="group"][class*="cursor-pointer"]';
  const iconSelector='i.ri-vip-crown-2-line';
  const registry=new Map(),oneLabels=new Map(),hiddenCrowns=new Set(),dirty=new Set();
  let settings=api.normalize(),timer=null;
  const own=node=>(node.nodeType===1?node:node.parentElement)?.closest('.axiom-migration-value,.axiom-migration-one');
  function cleanup(el,entry) {entry.badge.remove();entry.anchor?.classList.remove('axiom-migration-empty-counter');el.classList.remove('axiom-migration-native');registry.delete(el);}
  function direct(el) {return [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim();}
  function counts(icon) {
    // Only siblings of the native developer crown: never funding-wallet ratios.
    const parent=icon.parentElement;
    if (!parent) return null;
    return [...parent.children].filter(el=>el!==icon&&!own(el)).flatMap(el=>[el,...el.querySelectorAll('span')]).find(el=>!own(el)&&api.parse(direct(el)));
  }
  function process(card) {
    const found=new Set();
    // Restore only our own layout class before re-evaluating recycled counters.
    for(const entry of registry.values())if(entry.card===card)entry.anchor?.classList.remove('axiom-migration-empty-counter');
    let firstCoin=false,seenCounter=false;
    if (!/^\/pulse\/?$/.test(location.pathname)) return;
    for (const icon of card.querySelectorAll(iconSelector)) {
      icon.classList.toggle('axiom-migration-hidden-crown',settings.hideMigrationCrownEnabled);
      if(settings.hideMigrationCrownEnabled)hiddenCrowns.add(icon);else hiddenCrowns.delete(icon);
      const el=counts(icon);
      if (!el) continue;
      const data=api.parse(direct(el));
      if (!data) continue;
      if(!seenCounter){firstCoin=data.total===1;seenCounter=true;}
      if(!settings.enabled)continue;
      found.add(el);
      let entry=registry.get(el);
      if (!entry) {
        const nativeStyle=getComputedStyle(el),size=parseFloat(nativeStyle.fontSize)||12;
        const badge=document.createElement('span');badge.className='axiom-migration-value';
        const numbers=document.createElement('span'),percentage=document.createElement('span');
        numbers.className='axiom-migration-counts';percentage.className='axiom-migration-percent';
        badge.append(numbers,percentage);
        badge.style.setProperty('--am-count-color',nativeStyle.color);
        entry={badge,numbers,percentage,size,card};registry.set(el,entry);
      }
      entry.card=card;
      // Keep the native crown block's textContent untouched for native tooltips.
      const anchor=icon.parentElement;
      entry.anchor=anchor;
      if (entry.badge.previousSibling!==anchor) anchor.after(entry.badge);
      el.classList.add('axiom-migration-native');
      // The badge sits after the native block. With both native children hidden,
      // collapse the empty flex item too, otherwise the row still allocates a gap.
      // Never collapse a container that also holds unrelated metrics or controls.
      const onlyCounter=[...anchor.children].every(child=>child===icon||child===el||child.contains(el));
      if(settings.hideMigrationCrownEnabled&&onlyCounter)anchor.classList.add('axiom-migration-empty-counter');
      const text=`${data.migrated}/${data.total}`,percent=api.format(data.percent);
      if(entry.numbers.textContent!==text)entry.numbers.textContent=text;
      if(entry.percentage.textContent!==percent)entry.percentage.textContent=percent;
      entry.badge.dataset.hideCounts=String(settings.hideCounts);
      entry.badge.style.setProperty('--am-size',`${entry.size*settings.scale}px`);
      entry.badge.style.setProperty('--am-color',api.colorFor(data.percent,settings));
      const hint=data.percent===null?'Всего 0 токенов — процент не определён':`${data.migrated} миграций / ${data.total} токенов × 100`;
      if(entry.badge.title!==hint)entry.badge.title=hint;
      entry.badge.setAttribute('aria-label',`${text}; ${percent}`);
    }
    for(const [el,entry] of registry) if(entry.card===card&&!found.has(el))cleanup(el,entry);
    const showOne=settings.oneBuyBadgeEnabled&&firstCoin;
    for(const button of card.querySelectorAll('button[class*="group/quickBuyButton"]')){
      let label=oneLabels.get(button);
      if(!showOne){if(label){label.remove();oneLabels.delete(button);}continue;}
      if(!label){label=document.createElement('span');label.className='axiom-migration-one';label.textContent='ONE';label.setAttribute('aria-hidden','true');oneLabels.set(button,label);}
      if(settings.oneColor)label.style.color=settings.oneColor;else label.style.removeProperty('color');
      if(label.parentElement!==button)button.append(label);
    }
    for(const [button,label] of oneLabels)if(card.contains(button)&&(!showOne||!button.matches('button[class*="group/quickBuyButton"]'))){label.remove();oneLabels.delete(button);}
  }
  function flush() {
    timer=null;
    const pulse=/^\/pulse\/?$/.test(location.pathname);
    const active=(settings.enabled||settings.oneBuyBadgeEnabled||settings.hideMigrationCrownEnabled)&&pulse;
    for(const icon of hiddenCrowns)if(!settings.hideMigrationCrownEnabled||!pulse||!icon.isConnected||!icon.closest(cardSelector)){icon.classList.remove('axiom-migration-hidden-crown');hiddenCrowns.delete(icon);}
    for(const [el,entry] of registry) if(!settings.enabled||!pulse||!el.isConnected||!entry.badge.isConnected)cleanup(el,entry);
    for(const [button,label] of oneLabels)if(!settings.oneBuyBadgeEnabled||!pulse||!button.isConnected||!label.isConnected){label.remove();oneLabels.delete(button);}
    if(!active){dirty.clear();return;}
    for(const card of dirty)if(card.isConnected)process(card);
    dirty.clear();
  }
  function schedule(card) {if(card)dirty.add(card);if(timer===null)timer=setTimeout(flush,80);}
  function scan(root=document) {
    if(root.matches?.(cardSelector))schedule(root);
    root.querySelectorAll?.(cardSelector).forEach(schedule);
    schedule();
  }
  new MutationObserver(records=>{
    for(const r of records){
      if(own(r.target))continue;
      if(r.type==='childList'&&[...r.addedNodes,...r.removedNodes].every(n=>n.nodeType===1&&n.matches('.axiom-migration-value,.axiom-migration-one')))continue;
      const el=r.target.nodeType===1?r.target:r.target.parentElement;
      const card=el?.closest(cardSelector);
      if(card){
        if(r.type==='characterData'&&!/\//.test(r.target.nodeValue||'')&&!el.classList.contains('axiom-migration-native'))continue;
        schedule(card);
      }else if(r.type==='childList'){for(const n of r.addedNodes)if(n.nodeType===1)scan(n);schedule();}
    }
  }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  chrome.storage.local.get('axiomMigration').then(d=>{settings=api.normalize(d.axiomMigration);scan();}).catch(()=>scan());
  chrome.storage.onChanged.addListener((c,area)=>{if(area==='local'&&c.axiomMigration){settings=api.normalize(c.axiomMigration.newValue);scan();clearTimeout(timer);flush();}});
  addEventListener('popstate',()=>scan());
  scan();
})();
