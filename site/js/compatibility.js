/**
 * Pure, deterministic planning estimates, not measured runtime requirements.
 * Capacity inputs are GiB (the UI calls these approximately GB); download/disk
 * sizes are decimal GB. No model is probed and no hardware is auto-detected.
 */
export const ESTIMATE_CONFIG = Object.freeze({
  baselineContextTokens: 4096,
  minimumOSReserveGiB: 4,
  recommendedOSReserveGiB: 6,
  recommendedWorkingMultiplier: 1.25,
  minimumGPUReserveGiB: 1,
  recommendedGPUReserveGiB: 2,
  diskInstallAllowanceGB: 4,
  diskModelMultiplier: 1.25,
  diskExtraGB: 2,
  maximumRAMGiB: 8192,
  maximumVRAMGiB: 8192,
  maximumDiskGB: 1000000,
  macOSMinimumMajor: 14,
  windows10MinimumBuild: 19045,
});

const LABELS = Object.freeze({
  recommended: 'Recommended fit',
  compromise: 'May run with compromises',
  'not-recommended': 'Not recommended',
  unknown: 'Insufficient information',
});
const TASKS = new Set(['general', 'coding', 'writing', 'summarization', 'reasoning', 'vision', 'embeddings']);
const OPERATING_SYSTEMS = new Set(['macos', 'windows', 'linux', 'unknown']);
const ARCHITECTURES = new Set(['arm64', 'x64', 'unknown']);
const GPUS = new Set(['none', 'integrated', 'apple', 'nvidia', 'amd', 'intel', 'unknown']);
const missing = (value) => value === null || value === undefined || value === '';
const usableNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const roundUp = (value) => Math.ceil(value);

/** The catalog owns model-specific weight, runtime and cache/buffer allowances. */
export function profilesFor(model) {
  const memory = model?.memory;
  if (!memory || !usableNumber(memory.weightGiB) ||
      !Number.isFinite(memory.overheadGiB) || memory.overheadGiB < 0 ||
      !Number.isFinite(memory.kvGiB) || memory.kvGiB < 0 ||
      !usableNumber(model.downloadGB) || !usableNumber(memory.contextTokens)) {
    return null;
  }
  const config = ESTIMATE_CONFIG;
  const working = memory.weightGiB + memory.overheadGiB + memory.kvGiB;
  const minimumRAM = roundUp(config.minimumOSReserveGiB + working);
  const recommendedRAM = roundUp(config.recommendedOSReserveGiB + working * config.recommendedWorkingMultiplier);
  // Requiring enough host RAM for a CPU-sized working set is deliberately
  // conservative. GPU memory never compensates for missing host memory here.
  return {
    cpu: { minimumRAM, recommendedRAM },
    gpu: {
      minimumRAM,
      recommendedRAM,
      minimumVRAM: roundUp(config.minimumGPUReserveGiB + working),
      recommendedVRAM: roundUp(config.recommendedGPUReserveGiB + working * config.recommendedWorkingMultiplier),
    },
    unified: { minimumRAM, recommendedRAM },
    diskGB: roundUp(model.downloadGB * config.diskModelMultiplier + config.diskInstallAllowanceGB + config.diskExtraGB),
    contextTokens: memory.contextTokens,
    notes: [
      `Estimates assume one model, one user, and at most ${memory.contextTokens.toLocaleString('en-US')} context tokens; embedding models use a single short input instead.`,
      `Working allocation: ${memory.weightGiB.toFixed(2)} GiB weight proxy + ${memory.overheadGiB.toFixed(2)} GiB runtime overhead + ${memory.kvGiB.toFixed(2)} GiB context/working buffer. Quantization is already reflected in the catalog's weight proxy.`,
      `Minimum host memory adds ${config.minimumOSReserveGiB} GiB for the OS and other apps; comfortable memory adds ${config.recommendedOSReserveGiB} GiB and 25% working headroom. Heavy background workloads need more.`,
      'GPU profiles also require the full estimated host-memory allocation, a supported GPU/backend and suitable drivers. RAM and VRAM are never added together. Apple unified memory is counted once.',
      'GPU memory estimates include display/driver headroom. Partial offloading is not assumed; when full GPU capacity is insufficient, assess the CPU profile.',
      `Disk estimate allows 25% above the verified model download, ${config.diskInstallAllowanceGB} GB for Ollama and ${config.diskExtraGB} GB extra space. Concurrent downloads and updates may need more.`,
      'These planning allowances are not benchmarks or manufacturer minimums. Longer contexts, parallel work, images and other workloads can exceed them.',
      memory.note || 'Memory estimates are approximate and have not been measured on your computer.',
    ],
  };
}

/** Missing information is handled by assess; invalid information is rejected. */
export function validateHardware(hardware = {}) {
  const errors = [];
  if (!hardware || typeof hardware !== 'object' || Array.isArray(hardware)) return ['Enter a hardware profile.'];
  const limits = [
    ['ramGB', 'System RAM', ESTIMATE_CONFIG.maximumRAMGiB],
    ['vramGB', 'Dedicated GPU memory', ESTIMATE_CONFIG.maximumVRAMGiB],
    ['diskGB', 'Available disk space', ESTIMATE_CONFIG.maximumDiskGB],
  ];
  for (const [field, label, upperBound] of limits) {
    const value = hardware[field];
    if (!missing(value) && (!usableNumber(value) || value > upperBound)) {
      errors.push(`${label} must be a number greater than zero and no more than ${upperBound.toLocaleString('en-US')} GB; leave it blank if unknown.`);
    }
  }
  if (hardware.os && !OPERATING_SYSTEMS.has(hardware.os)) errors.push('Choose a supported operating-system option.');
  if (hardware.arch && !ARCHITECTURES.has(hardware.arch)) errors.push('Choose x64, arm64, or unknown for CPU architecture.');
  if (hardware.gpu && !GPUS.has(hardware.gpu)) errors.push('Choose a supported GPU option.');
  if (hardware.gpuConfirmed !== undefined && typeof hardware.gpuConfirmed !== 'boolean') errors.push('GPU support confirmation must be true or false.');
  if (hardware.osVersion !== undefined && typeof hardware.osVersion !== 'string') errors.push('Enter the OS version as text.');
  if (hardware.gpu === 'apple' && hardware.os && !['macos', 'unknown'].includes(hardware.os)) {
    errors.push('Apple unified memory belongs to an Apple Silicon Mac; check the OS and GPU selections.');
  }
  if (hardware.gpu === 'apple' && hardware.arch === 'x64') errors.push('Apple Silicon uses arm64, not x64; check the architecture.');
  if (hardware.os === 'macos' && hardware.arch === 'arm64' && ['nvidia', 'amd', 'intel'].includes(hardware.gpu)) {
    errors.push('An Apple Silicon Mac uses Apple unified memory; choose its Apple GPU rather than a discrete GPU.');
  }
  return errors;
}

function platformFor(hardware) {
  const os = hardware.os || 'unknown';
  const arch = hardware.arch || 'unknown';
  const version = String(hardware.osVersion || '').trim().toLowerCase();
  if (os === 'unknown') return { status: 'unknown', reason: 'Choose your operating system before relying on a recommendation.' };
  if (arch === 'unknown') return { status: 'unknown', reason: 'Check whether your CPU architecture is x64 or arm64.' };
  if (os === 'macos') {
    const major = Number(version.match(/(?:macos\s*)?(\d+)(?:\.\d+)*/)?.[1]);
    if (!major) return { status: 'unknown', reason: 'Enter the macOS version number from About This Mac (14 or later is required).' };
    if (major < ESTIMATE_CONFIG.macOSMinimumMajor) return { status: 'not-recommended', reason: 'Current Ollama requires macOS 14 or later; update macOS or check an alternative supported computer.' };
    return { status: 'supported', reason: arch === 'arm64' ? 'macOS 14+ on Apple Silicon supports CPU and Apple GPU execution.' : 'This Intel Mac uses CPU-only execution in the verified Ollama support baseline.' };
  }
  if (os === 'windows') {
    if (arch === 'arm64') return { status: 'unknown', reason: 'A native Windows ARM64 package was not verified in the official sources. This guide cannot make a confident recommendation for that platform.' };
    const major = Number(version.match(/(?:windows\s*)?(\d+)/)?.[1]);
    if (!major) return { status: 'unknown', reason: 'Enter Windows 11, or Windows 10 with version 22H2/build 19045 (Settings → System → About).' };
    if (major < 10) return { status: 'not-recommended', reason: 'Ollama requires Windows 10 22H2 or newer.' };
    if (major === 10) {
      const release = version.match(/\b(\d{2})h([12])\b/);
      const build = version.match(/\b(\d{5})(?:\.\d+)?\b/);
      const supportedRelease = release && (Number(release[1]) > 22 || (Number(release[1]) === 22 && release[2] === '2'));
      if (supportedRelease || (build && Number(build[1]) >= ESTIMATE_CONFIG.windows10MinimumBuild)) {
        return { status: 'supported', reason: 'Windows 10 22H2 or newer on x64 matches the verified platform baseline.' };
      }
      if (release || build) return { status: 'not-recommended', reason: 'Update Windows 10 to 22H2/build 19045 or newer before installing the current Ollama release.' };
      return { status: 'unknown', reason: 'Windows 10 alone is not specific enough: check for 22H2 or OS build 19045 or newer.' };
    }
    if (major === 11) return { status: 'supported', reason: 'Windows 11 on x64 matches the verified platform baseline.' };
    return { status: 'unknown', reason: 'This Windows version is outside the verified platform baseline; check current Ollama documentation.' };
  }
  return { status: 'supported', reason: 'Official Linux packages cover x64 and arm64. Distribution dependencies and GPU drivers still need checking in the installation guide.' };
}

function result(status, reasons, execution = 'Undetermined', profile = null, speedNote = 'Memory fit does not establish generation speed.') {
  return { status, label: LABELS[status], reasons, execution, speedNote, profile };
}

/** Every caller uses this assessment; there are no page-specific thresholds. */
export function assess(model, hardware = {}) {
  const errors = validateHardware(hardware);
  if (errors.length) return result('unknown', errors);
  if (!model?.verified) return result('unknown', ['This catalog entry has not been verified against official sources; it is excluded from confident recommendations.']);
  const profiles = profilesFor(model);
  if (!profiles) return result('unknown', ['The model lacks the verified size or memory assumptions needed for a hardware estimate.']);
  const platform = platformFor(hardware);
  if (platform.status !== 'supported') return result(platform.status, [platform.reason]);
  const reasons = [platform.reason];
  const unknownFields = [];
  if (missing(hardware.ramGB)) unknownFields.push('total system RAM');
  if (missing(hardware.diskGB)) unknownFields.push('available disk space');
  if (unknownFields.length) return result('unknown', [...reasons, `Enter ${unknownFields.join(' and ')} to assess this model.`]);
  if (hardware.diskGB < profiles.diskGB) {
    return result('not-recommended', [...reasons, `Allow at least ${profiles.diskGB} GB of free disk space for this model and installation headroom; you entered ${hardware.diskGB} GB.`]);
  }

  const isUnified = hardware.os === 'macos' && hardware.arch === 'arm64';
  const gpu = hardware.gpu || 'unknown';
  const discreteCandidate = ['nvidia', 'amd', 'intel'].includes(gpu) && hardware.os !== 'macos';
  let profile = isUnified ? profiles.unified : profiles.cpu;
  let execution = isUnified ? 'Apple unified memory' : 'CPU only';
  let speedNote = isUnified
    ? 'Apple GPU acceleration is supported, but chip generation, bandwidth, context and workload determine speed; no tokens-per-second estimate is available.'
    : 'CPU-only generation can be slow. CPU generation, memory bandwidth, context and workload determine speed; no tokens-per-second estimate is available.';
  if (isUnified) {
    reasons.push('RAM and Apple GPU memory share one pool. Only your total system-memory value is counted.');
  } else if (discreteCandidate && hardware.gpuConfirmed === true && usableNumber(hardware.vramGB) && hardware.vramGB >= profiles.gpu.minimumVRAM) {
    profile = profiles.gpu;
    execution = 'GPU acceleration';
    speedNote = 'This estimate assumes your GPU/backend and driver confirmation is correct. GPU architecture and workload still determine speed; no benchmark speed is promised.';
    reasons.push(`Your confirmed GPU has ${hardware.vramGB} GB of dedicated memory, meeting the estimated ${profile.minimumVRAM} GB GPU minimum. Host RAM is checked separately.`);
  } else if (discreteCandidate) {
    if (hardware.gpuConfirmed !== true) reasons.push('GPU/backend compatibility is not confirmed, so this recommendation uses CPU-only execution. Check the official GPU and driver lists before expecting acceleration.');
    else if (missing(hardware.vramGB)) reasons.push('Dedicated VRAM is unknown, so this recommendation uses the CPU-only profile.');
    else reasons.push(`Dedicated VRAM is below the estimated ${profiles.gpu.minimumVRAM} GB full-GPU minimum; this assessment uses CPU-only execution and makes no partial-offload promise.`);
  } else if (gpu === 'unknown') {
    reasons.push('GPU support is unknown; the model is assessed using CPU-only memory requirements.');
  } else if (gpu === 'integrated') {
    reasons.push('Integrated GPU acceleration is not assumed. Shared graphics memory is not added to system RAM.');
  }
  const status = hardware.ramGB < profile.minimumRAM ? 'not-recommended'
    : hardware.ramGB < profile.recommendedRAM || (execution === 'GPU acceleration' && hardware.vramGB < profile.recommendedVRAM) ? 'compromise'
      : 'recommended';
  reasons.push(`Estimated host-memory minimum: ${profile.minimumRAM} GB; comfortable target: ${profile.recommendedRAM} GB. You entered ${hardware.ramGB} GB.`);
  if (status === 'not-recommended') reasons.push('System memory is below the estimated minimum. Choose a smaller variant or a computer with more memory.');
  if (status === 'compromise') reasons.push('This is above the estimate’s minimum but below a comfortable memory target. Close other apps, keep context short and expect limited headroom.');
  if (execution === 'GPU acceleration') reasons.push(`Comfortable dedicated GPU-memory target: ${profile.recommendedVRAM} GB, independently of system RAM.`);
  reasons.push(`Disk check passed: ${hardware.diskGB} GB free against a ${profiles.diskGB} GB planning allowance.`);
  reasons.push(`Assumes one user, one loaded model and at most ${profiles.contextTokens.toLocaleString('en-US')} context tokens. This is a planning estimate, not a guarantee against memory pressure or crashes.`);
  return result(status, reasons, execution, profile, speedNote);
}

/** Simple local keyword matching. It neither understands intent nor calls AI. */
export function matchTask(text = '', selectedTask = '') {
  const input = String(text || '').toLowerCase().trim();
  const selected = TASKS.has(selectedTask) ? selectedTask : null;
  if (!input) return { task: selected, unsupported: false, message: selected ? 'Using your selected task category.' : 'Choose a task, or leave it empty for general-purpose starting models.' };

  if (/\b(web|internet|online|google|bing)\b.{0,20}\b(search|brows\w*)\b|\b(search|brows\w*)\b.{0,20}\b(web|internet|online|google|bing)\b/.test(input)) {
    return { task: null, unsupported: true, message: 'These local model instructions do not install web search or browsing tools. Embedding models can support local document retrieval, but neither a chat model nor an embedding model alone supplies current internet results.' };
  }

  const explicitTextArtifact = /\b(transcripts?|scripts?|outlines?|captions?|articles?|essays?|stories|story|lyrics)\b/.test(input);
  const audioTransform = /\b(transcrib\w*|speech.to.text|text.to.speech|tts|speech recognition|voice clon\w*)\b/.test(input);
  const mediaWords = /\b(audio|music|speech|voice|podcasts?|videos?|movies?|animation|media)\b/.test(input);
  const imageTextTask = /\b(generate|create|write|draft)\s+(?:(?:a|an|the|some)\s+)?(?:captions?|descriptions?|prompts?|alt text)\b/.test(input);
  const imageGenerate = !imageTextTask && /\b(generate|create|draw|paint|render|edit|upscale|retouch|make)\b.{0,45}\b(images?|pictures?|photos?|photographs?|artwork|illustrations?|logos?)\b|\b(image|photo|picture)\s+(generation|editing|generator|creation)\b|\btext.to.image\b/.test(input);
  if (audioTransform || (mediaWords && !explicitTextArtifact) || imageGenerate) {
    return { task: null, unsupported: true, message: 'No verified match for direct image generation/editing, audio processing or video generation/analysis in this catalog. Image understanding accepts still images; text models can help write scripts or summarize supplied transcripts. Other media workflows need additional software.' };
  }
  const patterns = [
    ['coding', /\b(code|coding|programming|debug\w*|javascript|python|html|css|sql|software|developer)\b/],
    ['embeddings', /\b(embedding\w*|vector\w*|search|retrieval|rag)\b/],
    ['vision', /\b(images?|pictures?|photos?|screenshots?|vision|visual|ocr)\b/],
    ['summarization', /\b(summari\w*|summar\w*|condense|digest|transcripts?)\b/],
    ['reasoning', /\b(reason\w*|logic|math\w*|problem.solv\w*|puzzles?)\b/],
    ['writing', /\b(writ\w*|edit\w*|proofread\w*|stories|story|essay\w*|articles?|scripts?|captions?|outlines?|lyrics|emails?|draft\w*)\b/],
    ['general', /\b(chat|general|assistant|everyday|conversation|questions?|help)\b/],
  ];
  const matched = patterns.find(([, pattern]) => pattern.test(input));
  if (matched) return { task: matched[0], unsupported: false, message: `Local keyword matching selected “${matched[0] === 'vision' ? 'image understanding' : matched[0]}”${selected && selected !== matched[0] ? ' from your typed request, overriding the dropdown' : ''}. Change the request or choose a category with the text field empty if this is not what you meant.` };
  if (selected) return { task: selected, unsupported: false, message: 'No keyword match was found in your text. Using your explicitly selected category; review whether it fits your request.' };
  return { task: null, unsupported: false, message: 'No task keyword matched. Choose a category to get task-specific recommendations; the current starting suggestions are general-purpose.' };
}

/** Eligible capabilities and compatibility always outrank model size. */
export function recommend(models, hardware, task = null, preference = 'balanced') {
  // Accept the matchTask result as well as a task ID so unsupported requests
  // cannot accidentally become general-purpose recommendations.
  if (task && typeof task === 'object') {
    if (task.unsupported) return [];
    task = task.task;
  }
  const purpose = task || 'general';
  if (!TASKS.has(purpose)) return [];
  const priority = ['speed', 'balanced', 'capability'].includes(preference) ? preference : 'balanced';
  return (Array.isArray(models) ? models : [])
    .filter((model) => model.verified && Array.isArray(model.tasks) && model.tasks.includes(purpose))
    .map((model) => ({ model, assessment: assess(model, hardware) }))
    .filter(({ assessment }) => ['recommended', 'compromise'].includes(assessment.status))
    .sort((left, right) => {
      const fitDifference = (left.assessment.status === 'recommended' ? 0 : 1) - (right.assessment.status === 'recommended' ? 0 : 1);
      if (fitDifference) return fitDifference;
      const leftWorking = left.model.memory.weightGiB + left.model.memory.overheadGiB + left.model.memory.kvGiB;
      const rightWorking = right.model.memory.weightGiB + right.model.memory.overheadGiB + right.model.memory.kvGiB;
      // Size is a resource preference, not an asserted quality benchmark.
      const sizeDifference = priority === 'capability' ? rightWorking - leftWorking : leftWorking - rightWorking;
      return sizeDifference || String(left.model.tag).localeCompare(String(right.model.tag));
    })
    .map(({ model, assessment }) => ({
      model,
      assessment,
      reason: `${model.name} is cataloged for ${purpose === 'vision' ? 'image understanding' : purpose} and is a ${assessment.label.toLowerCase()} for ${assessment.execution.toLowerCase()}. ${priority === 'capability' ? 'Among equal-fit choices, your capability preference tries a larger working allocation; size alone does not prove quality.' : priority === 'speed' ? 'Among equal-fit choices, your speed preference favors a smaller working allocation; this is not a speed benchmark.' : 'The balanced starting order favors comfortable fit and a smaller working allocation to preserve headroom.'}`,
    }));
}
