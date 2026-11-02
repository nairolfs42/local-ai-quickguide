import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTIMATE_CONFIG, profilesFor, validateHardware, assess, matchTask, recommend } from '../js/compatibility.js';
import { models as catalog, TASKS as catalogTasks } from '../js/models.js';

const small = {
  id: 'fixture-small', name: 'Fixture Small', tag: 'fixture:small', family: 'Fixture',
  parametersB: 2, downloadGB: 2, tasks: ['general', 'writing', 'summarization'], verified: true,
  memory: { weightGiB: 2, overheadGiB: 1, kvGiB: 1, contextTokens: 4096, confidence: 'estimate', note: 'Synthetic test fixture.' },
};
const large = { ...small, id: 'fixture-large', name: 'Fixture Large', tag: 'fixture:large', parametersB: 12, downloadGB: 8, memory: { ...small.memory, weightGiB: 8 } };
const vision = { ...small, id: 'fixture-vision', name: 'Fixture Vision', tag: 'fixture:vision', tasks: ['vision'] };
const embedding = { ...small, id: 'fixture-embed', name: 'Fixture Embed', tag: 'fixture:embed', tasks: ['embeddings'], memory: { ...small.memory, contextTokens: 2048 } };
const hardware = (overrides = {}) => ({ os: 'linux', osVersion: '', arch: 'x64', cpu: '', ramGB: 16, gpu: 'none', gpuModel: '', vramGB: null, gpuConfirmed: false, diskGB: 100, preference: 'balanced', ...overrides });

test('profiles include weights, runtime, context, OS reserve, disk and independent GPU allowance', () => {
  const profiles = profilesFor(small);
  assert.deepEqual(profiles.cpu, { minimumRAM: 8, recommendedRAM: 11 });
  assert.deepEqual(profiles.unified, profiles.cpu);
  assert.deepEqual(profiles.gpu, { minimumRAM: 8, recommendedRAM: 11, minimumVRAM: 5, recommendedVRAM: 7 });
  assert.equal(profiles.diskGB, 9);
  assert.equal(profiles.contextTokens, ESTIMATE_CONFIG.baselineContextTokens);
  assert.equal(profilesFor(embedding).contextTokens, 2048);
  assert.equal(profilesFor({ ...small, memory: null }), null);
});

test('CPU memory boundaries: below minimum, minimum, and comfortable target', () => {
  assert.equal(assess(small, hardware({ ramGB: 7.99 })).status, 'not-recommended');
  assert.equal(assess(small, hardware({ ramGB: 8 })).status, 'compromise');
  assert.equal(assess(small, hardware({ ramGB: 10.99 })).status, 'compromise');
  assert.equal(assess(small, hardware({ ramGB: 11 })).status, 'recommended');
  assert.equal(assess(large, hardware({ ramGB: 8 })).status, 'not-recommended');
});

test('unified memory is counted once even if a second GPU-memory value is provided', () => {
  const shared = hardware({ os: 'macos', osVersion: '14.7', arch: 'arm64', gpu: 'apple', ramGB: 8, vramGB: 8 });
  assert.equal(assess(small, shared).status, 'compromise');
  assert.equal(assess(small, shared).execution, 'Apple unified memory');
  assert.equal(assess(large, shared).status, 'not-recommended');
  assert.equal(assess(small, { ...shared, vramGB: null }).status, assess(small, shared).status);
});

test('discrete GPU requires confirmation and sufficient independent RAM and VRAM', () => {
  const gpu = hardware({ gpu: 'nvidia', gpuModel: 'User verified GPU', vramGB: 8, gpuConfirmed: true });
  assert.equal(assess(small, gpu).execution, 'GPU acceleration');
  assert.equal(assess(small, gpu).status, 'recommended');
  assert.equal(assess(small, { ...gpu, vramGB: 5 }).status, 'compromise');
  assert.equal(assess(small, { ...gpu, ramGB: 4, vramGB: 100 }).status, 'not-recommended');
  assert.equal(assess(small, { ...gpu, vramGB: 4 }).execution, 'CPU only');
  assert.equal(assess(small, { ...gpu, gpuConfirmed: false }).execution, 'CPU only');
  assert.equal(assess(small, { ...gpu, vramGB: null }).execution, 'CPU only');
});

test('unknown, integrated and Intel Mac GPUs have documented CPU fallback', () => {
  for (const gpu of ['unknown', 'integrated']) {
    const outcome = assess(small, hardware({ gpu, vramGB: 40 }));
    assert.equal(outcome.execution, 'CPU only');
    assert.equal(outcome.status, 'recommended');
    assert.ok(outcome.reasons.some((reason) => /CPU|Shared/.test(reason)));
  }
  assert.equal(assess(small, hardware({ os: 'macos', osVersion: '15', arch: 'x64', gpu: 'amd', vramGB: 16, gpuConfirmed: true })).execution, 'CPU only');
});

test('disk boundary and missing capacity are not treated as a fit', () => {
  const diskGB = profilesFor(small).diskGB;
  assert.equal(assess(small, hardware({ diskGB: diskGB - 0.01 })).status, 'not-recommended');
  assert.equal(assess(small, hardware({ diskGB })).status, 'recommended');
  for (const missingField of [{ diskGB: null }, { ramGB: null }, { os: 'unknown' }, { arch: 'unknown' }]) {
    assert.equal(assess(small, hardware(missingField)).status, 'unknown');
  }
});

test('numeric validation rejects negative, zero, string, nonfinite and implausible values', () => {
  for (const field of ['ramGB', 'vramGB', 'diskGB']) {
    for (const value of [-1, 0, NaN, Infinity, '16', 1000001]) {
      assert.ok(validateHardware(hardware({ [field]: value })).length, `${field}: ${value}`);
      assert.equal(assess(small, hardware({ [field]: value })).status, 'unknown');
    }
  }
  assert.deepEqual(validateHardware(hardware()), []);
  assert.ok(validateHardware(null).length);
  assert.ok(validateHardware(hardware({ os: 'windows', gpu: 'apple' })).length);
  assert.ok(validateHardware(hardware({ arch: 'x64', gpu: 'apple' })).length);
  assert.ok(validateHardware(hardware({ gpuConfirmed: 'true' })).length);
});

test('OS versions and architectures gate recommendations', () => {
  assert.equal(assess(small, hardware({ os: 'macos', osVersion: '13' })).status, 'not-recommended');
  assert.equal(assess(small, hardware({ os: 'macos', osVersion: '' })).status, 'unknown');
  assert.equal(assess(small, hardware({ os: 'macos', osVersion: '26.0' })).status, 'recommended');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: '10' })).status, 'unknown');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: '10 21H2' })).status, 'not-recommended');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: '10 22H1' })).status, 'not-recommended');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: '10 22H2' })).status, 'recommended');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: 'Windows 10 build 19045.1234' })).status, 'recommended');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: 'Windows 11' })).status, 'recommended');
  assert.equal(assess(small, hardware({ os: 'windows', osVersion: '11', arch: 'arm64' })).status, 'unknown');
  assert.equal(assess(small, hardware({ os: 'linux', arch: 'arm64' })).status, 'recommended');
});

test('task matching distinguishes media understanding, generation and text artifacts', () => {
  assert.equal(matchTask('describe this image').task, 'vision');
  assert.equal(matchTask('generate a caption for this image').task, 'vision');
  assert.equal(matchTask('debug Python code').task, 'coding');
  assert.equal(matchTask('semantic search for documents').task, 'embeddings');
  assert.equal(matchTask('search my documents').task, 'embeddings');
  assert.equal(matchTask('search').task, 'embeddings');
  assert.equal(matchTask('search the web', 'general').unsupported, true);
  assert.equal(matchTask('summarize this podcast transcript').task, 'summarization');
  assert.equal(matchTask('write a video script').task, 'writing');
  for (const request of ['generate an image', 'draw a picture', 'image generation', 'edit a photo', 'transcribe audio', 'generate music', 'analyze video', 'media', 'text to speech']) {
    const matched = matchTask(request, 'general');
    assert.equal(matched.unsupported, true, request);
    assert.equal(matched.task, null, request);
  }
  assert.equal(matchTask('write a story', 'coding').task, 'writing');
  assert.equal(matchTask('zzzz', 'coding').task, 'coding');
  assert.equal(matchTask('zzzz').task, null);
  assert.equal(matchTask('', 'reasoning').task, 'reasoning');
});

test('recommendations preserve capability, verified status, and shared assessment results', () => {
  const models = [large, small, vision, embedding, { ...small, verified: false, tag: 'unverified' }];
  assert.deepEqual(recommend(models, hardware(), 'vision').map(({ model }) => model.tag), [vision.tag]);
  assert.deepEqual(recommend(models, hardware(), 'embeddings').map(({ model }) => model.tag), [embedding.tag]);
  assert.deepEqual(recommend(models, hardware(), 'coding'), []);
  assert.deepEqual(recommend(models, hardware(), 'image-generation'), []);
  assert.deepEqual(recommend(models, hardware(), matchTask('generate an image')), []);
  assert.deepEqual(recommend(models, hardware({ ramGB: null }), 'general'), []);
  assert.deepEqual(recommend(models, hardware({ ramGB: 1 }), 'general'), []);
  for (const ramGB of [8, 12, 16, 32]) {
    for (const item of recommend(models, hardware({ ramGB }), 'general')) {
      assert.deepEqual(item.assessment, assess(item.model, hardware({ ramGB })));
      assert.ok(['recommended', 'compromise'].includes(item.assessment.status));
    }
  }
});

test('fit ranks before size and size preference is explicit', () => {
  const models = [large, small];
  assert.equal(recommend(models, hardware({ ramGB: 16 }), 'general', 'capability')[0].model.tag, small.tag);
  assert.equal(recommend(models, hardware({ ramGB: 64 }), 'general', 'capability')[0].model.tag, large.tag);
  assert.equal(recommend(models, hardware({ ramGB: 64 }), 'general', 'speed')[0].model.tag, small.tag);
  assert.equal(recommend(models, hardware({ ramGB: 64 }), null)[0].model.tag, small.tag);
});

test('parameter counts including active MoE parameters never substitute for memory inputs', () => {
  const differentCounts = { ...small, parametersB: 1000, activeParametersB: 0.1 };
  assert.deepEqual(profilesFor(differentCounts), profilesFor(small));
  assert.equal(assess(differentCounts, hardware()).status, assess(small, hardware()).status);
});

test('the bundled catalog has coherent variant profiles and capability-filtered recommendations', () => {
  assert.ok(catalog.length >= 12);
  assert.equal(new Set(catalog.map((model) => model.id)).size, catalog.length);
  assert.equal(new Set(catalog.map((model) => model.tag)).size, catalog.length);
  for (const model of catalog) {
    const profiles = profilesFor(model);
    assert.ok(profiles, model.tag);
    assert.ok(profiles.cpu.recommendedRAM >= profiles.cpu.minimumRAM);
    assert.ok(profiles.gpu.recommendedVRAM >= profiles.gpu.minimumVRAM);
    assert.ok(profiles.diskGB > model.downloadGB);
    if (model.tasks.includes('vision')) assert.ok(model.inputTypes.includes('image'), model.tag);
    if (model.tasks.includes('embeddings')) assert.ok(model.outputTypes.includes('embedding vectors'), model.tag);
    for (const ramGB of [4, 8, 16, 32, 64]) {
      const expected = ramGB < profiles.cpu.minimumRAM ? 'not-recommended' : ramGB < profiles.cpu.recommendedRAM ? 'compromise' : 'recommended';
      assert.equal(assess(model, hardware({ ramGB, diskGB: 1000 })).status, expected, `${model.tag}, ${ramGB} GB RAM`);
    }
  }
  for (const { id } of catalogTasks) {
    for (const item of recommend(catalog, hardware({ ramGB: 128, diskGB: 1000 }), id)) {
      assert.ok(item.model.tasks.includes(id));
      assert.deepEqual(item.assessment, assess(item.model, hardware({ ramGB: 128, diskGB: 1000 })));
    }
  }
});
