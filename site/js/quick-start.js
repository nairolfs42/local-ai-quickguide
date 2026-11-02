import { models } from './models.js';
import { assess, recommend, matchTask, validateHardware } from './compatibility.js';
import { $,escapeHTML as esc, taskOptions,hardwareFields,readHardware,savedHardware,saveHardware,clearSavedHardware,statusHTML,profilesHTML,sourcesHTML,guideSteps,stepsHTML,plainGuide,copyText,initShared } from './ui.js';
initShared();
hardwareFields($('hardware-fields'),savedHardware());
$('quick-task').innerHTML=taskOptions('General starting point (optional)');
const requested=models.find(m=>m.id===new URLSearchParams(location.search).get('model'));
if(requested){$('quick-task').value=requested.tasks[0];$('quick-message').textContent=`Checking ${requested.name}. We’ll only provide a guide if your specs support it.`;}
let hardware=null, selections=[], current=null, match=null;
function showStep(number){for(let i=1;i<=3;i++){if(i<3)$(`step-${i}`).hidden=i!==number;else $('step-3').hidden=i!==number;$(`step-label-${i}`).removeAttribute('aria-current');}$(`step-label-${number}`).setAttribute('aria-current','step');$('quick-form').hidden=number===3;const heading=$(`step-${number}`).querySelector('h2');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
function validate(){if(!$('quick-form').reportValidity())return false;const errors=validateHardware(readHardware());$('quick-message').classList.toggle('error',errors.length>0);$('quick-message').textContent=errors.join(' ');return errors.length===0;}
$('next-step').addEventListener('click',()=>{if(validate())showStep(2);});
$('back-step').addEventListener('click',()=>showStep(1));
$('clear-profile').addEventListener('click',()=>{clearSavedHardware();hardwareFields($('hardware-fields'));$('remember-profile').checked=false;$('quick-message').textContent='Computer specs and saved data cleared.';});
$('edit-specs').addEventListener('click',()=>showStep(1));
$('quick-form').addEventListener('submit',e=>{
 e.preventDefault();if(!validate())return;
 hardware=readHardware();match=matchTask($('quick-task-text').value,$('quick-task').value);
 let saveNote='';if($('remember-profile').checked&&!saveHardware(hardware))saveNote=' Browser storage is unavailable; your guide still works.';
 selections=recommend(models,hardware,match,$('preference').value);
 const chosen=requested&&selections.find(r=>r.model.id===requested.id);
 if(chosen)selections=[chosen,...selections.filter(r=>r.model.id!==chosen.model.id)];
 selections=selections.slice(0,3);
 if(!selections.length){renderNoMatch(saveNote);showStep(3);return;}
 current=selections[0];renderResult(saveNote);showStep(3);
});
function renderNoMatch(saveNote){
 const sample=requested || models.find(m=>m.tasks.includes(match.task||'general')) || models[0];
 const a=assess(sample,hardware);
 $('quick-results').innerHTML=`<div class="empty-state"><h3>${match.unsupported?'No verified match for this task.':'We need a different starting point.'}</h3><p>${esc(match.unsupported?match.message:'No verified model meets the entered requirements for this task. We haven’t generated installation commands for an unsuitable model.')}</p></div>${!match.unsupported?`<h3>What is limiting the fit?</h3><p class="hint">Example check: ${esc(sample.name)}</p>${statusHTML(a)}<ul class="recommendation-reasons">${a.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}<p class="task-match-note">${esc((match.unsupported?'':match.message)+saveNote)}</p><p><a href="install.html#find-specs">Find missing computer details →</a></p><p><a href="index.html">Explore smaller models or another task →</a></p>`;
}
function renderResult(saveNote=''){
 const {model,assessment,reason}=current;
 const requestedWarning=requested&&requested.id!==model.id&&!selections.some(s=>s.model.id===requested.id)?`<div class="notice"><strong>${esc(requested.name)} was not selected.</strong><p>${esc(!match.task||requested.tasks.includes(match.task)?assess(requested,hardware).reasons.join(' '):'Its verified capabilities do not match your selected task.')}</p><p>The guide below is for a different model that fits your inputs.</p></div>`:'';
 const steps=guideSteps(model,hardware,match.task),alts=selections.filter(s=>s.model.id!==model.id);
 $('quick-results').innerHTML=`<p class="task-match-note">${esc(match.message+saveNote)}</p>${requestedWarning}<section class="recommendation"><p class="eyebrow">YOUR ${assessment.status==='recommended'?'RECOMMENDED':'CONDITIONAL'} STARTING POINT</p><h3>${esc(model.name)}</h3><code>${esc(model.tag)}</code>${statusHTML(assessment)}<p>${esc(reason)}</p><p><strong>Execution: ${esc(assessment.execution)}.</strong> ${esc(assessment.speedNote)}</p><details><summary>Why this fits your inputs <span aria-hidden="true">+</span></summary><ul class="recommendation-reasons">${assessment.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details></section>${alts.length?`<h3>Other starting points</h3><div class="alternatives">${alts.map(s=>`<div class="alternative"><h3>${esc(s.model.name)}</h3>${statusHTML(s.assessment)}<p>${esc(s.model.description)}</p><button class="quiet-button" data-choose="${s.model.id}">Use this model instead →</button></div>`).join('')}</div>`:''}<details class="panel"><summary>Estimated hardware &amp; model limitations <span aria-hidden="true">+</span></summary><div class="panel-body">${profilesHTML(model,true)}<ul>${model.weaknesses.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div></details><section class="quick-guide"><p class="eyebrow">YOUR PERSONALIZED INSTRUCTIONS</p><h2>From download to first use.</h2><div class="guide-actions"><button type="button" class="button" id="copy-guide">Copy complete guide</button><button type="button" class="button secondary" id="print-guide">Print guide</button></div><div class="notice">${assessment.status==='compromise'?'Your computer meets the estimate’s minimum but has limited headroom. Close memory-heavy apps and start with a short prompt. ':''}Use one model and one request at a time. These steps use the stated context baseline; longer contexts and larger images may exceed the memory estimate.</div>${stepsHTML(steps)}<h3>Official model references</h3>${sourcesHTML(model.sources)}<p class="hint">Facts verified ${esc(model.verifiedDate)}. Installation references are linked in the steps. Hardware numbers are estimates. No model has been installed by this website.</p></section>`;
 $('copy-guide').addEventListener('click',()=>copyText(plainGuide(model,hardware,assessment,steps)));
 $('print-guide').addEventListener('click',()=>window.print());
 document.querySelectorAll('[data-choose]').forEach(b=>b.addEventListener('click',()=>{current=selections.find(s=>s.model.id===b.dataset.choose);renderResult();}));
}
