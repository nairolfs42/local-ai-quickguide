import test from 'node:test';
import assert from 'node:assert/strict';
import { models, TASKS } from '../js/models.js';
import { platforms, embeddingCommand } from '../js/platform.js';
import { assess, profilesFor } from '../js/compatibility.js';
import {
  escapeHTML, commandHTML, sourcesHTML, taskOptions, modelCommandsHTML,
  guideSteps, stepsHTML, plainGuide, profilesHTML, copyText,
} from '../js/ui.js';

const hardware = (os) => ({ os, osVersion: os === 'windows' ? '11' : os === 'macos' ? '15' : '', arch: os === 'macos' ? 'arm64' : 'x64', ramGB: 128, diskGB: 1000, gpu: os === 'macos' ? 'apple' : 'none', vramGB: null, gpuConfirmed: false });

test('user-facing HTML helpers escape text and command attributes', () => {
  const unsafe = `<img src=x onerror="alert('test')"> &`;
  const escaped = '&lt;img src=x onerror=&quot;alert(&#39;test&#39;)&quot;&gt; &amp;';
  assert.equal(escapeHTML(unsafe), escaped);
  assert.equal(escapeHTML(null), '');
  assert.equal(escapeHTML(0), '0');
  const command = commandHTML(unsafe);
  assert.ok(command.includes(`<code>${escaped}</code>`));
  assert.ok(command.includes(`data-copy="${escaped}"`));
  assert.ok(!command.includes('<img'));
  const steps = stepsHTML([{ title: unsafe, body: unsafe, command: unsafe }]);
  assert.ok(!steps.includes('<img'));
  assert.ok(steps.includes(escaped));
});

test('task options, references and profiles render the actual catalog data', () => {
  const options = taskOptions('<All purposes>');
  assert.ok(options.includes('&lt;All purposes&gt;'));
  for (const task of TASKS) assert.ok(options.includes(`value="${task.id}"`));
  for (const model of models) {
    const html = profilesHTML(model, true);
    const profile = profilesFor(model);
    assert.ok(html.includes(`${profile.cpu.minimumRAM} GB`));
    assert.ok(html.includes(`${profile.cpu.recommendedRAM} GB`));
    assert.ok(html.includes(`${profile.diskGB} GB free disk`));
    assert.ok(html.includes('counted once'));
    assert.ok(html.includes('How this estimate is calculated'));
    const references = sourcesHTML(model.sources);
    for (const source of model.sources) {
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(references.includes(escapeHTML(source.url)));
    }
  }
});

test('all chat guides preserve exact tags and establish the estimate context before first run', () => {
  for (const model of models.filter((entry) => !entry.tasks.includes('embeddings'))) {
    for (const os of Object.keys(platforms)) {
      const steps = guideSteps(model, hardware(os));
      const commands = steps.filter((step) => step.command).map((step) => step.command);
      assert.ok(commands.includes(`ollama pull ${model.tag}`));
      const createFile = commands.find((command) => command.includes('LocalLab.Modelfile') && command.includes('FROM '));
      assert.ok(createFile?.includes(`FROM ${model.tag}`), `${os}: ${model.tag}`);
      assert.ok(createFile.includes(`PARAMETER num_ctx ${profilesFor(model).contextTokens}`));
      if (os === 'windows') {
        assert.ok(createFile.startsWith('Set-Content '));
        assert.ok(createFile.includes('-Encoding ascii'));
        assert.ok(createFile.includes(`@('FROM ${model.tag}', 'PARAMETER num_ctx ${profilesFor(model).contextTokens}')`));
      } else {
        assert.ok(createFile.startsWith("printf '"));
        assert.ok(createFile.includes('\\nPARAMETER'));
      }
      const preset = `local-lab-${model.id}`;
      const register = `ollama create ${preset} -f ./LocalLab.Modelfile`;
      const start = `ollama run ${preset}`;
      assert.ok(commands.indexOf(register) > commands.indexOf(createFile));
      assert.ok(commands.indexOf(start) > commands.indexOf(register));
      assert.ok(commands.includes('/bye'));
      assert.ok(commands.includes(`ollama stop ${preset}`));
      assert.ok(commands.includes(`ollama rm ${preset}\nollama rm ${model.tag}`));
      assert.ok(!commands.some((command) => command === `ollama run ${model.tag}`));
    }
  }
});

test('embedding instructions use the local embeddings API and correct shell syntax', () => {
  const model = models.find((entry) => entry.tasks.includes('embeddings'));
  assert.ok(model);
  for (const os of Object.keys(platforms)) {
    const steps = guideSteps(model, hardware(os));
    const commands = steps.filter((step) => step.command).map((step) => step.command);
    const api = commands.find((command) => command.includes('/api/embed'));
    assert.equal(api, embeddingCommand(model.tag, os));
    assert.ok(api.includes('http://localhost:11434/api/embed'));
    const body = os === 'windows' ? api.match(/-Body '(.+)'$/)?.[1] : api.match(/-d '(.+)'$/)?.[1];
    assert.ok(body);
    const payload = JSON.parse(body);
    assert.equal(payload.model, model.tag);
    assert.equal(payload.truncate, false);
    assert.equal(typeof payload.input, 'string');
    assert.ok(os === 'windows' ? api.startsWith('Invoke-RestMethod ') : api.startsWith('curl '));
    assert.ok(!commands.some((command) => command.startsWith('ollama run ') || command.startsWith('ollama create ')));
    assert.ok(!commands.includes('/bye'));
    assert.ok(commands.includes(`ollama stop ${model.tag}`));
    assert.ok(commands.includes(`ollama rm ${model.tag}`));
    assert.ok(modelCommandsHTML(model, os).includes('Returns numerical vectors'));
  }
  assert.throws(() => embeddingCommand("model:tag'; rm -rf .; '", 'linux'));
});

test('complete copied guides include assessment, commands and primary sources', () => {
  for (const model of models) {
    const hw = hardware('linux');
    const assessment = assess(model, hw);
    const steps = guideSteps(model, hw);
    const guide = plainGuide(model, hw, assessment, steps);
    assert.ok(guide.includes(`Original variant: ${model.tag}`));
    assert.ok(guide.includes(assessment.label));
    assert.ok(guide.includes(assessment.execution));
    assert.ok(guide.includes(`Sources verified ${model.verifiedDate}`));
    for (const step of steps) if (step.command) assert.ok(guide.includes(step.command));
    for (const source of model.sources) assert.ok(guide.includes(source.url));
  }
});

test('guide generation refuses arbitrary model names outside the curated catalog', () => {
  const first = models[0];
  assert.throws(() => guideSteps({ ...first, id: 'unknown', tag: 'unknown:latest' }, hardware('linux')));
  assert.throws(() => guideSteps({ ...first, tag: 'invented:model' }, hardware('linux')));
  assert.throws(() => guideSteps({ ...first, id: 'injected;command' }, hardware('linux')));
});

test('first exercises follow the requested task rather than unrelated model capabilities', () => {
  const multiVision = models.find((model) => model.tasks.includes('vision') && model.tasks.includes('writing'));
  const multiCoding = models.find((model) => model.tasks.includes('coding') && model.tasks.includes('writing'));
  const firstPrompt = (model, os, task) => guideSteps(model, hardware(os), task).find((step) => step.title === 'Ask your first question');
  for (const os of Object.keys(platforms)) {
    const general = firstPrompt(multiVision, os, 'general');
    assert.match(general.command, /Explain local AI/);
    assert.doesNotMatch(general.command, /example\.jpg|Python/);
    assert.doesNotMatch(general.body, /absolute path/);
    assert.equal(firstPrompt(multiVision, os, null).command, general.command);
    for (const model of [multiVision, multiCoding]) {
      const writing = firstPrompt(model, os, 'writing');
      assert.match(writing.command, /email/);
      assert.doesNotMatch(writing.command, /example\.jpg|Python/);
      assert.match(firstPrompt(model, os, 'summarization').command, /Summarize/);
    }
    const vision = firstPrompt(multiVision, os, 'vision');
    assert.match(vision.command, /example\.jpg/);
    assert.match(vision.body, /absolute path/);
    assert.ok(os === 'windows' ? vision.command.includes('C:\\Users\\') : vision.command.includes('/absolute/path/'));
    assert.match(firstPrompt(multiCoding, os, 'coding').command, /Python function/);
    const reasoningModel = models.find((model) => model.tasks.includes('reasoning'));
    assert.match(firstPrompt(reasoningModel, os, 'reasoning').command, /fraction/);
  }
});

test('clipboard rejection or absence opens a complete, focused and selected manual-copy fallback', async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const text = `LOCAL LAB — complete guide\nollama pull ${models[0].tag}\nQuotes: "double" and 'single'; markup: <example> & more.\nLast line.`;
  try {
    for (const mode of ['rejected', 'unavailable']) {
      const events = [];
      const textarea = {
        value: '',
        focus() { events.push('focus'); },
        select() { events.push('select'); },
      };
      const dialog = { showModal() { events.push('dialog'); } };
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { getElementById(id) {
          if (id === 'copy-text') return textarea;
          if (id === 'copy-dialog') return dialog;
          throw new Error(`Unexpected fallback element: ${id}`);
        } },
      });
      let attemptedText = null;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: mode === 'unavailable' ? {} : { clipboard: { async writeText(value) {
          attemptedText = value;
          throw new Error('Clipboard permission denied');
        } } },
      });
      assert.equal(await copyText(text), false, mode);
      assert.equal(textarea.value, text, mode);
      assert.deepEqual(events, ['dialog', 'focus', 'select'], mode);
      assert.equal(attemptedText, mode === 'rejected' ? text : null);
    }
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
});
