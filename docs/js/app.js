import { models, VERIFIED_DATE } from './models.js';
import { assess, profilesFor, validateHardware, matchTask } from './compatibility.js';
import { $, escapeHTML as esc, taskLabel, taskOptions, sourcesHTML, statusHTML, hardwareFields, readHardware, savedHardware, saveHardware, clearSavedHardware, hardwareSummary, profilesHTML, modelCommandsHTML, initShared } from './ui.js';
initShared();
let hardware=savedHardware();
if(hardware && validateHardware(hardware).length)hardware=null;
hardwareFields($('hardware-fields'),hardware);
$('profile-summary').textContent=hardwareSummary(hardware);
$('task-filter').innerHTML=taskOptions();
$('catalog-badge').textContent=`${models.length} VARIANTS · 5 MODEL FAMILIES`;
$('hero-command').textContent=`ollama run ${models[0].tag}`;
$('model-select').innerHTML+=[...models].map(m=>`<option value="${m.id}">${esc(m.name)} · ${esc(m.quantization)}</option>`).join('');
function cardHTML(m){
 const profile=profilesFor(m), assessment=hardware?assess(m,hardware):null;
 return `<details class="model-card" id="model-${m.id}"><summary><div class="card-top"><span class="model-family">${esc(m.family)}</span><span class="parameter-pill">${esc(m.parametersB)}B parameters</span></div><h3 class="model-title">${esc(m.name)}</h3><p class="model-description">${esc(m.description)}</p><div class="tag-list">${m.tasks.slice(0,3).map(t=>`<span class="tag">${esc(taskLabel(t))}</span>`).join('')}${m.tasks.length>3?`<span class="tag">+${m.tasks.length-3}</span>`:''}</div><div class="card-meta"><span><strong>${profile?.cpu.recommendedRAM??'?'} GB</strong> comfortable RAM*</span><span><strong>${m.downloadGB} GB</strong> download</span></div>${assessment?statusHTML(assessment):''}<span class="expand-label">Details, commands &amp; requirements <span aria-hidden="true">+</span></span></summary><div class="card-detail"><dl><dt>Exact tag</dt><dd><code>${esc(m.tag)}</code></dd><dt>Parameters</dt><dd>${esc(m.parameterLabel)}</dd>${m.activeParametersB?`<dt>Active parameters</dt><dd>${m.activeParametersB}B (total weights still matter)</dd>`:''}<dt>Quantization</dt><dd>${esc(m.quantization)}</dd><dt>Input → output</dt><dd>${esc(m.inputTypes.join(', '))} → ${esc(m.outputTypes.join(', '))}</dd></dl><h3>Useful for</h3><p>${esc(m.tasks.map(taskLabel).join(' · '))}</p><h3>Strengths</h3><ul>${m.strengths.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><h3>Limitations</h3><ul>${m.weaknesses.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>${assessment?`<h3>Your computer’s fit</h3><p><strong>${esc(assessment.execution)}</strong></p><ul>${assessment.reasons.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p>${esc(assessment.speedNote)}</p>`:''}<h3>Estimated hardware profiles</h3>${profilesHTML(m)}<p>${esc(m.runtimeNote)}</p>${modelCommandsHTML(m,hardware?.os || 'linux')}<a class="button secondary" href="quick-start.html?model=${encodeURIComponent(m.id)}">Build a guide for this model ↗</a><h3>Sources &amp; verification</h3>${sourcesHTML(m.sources)}<p class="hint">Facts checked ${esc(m.verifiedDate)}. Strengths and use cases are editorial summaries. Hardware figures are estimates, not publisher minimums.</p></div></details>`;
}
function render(){
 const term=$('search').value.toLowerCase().trim(), size=$('size-filter').value, fit=$('fit-filter').value;
 const task=matchTask($('task-text').value,$('task-filter').value);
 $('task-message').textContent=$('task-text').value.trim()?task.message:'';
 const filtered=models.filter(m=>{
  const searchable=[m.name,m.family,m.tag,m.description,...m.tasks.map(taskLabel),...m.strengths,...m.weaknesses,m.parametersB<2?'tiny small':m.parametersB<=4?'small':m.parametersB<=14?'medium':'large'].join(' ').toLowerCase();
  if(term && !searchable.includes(term))return false;
  if(task.unsupported || (task.task&&!m.tasks.includes(task.task)))return false;
  if(size==='tiny'&&m.parametersB>=2 || size==='small'&&(m.parametersB<2||m.parametersB>4) || size==='medium'&&(m.parametersB<=4||m.parametersB>14) || size==='large'&&m.parametersB<=14)return false;
  if(fit && assess(m,hardware || {}).status!==fit)return false;
  return true;
 });
 $('result-count').textContent=`${filtered.length} of ${models.length} variants${task.task?' · '+taskLabel(task.task):''} · Sources checked ${VERIFIED_DATE}${fit&&!hardware?' · Add your specs to assess hardware fit':''}`;
 $('model-grid').innerHTML=filtered.length?filtered.map(cardHTML).join(''):`<div class="empty-state"><h3>${task.unsupported?'This task needs a different workflow.':'No models match these filters.'}</h3><p>${esc(task.unsupported?task.message:fit&&!hardware?'Add your computer specs above before filtering by compatibility.':'Try a different purpose, broader size range, or clear your search. If your hardware is limiting the results, check the explanations in the full catalog.')}</p><button class="button secondary" id="empty-reset">Reset filters</button></div>`;
 $('empty-reset')?.addEventListener('click',resetFilters);
}
function resetFilters(){for(const id of ['search','task-filter','task-text','size-filter','fit-filter'])$(id).value='';render();}
for(const id of ['search','task-text'])$(id).addEventListener('input',render);
for(const id of ['task-filter','size-filter','fit-filter'])$(id).addEventListener('change',render);
$('reset-filters').addEventListener('click',resetFilters);
function applyHardware(save=false){const hw=readHardware(),errors=validateHardware(hw);$('hardware-message').classList.toggle('error',errors.length>0);if(errors.length){$('hardware-message').textContent=errors.join(' ');return false;}hardware=hw;$('profile-summary').textContent=hardwareSummary(hw);$('hardware-message').textContent=save?(saveHardware(hw)?'Specs applied and saved in this browser. Use Clear to remove them.':'Specs applied, but browser storage is unavailable.'):'Specs applied for this visit. Choose Save to keep them on this device.';render();return true;}
$('hardware-form').addEventListener('submit',e=>{e.preventDefault();applyHardware();});
$('save-profile').addEventListener('click',()=>{if($('hardware-form').reportValidity())applyHardware(true);});
$('clear-profile').addEventListener('click',()=>{clearSavedHardware();hardware=null;hardwareFields($('hardware-fields'));$('profile-summary').textContent=hardwareSummary(null);$('hardware-message').textContent='Computer specs and saved data cleared.';render();});
$('model-select').addEventListener('change',()=>{const m=models.find(m=>m.id===$('model-select').value);$('requirements-result').innerHTML=m?`<h3 class="requirements-title">${esc(m.name)} · ${esc(m.tag)}</h3><p>${esc(m.runtimeNote)}</p>${profilesHTML(m,true)}<a class="button secondary" href="quick-start.html?model=${encodeURIComponent(m.id)}">Check my computer &amp; get instructions ↗</a>`:'';});
for(const [id,target]of [['computer-entry','computer'],['requirements-entry','requirements']])$(id).addEventListener('click',()=>{$(target).open=true;});
$('task-entry').addEventListener('click',()=>setTimeout(()=>$('task-filter').focus({preventScroll:true}),100));
if(location.hash==='#computer'||location.hash==='#requirements')$(location.hash.slice(1)).open=true;
render();
