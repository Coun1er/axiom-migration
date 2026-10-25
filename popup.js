(() => {
  const api=AxiomMigration,$=id=>document.getElementById(id);
  let settings=api.normalize(),pending=Promise.resolve(),loaded=false;
  function persist(snapshot){
    pending=pending.catch(()=>{}).then(()=>chrome.storage.local.set({axiomMigration:snapshot}));
    return pending;
  }
  function addRow(r={min:0,max:100,color:'#c5c7d0'}) {
    const row=document.createElement('div');row.className='range-row';
    for(const field of ['min','max','color']){
      const input=document.createElement('input');input.type=field==='color'?'color':'number';input.dataset.field=field;
      input.setAttribute('aria-label',field==='min'?'От, %':field==='max'?'До, %':'Цвет диапазона');
      if(field!=='color'){input.min=0;input.max=100;input.step='any';}input.value=r[field];row.append(input);
    }
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Удалить диапазон');
    remove.addEventListener('click',()=>{row.remove();preview();});row.append(remove);$('ranges').append(row);
  }
  function read(){return {enabled:$('enabled').checked,hideCounts:$('hideCounts').checked,oneBuyBadgeEnabled:$('oneBuyBadgeEnabled').checked,hideMigrationCrownEnabled:$('hideMigrationCrownEnabled').checked,scale:Number($('scale').value),baseColor:$('baseColor').value,
    ranges:[...$('ranges').children].map(row=>Object.fromEntries(['min','max','color'].map(k=>{const v=row.querySelector(`[data-field="${k}"]`).value;return [k,k==='color'?v:v.trim()===''?NaN:Number(v)];})))};}
  function preview(){
    const draft=read(),error=api.validateRanges(draft.ranges);$('error').textContent=error;$('status').textContent='';
    $('scaleValue').textContent=`${Math.round(draft.scale*100)}%`;
    $('preview').style.fontSize=`${12*draft.scale}px`;$('previewCounts').hidden=draft.hideCounts;
    $('previewPercent').style.color=api.colorFor(16,error?{...draft,ranges:[]}:draft);
  }
  function paint(){
    $('enabled').checked=settings.enabled;$('hideCounts').checked=settings.hideCounts;$('oneBuyBadgeEnabled').checked=settings.oneBuyBadgeEnabled;$('hideMigrationCrownEnabled').checked=settings.hideMigrationCrownEnabled;$('scale').value=settings.scale;$('baseColor').value=settings.baseColor;
    $('ranges').replaceChildren();settings.ranges.forEach(addRow);preview();
  }
  async function save(){
    const draft=read(),error=api.validateRanges(draft.ranges);
    if(error){$('error').textContent=error;return;}
    try{settings=api.normalize(draft);await persist(settings);$('status').textContent='Сохранено — применено в Pulse';}
    catch{$('error').textContent='Не удалось сохранить настройки';}
  }
  document.addEventListener('input',preview);
  for(const id of ['scale','oneBuyBadgeEnabled','hideMigrationCrownEnabled'])$(id).addEventListener('input',()=>{
    if(!loaded)return;
    // Apply only this control: unfinished/invalid color ranges stay unsaved.
    settings=api.normalize({...settings,[id]:id==='scale'?Number($(id).value):$(id).checked});
    preview();
    persist({...settings}).then(()=>{$('status').textContent='Применено в Pulse';}).catch(()=>{$('error').textContent='Не удалось сохранить настройки';});
  });
  $('add').addEventListener('click',()=>{const ranges=read().ranges;const min=ranges.length?Math.max(...ranges.map(r=>r.max)):0;addRow({min:min<100?min:0,max:100,color:'#c5c7d0'});preview();});
  $('save').addEventListener('click',save);
  $('reset').addEventListener('click',()=>{settings=api.normalize();paint();save();});
  chrome.storage.local.get('axiomMigration').then(d=>{settings=api.normalize(d.axiomMigration);paint();loaded=true;}).catch(()=>{paint();loaded=true;$('error').textContent='Не удалось прочитать настройки';});
})();
