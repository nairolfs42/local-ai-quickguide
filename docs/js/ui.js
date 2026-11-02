import { TASKS, models } from './models.js';
import { profilesFor, validateHardware } from './compatibility.js';
import { platforms, embeddingCommand } from './platform.js';
export const $ = (id) => document.getElementById(id);
export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const taskLabel = id => TASKS.find(t => t.id === id)?.label ?? id;
export const taskOptions = (empty='All purposes') => `<option value="">${escapeHTML(empty)}</option>` + TASKS.map(t => `<option value="${t.id}">${escapeHTML(t.label)}</option>`).join('');
export const sourcesHTML = sources => `<ul class="source-list">${sources.map(s => `<li><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a></li>`).join('')}</ul>`;
export function commandHTML(command) { return `<div class="command-block"><pre><code>${escapeHTML(command)}</code></pre><button type="button" class="copy-button" data-copy="${escapeHTML(command)}" aria-label="Copy command">Copy</button></div>`; }
export const statusHTML = assessment => `<span class="status" data-status="${assessment.status}">${escapeHTML(assessment.label)}</span>`;
const STORAGE_KEY = 'local-lab-hardware-v1';
export function savedHardware() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } }
export function saveHardware(hw) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hw)); return true; } catch { return false; } }
export function clearSavedHardware() { try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ } }
export function hardwareFields(container, initial=null) {
 container.innerHTML = `<div class="field-grid">
 <div class="field"><label for="os">Operating system</label><select id="os" name="os"><option value="unknown">I’m not sure</option><option value="macos">macOS</option><option value="windows">Windows</option><option value="linux">Linux</option></select></div>
 <div class="field"><label for="osVersion">OS version</label><input id="osVersion" name="osVersion" placeholder="e.g. 15.0 / 11 / 10 22H2" maxlength="80"><small>Leave blank if unknown. <a href="install.html#find-specs">Find your specs ↗</a></small></div>
 <div class="field"><label for="arch">CPU architecture</label><select id="arch" name="arch"><option value="unknown">I’m not sure</option><option value="arm64">ARM64 / Apple M-series</option><option value="x64">x64 / Intel or AMD 64-bit</option></select></div>
 <div class="field"><label for="cpu">CPU or computer (optional)</label><input id="cpu" name="cpu" placeholder="e.g. Apple M2 / Ryzen 7" maxlength="100"><small>A note for your profile; not used as a speed benchmark.</small></div>
 <div class="field"><label id="ram-label" for="ramGB">Total system RAM (GB)</label><input id="ramGB" name="ramGB" type="number" min="0.1" max="8192" step="any" inputmode="decimal" placeholder="e.g. 16"><small>Memory is estimated in GiB (approximately the GB shown in system settings). Unknown? Leave blank.</small></div>
 <div class="field"><label for="diskGB">Available disk space (GB)</label><input id="diskGB" name="diskGB" type="number" min="0.1" max="1000000" step="any" inputmode="decimal" placeholder="e.g. 80"><small>Free storage, not total drive capacity. Decimal GB.</small></div>
 <div class="field"><label for="gpu">Graphics type</label><select id="gpu" name="gpu"><option value="unknown">I’m not sure</option><option value="none">No dedicated GPU / CPU only</option><option value="integrated">Integrated / shared graphics</option><option value="apple">Apple M-series unified memory</option><option value="nvidia">NVIDIA dedicated GPU</option><option value="amd">AMD dedicated GPU</option><option value="intel">Intel dedicated GPU</option></select></div>
 <div class="field"><label for="gpuModel">GPU model (optional)</label><input id="gpuModel" name="gpuModel" placeholder="e.g. RTX 3060" maxlength="100"><small>Vendor and capacity alone do not confirm support.</small></div>
 <div class="field" id="vram-field"><label for="vramGB">Dedicated VRAM (GB)</label><input id="vramGB" name="vramGB" type="number" min="0.1" max="8192" step="any" inputmode="decimal" placeholder="e.g. 12"><small>Only dedicated graphics memory. Unknown? Leave blank.</small></div>
 <label class="check-label" id="gpu-confirm-field"><input type="checkbox" id="gpuConfirmed" name="gpuConfirmed"><span>I checked my exact GPU, OS, and driver against <a href="https://docs.ollama.com/gpu" target="_blank" rel="noopener noreferrer">Ollama’s GPU support documentation ↗</a>. Without confirmation, use CPU-only estimates.</span></label></div><p class="hint" id="os-help"></p>`;
 if (initial && typeof initial === 'object' && !validateHardware(initial).length) {
  for (const id of ['os','osVersion','arch','cpu','ramGB','diskGB','gpu','gpuModel','vramGB']) if (initial[id] != null) $(id).value=initial[id];
  $('gpuConfirmed').checked=initial.gpuConfirmed===true;
 }
 const update=()=>{
  if ($('os').value==='macos' && $('arch').value==='arm64') $('gpu').value='apple';
  const dedicated=['nvidia','amd','intel'].includes($('gpu').value);
  $('vram-field').hidden=!dedicated; $('vramGB').disabled=!dedicated;
  $('gpu-confirm-field').hidden=!dedicated; $('gpuConfirmed').disabled=!dedicated;
  $('ram-label').textContent=$('gpu').value==='apple'?'Total unified memory (GB)':'Total system RAM (GB)';
  $('os-help').textContent=platforms[$('os').value]?.requirements || 'Choose your operating system when known. We cannot confidently recommend a model until the platform and memory are known.';
 };
 for(const id of ['os','arch','gpu']) $(id).addEventListener('change',update);
 update();
}
export function readHardware() {
 const number=id=>$(id).disabled || $(id).value.trim()==='' ? null : Number($(id).value);
 return {os:$('os').value,osVersion:$('osVersion').value.trim(),arch:$('arch').value,cpu:$('cpu').value.trim(),ramGB:number('ramGB'),diskGB:number('diskGB'),gpu:$('gpu').value,gpuModel:$('gpuModel').value.trim(),vramGB:number('vramGB'),gpuConfirmed:!$('gpuConfirmed').disabled&&$('gpuConfirmed').checked};
}
export function hardwareSummary(hw) {return hw ? `${platforms[hw.os]?.name || 'Unknown OS'} · ${hw.ramGB ?? '?'} GB ${hw.gpu==='apple'?'unified memory':'RAM'} · ${hw.diskGB ?? '?'} GB free`:'Add your specs for compatibility estimates';}
export function profilesHTML(model, full=false) {
 const p=profilesFor(model); if(!p) return '<p>Insufficient verified data for a hardware estimate.</p>';
 return `<div class="profile-grid"><div class="profile-card"><h3>CPU only</h3><p><strong>${p.cpu.minimumRAM} GB</strong> estimated minimum RAM</p><p><strong>${p.cpu.recommendedRAM} GB</strong> comfortable RAM target</p></div><div class="profile-card"><h3>Supported dedicated GPU</h3><p><strong>${p.gpu.minimumVRAM} / ${p.gpu.recommendedVRAM} GB</strong> minimum / comfortable VRAM</p><p>Plus <strong>${p.gpu.minimumRAM} / ${p.gpu.recommendedRAM} GB</strong> host RAM, separately</p></div><div class="profile-card"><h3>Apple unified memory</h3><p><strong>${p.unified.minimumRAM} GB</strong> estimated minimum</p><p><strong>${p.unified.recommendedRAM} GB</strong> comfortable target; counted once</p></div></div><p class="profile-caption">Allow <strong>${p.diskGB} GB free disk</strong> including installation and headroom. Memory figures are GiB (approximately GB). Baseline: ${p.contextTokens.toLocaleString()} context tokens; one model, one user. ${model.tasks.includes('embeddings')?'Embedding estimate uses a single short input.':'Vision workloads may need more.'}</p>${full?`<details class="panel"><summary>How this estimate is calculated <span aria-hidden="true">+</span></summary><div class="panel-body"><ul>${p.notes.map(n=>`<li>${escapeHTML(n)}</li>`).join('')}</ul></div></details>`:''}`;
}
export function modelCommandsHTML(model, os='linux') {
 const use=model.tasks.includes('embeddings')?embeddingCommand(model.tag,os):`ollama run ${model.tag}`;
 return `<h3>Download this exact variant</h3>${commandHTML(`ollama pull ${model.tag}`)}<h3>${model.tasks.includes('embeddings')?'Get an embedding (local API)':'Run in your terminal'}</h3>${commandHTML(use)}<p class="hint">${model.tasks.includes('embeddings')?'Requires the Ollama server. Returns numerical vectors. Example shell: '+(os==='windows'?'PowerShell':'bash/zsh')+'.':'This direct command uses Ollama’s current context settings. The quick-start guide creates a 4,096-token preset before the first run to match our estimate.'}</p>`;
}
export function guideSteps(model, hw, task = null) {
 if(!models.some(m=>m.tag===model.tag && m.id===model.id)) throw new Error('Use a verified catalog entry.');
 const p=profilesFor(model), embed=model.tasks.includes('embeddings');
 const preset=`local-lab-${model.id}`;
 const purpose = task || 'general';
 const prompts={general:'Explain local AI in three short sentences.',coding:'Write a Python function that adds two numbers. Explain how to use it.',writing:'Write a friendly, concise email asking to reschedule a meeting.',summarization:'Summarize this note in one sentence: Our team met Monday. We agreed to test a small local model this week and share our findings on Friday.',reasoning:'A box holds three red balls and two blue balls. What fraction are blue? Explain briefly.'};
 const steps=[...(platforms[hw.os]?.installSteps || []),{title:'Download the exact model',body:`Enter this in ${platforms[hw.os]?.shell || 'your terminal'}. Download: ${model.downloadGB} GB. Allow ${p.diskGB} GB free disk including installation and headroom. ${model.runtimeNote}`,command:`ollama pull ${model.tag}`}];
 if(embed){steps.push({title:'Create a short embedding',body:'Keep Ollama running. This sends one short text to the local API on your computer. Expect an embeddings array of numbers, not a chat answer. No complete search application is installed by this step.',command:embeddingCommand(model.tag,hw.os)});}
 else {
  const fileCommand=hw.os==='windows'?`Set-Content -LiteralPath './LocalLab.Modelfile' -Encoding ascii -Value @('FROM ${model.tag}', 'PARAMETER num_ctx ${p.contextTokens}')`:`printf 'FROM ${model.tag}\\nPARAMETER num_ctx ${p.contextTokens}\\n' > LocalLab.Modelfile`;
  steps.push({title:'Make a small context preset',body:`In a new empty folder, enter this in your shell. It creates or replaces LocalLab.Modelfile in that folder. The preset limits context to ${p.contextTokens.toLocaleString()} tokens before the first run, matching our estimate. It refers to the exact downloaded variant.`,command:fileCommand,url:'https://docs.ollama.com/modelfile'},
   {title:'Register your local preset',body:`This creates a local model entry named ${preset} from the file. It does not train or fine-tune the model.`,command:`ollama create ${preset} -f ./LocalLab.Modelfile`},
   {title:'Start the conversation',body:'Enter this in your shell. Loading may take a while. Wait for the >>> chat prompt.',command:`ollama run ${preset}`},
   {title:'Ask your first question',body:purpose==='vision'?'Type the prompt below inside the chat. Replace the example path with the absolute path to a real image on your computer; the example file is not included. Start with one small image. Images may require more memory than the text baseline.':'Type this inside the >>> chat prompt. Read the answer critically; local models can make mistakes.',command:purpose==='vision'?(hw.os==='windows'?'Describe this image: C:\\Users\\YourName\\Pictures\\example.jpg':'Describe this image: /absolute/path/to/example.jpg'):(prompts[purpose] || prompts.general)},
   {title:'Leave the conversation',body:'Enter this inside the chat to return to your shell.',command:'/bye'});
 }
 steps.push({title:'Inspect the running model',body:'In your shell, see whether the model is running on CPU or GPU. Capacity estimates do not predict speed.',command:'ollama ps'},
 {title:'Unload it when finished',body:'This frees the running model’s memory; downloaded files stay on disk.',command:`ollama stop ${embed?model.tag:preset}`},
 {title:'Remove downloads when no longer needed (optional)',body:embed?'This removes the downloaded model entry. Pull it again to use it later.':'Run both commands only when finished with the model. Remove the preset and original entry; you can download them again later.',command:embed?`ollama rm ${model.tag}`:`ollama rm ${preset}\nollama rm ${model.tag}`});
 return steps;
}
export function stepsHTML(steps){return `<ol class="ordered-steps">${steps.map(s=>`<li><h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.body)}</p>${s.url?`<p><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">Official instructions ↗</a></p>`:''}${s.command?commandHTML(s.command):''}${s.alternativeCommand?`<p><strong>Windows PowerShell alternative</strong> — use this instead of the command above:</p>${commandHTML(s.alternativeCommand)}`:''}</li>`).join('')}</ol>`;}
export function plainGuide(model,hw,assessment,steps){return `LOCAL LAB — ${model.name}\nOriginal variant: ${model.tag}\n${hardwareSummary(hw)}\n${assessment.label} · ${assessment.execution}\n${assessment.reasons.join('\n')}\n\n${steps.map((s,i)=>`${i+1}. ${s.title}\n${s.body}${s.url?'\n'+s.url:''}${s.command?'\n'+s.command:''}`).join('\n\n')}\n\nPlanning estimates only; not a performance or stability guarantee. Sources verified ${model.verifiedDate}.\n${model.sources.map(s=>s.url).join('\n')}`;}
let toastTimer;
export function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
export async function copyText(text){try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast('Copied to clipboard');return true;}catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();return false;}}
export function initShared(){document.addEventListener('click',e=>{const button=e.target.closest('[data-copy]');if(button)copyText(button.dataset.copy);});}
