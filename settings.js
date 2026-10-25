(() => {
  const defaults = {enabled:true,hideCounts:false,oneBuyBadgeEnabled:true,hideMigrationCrownEnabled:true,scale:1,baseColor:'#c5c7d0',ranges:[
    {min:0,max:15,color:'#ff4444'}, {min:15,max:35,color:'#ff9500'},
    {min:35,max:60,color:'#ffd60a'}, {min:60,max:100,color:'#34c759'}]};
  const validColor = c => typeof c === 'string' && /^#[a-f0-9]{6}$/i.test(c);
  function validateRanges(ranges) {
    if (!Array.isArray(ranges)) return 'Некорректный список диапазонов';
    for (let i=0;i<ranges.length;i++) {
      const r = ranges[i];
      if (!r || !Number.isFinite(r.min) || !Number.isFinite(r.max) || r.min<0 || r.max>100 || r.min>=r.max || !validColor(r.color)) return `Проверьте диапазон ${i+1}: 0 ≤ от < до ≤ 100`;
      for (let j=0;j<i;j++) if (r.min<ranges[j].max && ranges[j].min<r.max) return `Диапазоны ${j+1} и ${i+1} пересекаются`;
    }
    return '';
  }
  function normalize(v) {
    if (!v || typeof v !== 'object') v={};
    const scale=Number(v.scale);
    const ranges=Array.isArray(v.ranges) ? v.ranges.map(r=>({min:Number(r?.min),max:Number(r?.max),color:r?.color})) : defaults.ranges;
    return {enabled:v.enabled!==false,hideCounts:v.hideCounts===true,oneBuyBadgeEnabled:v.oneBuyBadgeEnabled!==false,hideMigrationCrownEnabled:v.hideMigrationCrownEnabled!==false,scale:Number.isFinite(scale)?Math.max(.6,Math.min(2.5,scale)):1,
      baseColor:validColor(v.baseColor)?v.baseColor:defaults.baseColor,
      ranges:(validateRanges(ranges)?defaults.ranges:ranges).map(r=>({...r}))};
  }
  function parse(text) {
    const m=String(text).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return null;
    const migrated=Number(m[1]),total=Number(m[2]);
    if (!Number.isSafeInteger(migrated)||!Number.isSafeInteger(total)||migrated>total) return null;
    return {migrated,total,percent:total?migrated/total*100:null};
  }
  function colorFor(percent,s) {
    if (percent===null) return s.baseColor;
    return s.ranges.find(r=>percent>=r.min&&(percent<r.max||(r.max===100&&percent===100)))?.color || s.baseColor;
  }
  const format = p => p===null?'—':`${Number(p.toFixed(2))}%`;
  globalThis.AxiomMigration={defaults,normalize,parse,colorFor,format,validateRanges};
})();
