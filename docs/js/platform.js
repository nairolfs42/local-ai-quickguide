// Official facts checked on the date below. Memory estimates live in compatibility.js.
export const VERIFIED_DATE = '2026-11-01';

export const platformSources = [
  { label: 'Ollama: macOS requirements and installation', url: 'https://docs.ollama.com/macos' },
  { label: 'Ollama: Windows requirements and installation', url: 'https://docs.ollama.com/windows' },
  { label: 'Ollama: Linux installation', url: 'https://docs.ollama.com/linux' },
  { label: 'Ollama: GPU and driver support', url: 'https://docs.ollama.com/gpu' },
  { label: 'Ollama: command-line reference', url: 'https://docs.ollama.com/cli' },
  { label: 'Ollama: local quick start', url: 'https://docs.ollama.com/quickstart' },
  { label: 'Ollama: context length', url: 'https://docs.ollama.com/context-length' },
  { label: 'Ollama: privacy, local-only mode, and troubleshooting FAQ', url: 'https://docs.ollama.com/faq' },
  { label: 'Ollama: image understanding', url: 'https://docs.ollama.com/capabilities/vision' },
  { label: 'Ollama: embeddings API', url: 'https://docs.ollama.com/api/embed' },
  { label: 'Ollama: embedding workflows', url: 'https://docs.ollama.com/capabilities/embeddings' },
];

export const platforms = {
  macos: {
    name: 'macOS',
    requirements: 'macOS Sonoma 14 or newer. Apple M-series Macs support CPU and Metal GPU execution. Intel/x86 Macs use the CPU. Treat the memory shown for an Apple M-series Mac as one shared pool, not RAM plus VRAM.',
    architectures: ['arm64', 'x64'],
    shell: 'Terminal (zsh or bash)',
    source: 'https://docs.ollama.com/macos',
    specHelp: 'Open Apple menu → About This Mac for your chip, memory, and macOS version. An Apple M-series chip means ARM64; Intel means x64. Open System Settings → General → Storage for available disk space.',
    installSteps: [
      { title: 'Download the Mac app', body: 'Download Ollama from its official site. Open the downloaded disk image and drag Ollama to Applications.', url: 'https://ollama.com/download/mac' },
      { title: 'Open Ollama', body: 'Launch Ollama from Applications. If asked, allow it to add its command-line tool to your path. Keep the app running.' },
      { title: 'Open Terminal and check installation', body: 'Open the Terminal app and enter this command. A version number should appear. If the command is missing, reopen Terminal after finishing app setup.', command: 'ollama -v' },
    ],
  },
  windows: {
    name: 'Windows',
    requirements: 'Windows 10 22H2 or newer, Home or Pro. This guide verifies the x64 install path; native Windows ARM64 is not verified. Allow at least 4 GB for Ollama itself, plus model files and headroom. NVIDIA requires driver 551.61 or newer; some older cards require 570 or newer. AMD acceleration depends on the card and its ROCm 7/HIP7 or Vulkan driver.',
    architectures: ['x64'],
    shell: 'PowerShell',
    source: 'https://docs.ollama.com/windows',
    specHelp: 'Open Settings → System → About for installed RAM, system type, and Windows version. Task Manager → Performance shows your CPU, GPU, and dedicated GPU memory. File Explorer → This PC shows free disk space. On Windows 10, confirm version 22H2.',
    installSteps: [
      { title: 'Download the Windows installer', body: 'Get OllamaSetup.exe from the official download page and run it. The normal installer works in your user account without Administrator privileges.', url: 'https://ollama.com/download/windows' },
      { title: 'Start Ollama and open PowerShell', body: 'Ollama runs in the background after installation. Open a new PowerShell window from the Start menu so it picks up the installed command.' },
      { title: 'Check installation', body: 'Enter the command below in PowerShell. A version number should appear. If Ollama is not running, open it from the Start menu and try again.', command: 'ollama -v' },
    ],
  },
  linux: {
    name: 'Linux',
    requirements: 'Official Linux packages cover x64 (amd64) and ARM64. Ollama does not give one universal distribution/version minimum in this installation guide; driver and system-library compatibility still matter. GPU acceleration needs a supported device and driver. CPU-only execution is an option.',
    architectures: ['x64', 'arm64'],
    shell: 'Terminal (bash or another POSIX shell)',
    source: 'https://docs.ollama.com/linux',
    specHelp: 'Check your distribution’s About/System Information panel. In a terminal, uname -m reports architecture, free -h reports RAM, and df -h reports free disk. x86_64 means x64; aarch64 means ARM64. Use your system’s hardware panel to find the GPU.',
    installSteps: [
      { title: 'Review and run the official installer', body: 'Open a terminal. This official command downloads and executes Ollama’s install script and may request your password for system changes. The linked Linux guide also covers manual installation.', url: 'https://docs.ollama.com/linux', command: 'curl -fsSL https://ollama.com/install.sh | sh' },
      { title: 'Check installation', body: 'Run this command in the terminal. If it reports that the server is unavailable, use the next step.', command: 'ollama -v' },
      { title: 'Start the server if needed', body: 'If the installer already started Ollama, skip this step. Otherwise run this command, leave this terminal open, and use a second terminal for model commands. Systemd service instructions are in the official Linux guide.', command: 'ollama serve' },
    ],
  },
};

export function getInstallSteps(os) {
  return platforms[os]?.installSteps ?? [];
}

export const gpuGuidance = [
  'Apple M-series: Metal acceleration uses the same unified memory pool as the rest of your Mac. Intel Macs use CPU execution.',
  'NVIDIA: check the exact card’s compute capability and driver. The hardware guide lists compute capability 5.0+ and driver 550+; capability 5.0–6.2 needs 570+. The Windows guide sets a 551.61+ minimum.',
  'AMD: ROCm 7 support varies by exact card and operating system. A card supported on Linux is not automatically supported through ROCm on Windows.',
  'Vulkan: additional Windows/Linux support is enabled by default when its backend is installed. Linux may need extra driver packages. An integrated or unlisted GPU is not assumed compatible by this guide.',
  'After loading a model, run ollama ps and inspect PROCESSOR. A CPU/GPU split means partial offloading; this guide does not promise a particular split or speed.',
];

export const lifecycleCommands = [
  { label: 'Check Ollama version — enter in your shell', command: 'ollama -v', context: 'shell' },
  { label: 'List downloaded models — enter in your shell', command: 'ollama ls', context: 'shell' },
  { label: 'Inspect loaded models and CPU/GPU use — enter in your shell', command: 'ollama ps', context: 'shell' },
  { label: 'Use this guide’s 4,096-token baseline — enter inside an Ollama chat', command: '/set parameter num_ctx 4096', context: 'chat' },
  { label: 'Leave a chat — enter inside an Ollama chat', command: '/bye', context: 'chat' },
];

export const glossary = [
  { term: 'Ollama', definition: 'Software that downloads and runs supported AI models. This guide uses downloaded models on your computer.' },
  { term: 'Model', definition: 'A trained set of numerical weights that turns input into an output. Different models handle different tasks.' },
  { term: 'Parameters', definition: 'The adjustable numbers learned during training. B means billion. Parameter count alone cannot tell you how much memory a model needs or how well it will answer.' },
  { term: 'Quantization', definition: 'Storing model weights with fewer bits to reduce their size. It can change both memory needs and answer quality. Q4 and Q8 are examples; exact formats matter.' },
  { term: 'Context window', definition: 'How much input and conversation the model can work with at once, measured in tokens. Tokens are pieces of text, not necessarily whole words. A longer context can need more memory.' },
  { term: 'KV cache', definition: 'Working memory used by many language models to reuse information from earlier tokens. Its size depends on the model, context, and implementation.' },
  { term: 'RAM', definition: 'The computer’s main working memory. Your operating system and other apps need some of it too.' },
  { term: 'VRAM', definition: 'Memory on a dedicated graphics card. More VRAM does not by itself prove that the card or driver works with Ollama.' },
  { term: 'Unified memory', definition: 'One memory pool shared by CPU and GPU, as on Apple M-series Macs. Count it once, with room for the operating system and other apps.' },
  { term: 'Disk space', definition: 'Storage that keeps downloaded model files when the computer is off. Free disk space cannot substitute for working memory.' },
  { term: 'Embeddings', definition: 'Lists of numbers that represent text for tasks such as similarity search. An embedding model returns vectors; it does not write a conversational answer.' },
  { term: 'Mixture of experts', definition: 'A model that activates part of its parameters for each token. Its active parameter count is not a reliable measure of all the weights that must be stored.' },
];

export const troubleshooting = [
  { title: 'Not enough memory, or the computer becomes unresponsive', body: 'Stop the model, close other memory-heavy apps, and choose a smaller variant. Keep the context near the stated baseline. Leave operating-system headroom; a memory estimate is not a guarantee.' },
  { title: 'Responses are slow', body: 'The first response may include loading time. CPU execution, large models, long prompts, and partial offloading can be slower. Try a smaller model and a short prompt. This guide does not predict tokens per second.' },
  { title: 'The model download fails', body: 'Check your connection and free disk space, verify the exact tag in its official library page, then retry the pull command. For proxy or certificate errors, use the linked Ollama FAQ.' },
  { title: 'The GPU is not being used', body: 'Run ollama ps while a model is loaded. Match your card and driver against the official support page. CPU execution can still work with enough RAM. Do not infer GPU support from VRAM capacity.' },
  { title: 'The shell cannot find ollama, or cannot reach the server', body: 'Reopen the shell after installation. On macOS/Windows, open the Ollama app. On Linux, start the installed service or run ollama serve in another terminal. Do not start a second server if one is already running.' },
  { title: 'A model returns numbers instead of prose', body: 'That is expected for an embedding model. Choose a chat model to get written answers. Embeddings are building blocks for search software, not a complete document-search app by themselves.' },
];

export const localUseGuidance = [
  'Installation, model downloads, and updates need internet access. After downloading a local model, local inference can work offline. This catalog excludes cloud-only variants.',
  'Ollama says local prompts and responses are not sent to Ollama. Cloud models and web search use online services; connected apps may have their own data handling.',
  'For local-only mode, the official FAQ documents disable_ollama_cloud in server.json or OLLAMA_NO_CLOUD=1, followed by an Ollama restart. Setting an environment variable depends on how the app/service was started.',
  'Ollama’s local API normally listens at localhost:11434. This website only generates instructions; it does not connect to your Ollama server or submit prompts.',
];

export const contextGuidance = 'The estimates use one model, one request at a time, and a 4,096-token text context (or the model’s smaller maximum). Ollama’s defaults may differ by hardware and release. Explicitly select this baseline before using the estimate; longer context, images, and concurrent requests can require more memory.';

// Root UI calls these only with a catalog model. Shell input comes from the
// allowlisted catalog tag, never the task field or a user-entered model name.
export function embeddingCommand(tag, os) {
  if (!/^[a-z0-9][a-z0-9._/-]*:[a-z0-9][a-z0-9._-]*$/i.test(tag)) throw new Error('Expected a catalog model tag.');
  const payload = JSON.stringify({ model: tag, input: 'A small local search example.', truncate: false });
  if (os === 'windows') {
    return `Invoke-RestMethod -Method Post -Uri 'http://localhost:11434/api/embed' -ContentType 'application/json' -Body '${payload}'`;
  }
  return `curl http://localhost:11434/api/embed -H 'Content-Type: application/json' -d '${payload}'`;
}

export function visionCommand(tag, os) {
  if (!/^[a-z0-9][a-z0-9._/-]*:[a-z0-9][a-z0-9._-]*$/i.test(tag)) throw new Error('Expected a catalog model tag.');
  const path = os === 'windows' ? '.\\example.jpg' : './example.jpg';
  return `ollama run ${tag} "Describe this image in one sentence: ${path}"`;
}
