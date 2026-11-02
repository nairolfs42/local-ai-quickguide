/**
 * Curated LOCAL variants. Tag, artifact size, quantization and input/output facts
 * were checked against the linked primary sources on VERIFIED_DATE.
 * Descriptions/strengths/weaknesses are editorial guidance, not benchmark results.
 * memory.* values are deliberately conservative planning estimates, NOT measured
 * usage or publisher minimums. See memory() below and README for the assumptions.
 * Changing parameter count never changes a memory estimate.
 */
export const VERIFIED_DATE = '2026-11-01';

export const TASKS = [
  { id: 'general', label: 'General chat' },
  { id: 'coding', label: 'Coding' },
  { id: 'writing', label: 'Writing & editing' },
  { id: 'summarization', label: 'Summarization' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'vision', label: 'Image understanding' },
  { id: 'embeddings', label: 'Embeddings & search' }
];

const publisher = {
  qwen: 'https://qwenlm.github.io/blog/qwen3/',
  coder: 'https://qwenlm.github.io/blog/qwen2.5-coder-family/',
  gemma: 'https://ai.google.dev/gemma/docs/core/model_card_3',
  llama: 'https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct',
  embedding: 'https://ai.google.dev/gemma/docs/embeddinggemma/model_card'
};

const localRuntime = 'Runs locally through current Ollama on supported Windows, macOS or Linux systems. OS, architecture, GPU model and driver support are properties of Ollama; model size alone does not establish compatibility.';
const gemmaRuntime = 'Requires Ollama 0.6 or newer; install the current release. ' + localRuntime;
const textTasks = ['general', 'writing', 'summarization'];

function sources(tag, publisherURL, architectureURL) {
  const links = [
    { label: 'Exact Ollama variant & download size', url: `https://ollama.com/library/${tag}` },
    { label: 'Publisher documentation', url: publisherURL }
  ];
  if (architectureURL) links.push({ label: 'Publisher architecture configuration', url: architectureURL });
  return links;
}

/**
 * Decimal artifact GB is a proxy for quantized resident weights, not total RAM.
 * Convert to GiB, add 5% for rounded listings/metadata and round upward to 0.1.
 * Add separate runtime buffers and architecture-aware context working space.
 * The compatibility engine adds OS/background reserve and comfortable headroom.
 * No model has been downloaded or benchmarked for these estimates.
 */
function memory(downloadGB, overheadGiB, kvGiB, note, contextTokens = 4096) {
  return {
    weightGiB: Math.ceil(downloadGB * 1e9 / (2 ** 30) * 1.05 * 10) / 10,
    overheadGiB,
    kvGiB,
    contextTokens,
    confidence: 'estimate',
    note: `${note} Editorial estimate; one loaded model and one request. The weight allowance starts from the listed quantized artifact, converted to GiB with a 5% rounding buffer; runtime and context allowances are added separately. Not a published minimum or a benchmark.`
  };
}

function variant(data) {
  return {
    activeParametersB: null,
    quantization: 'Q4_K_M',
    inputTypes: ['text'],
    outputTypes: ['text'],
    runtimeNote: localRuntime,
    verified: true,
    verifiedDate: VERIFIED_DATE,
    ...data
  };
}

export const models = [
  variant({
    id: 'qwen3-06b', name: 'Qwen3 0.6B', family: 'Qwen3', tag: 'qwen3:0.6b-q4_K_M',
    parametersB: 0.752, parameterLabel: '0.752B in Ollama metadata (0.6B family)', downloadGB: 0.523,
    tasks: ['general', 'writing', 'summarization'],
    description: 'A tiny text model for learning the workflow and trying short, clearly scoped prompts.',
    strengths: ['Small download for a first experiment.', 'Supports multilingual text and the Qwen3 thinking/non-thinking workflow.'],
    weaknesses: ['Treat it as a learning model; verify facts and instructions.', 'Text input only; lengthy thinking can make even a tiny model feel slow.'],
    sources: sources('qwen3:0.6b-q4_K_M', publisher.qwen, 'https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json'),
    memory: memory(0.523, 0.75, 0.5, '4096-token text baseline. GQA: 28 layers × 8 KV heads × 128 head dimension; an FP16 KV calculation is about 0.44 GiB, rounded up to 0.5 GiB.')
  }),
  variant({
    id: 'qwen3-17b', name: 'Qwen3 1.7B', family: 'Qwen3', tag: 'qwen3:1.7b-q4_K_M',
    parametersB: 2.03, parameterLabel: '2.03B in Ollama metadata (1.7B family)', downloadGB: 1.4,
    tasks: [...textTasks, 'reasoning'],
    description: 'A compact option for everyday questions, short rewrites and experimenting with reasoning prompts.',
    strengths: ['Modest download and memory estimate.', 'Multilingual text; switch between thinking and direct responses.'],
    weaknesses: ['Needs careful review on multi-step or factual questions.', 'Cannot inspect images, audio or video.'],
    sources: sources('qwen3:1.7b-q4_K_M', publisher.qwen, 'https://huggingface.co/Qwen/Qwen3-1.7B/raw/main/config.json'),
    memory: memory(1.4, 0.75, 0.5, '4096-token text baseline. GQA: 28 layers × 8 KV heads × 128 head dimension; FP16 KV is approximately 0.44 GiB before rounding.')
  }),
  variant({
    id: 'qwen3-4b', name: 'Qwen3 4B', family: 'Qwen3', tag: 'qwen3:4b-q4_K_M',
    parametersB: 4.02, parameterLabel: '4.02B', downloadGB: 2.6,
    tasks: [...textTasks, 'coding', 'reasoning'],
    description: 'An original hybrid Qwen3 variant for mixed text work, simple code questions and reasoning experiments.',
    strengths: ['Several text tasks in one model.', 'Explicit tag selects the original hybrid model rather than a moving size alias.'],
    weaknesses: ['Thinking can increase response time and output length.', 'Generated code and calculations still need checking.'],
    sources: sources('qwen3:4b-q4_K_M', publisher.qwen, 'https://huggingface.co/Qwen/Qwen3-4B/raw/main/config.json'),
    memory: memory(2.6, 1, 0.75, '4096-token text baseline. GQA: 36 layers × 8 KV heads × 128 head dimension; FP16 KV is about 0.56 GiB, with additional context headroom.')
  }),
  variant({
    id: 'qwen3-8b', name: 'Qwen3 8B', family: 'Qwen3', tag: 'qwen3:8b-q4_K_M',
    parametersB: 8.19, parameterLabel: '8.19B', downloadGB: 5.2,
    tasks: [...textTasks, 'coding', 'reasoning'],
    description: 'A mid-sized general text assistant to try when your machine has room beyond the smallest models.',
    strengths: ['Covers writing, coding and reasoning workflows.', 'Multilingual text and optional thinking.'],
    weaknesses: ['More memory and computation than the compact variants.', 'CPU-only performance depends heavily on the processor and memory bandwidth.'],
    sources: sources('qwen3:8b-q4_K_M', publisher.qwen, 'https://huggingface.co/Qwen/Qwen3-8B/raw/main/config.json'),
    memory: memory(5.2, 1.25, 0.75, '4096-token text baseline. GQA: 36 layers × 8 KV heads × 128 head dimension; FP16 KV is about 0.56 GiB, rounded upward with headroom.')
  }),
  variant({
    id: 'qwen3-14b', name: 'Qwen3 14B', family: 'Qwen3', tag: 'qwen3:14b-q4_K_M',
    parametersB: 14.8, parameterLabel: '14.8B', downloadGB: 9.3,
    tasks: [...textTasks, 'coding', 'reasoning'],
    description: 'A larger dense text model for comparing responses on involved writing, code and reasoning tasks.',
    strengths: ['Broad text capabilities in one locally downloadable model.', 'Supports both direct responses and thinking.'],
    weaknesses: ['Needs substantially more memory than 4B-class models.', 'A larger model is not a correctness guarantee; longer context costs extra memory.'],
    sources: sources('qwen3:14b-q4_K_M', publisher.qwen, 'https://huggingface.co/Qwen/Qwen3-14B/raw/main/config.json'),
    memory: memory(9.3, 1.5, 1, '4096-token text baseline. GQA: 40 layers × 8 KV heads × 128 head dimension; FP16 KV is approximately 0.63 GiB, padded to 1 GiB.')
  }),
  variant({
    id: 'qwen3-30b-a3b', name: 'Qwen3 30B-A3B', family: 'Qwen3', tag: 'qwen3:30b-a3b-q4_K_M',
    parametersB: 30.5, parameterLabel: '30.5B total; approximately 3B active per token', activeParametersB: 3,
    downloadGB: 19, tasks: [...textTasks, 'coding', 'reasoning'],
    description: 'A mixture-of-experts text model for machines with a larger memory budget.',
    strengths: ['Only a subset of experts is active for each token.', 'Broad text and reasoning workflows.'],
    weaknesses: ['The full weight set still needs storage and memory; it is not a 3B-memory model.', 'This guide makes no throughput promise for its sparse architecture.'],
    sources: sources('qwen3:30b-a3b-q4_K_M', publisher.qwen, 'https://huggingface.co/Qwen/Qwen3-30B-A3B/blob/main/config.json'),
    memory: memory(19, 2, 1, '4096-token text baseline. Estimate includes the full quantized expert weights. GQA: 48 layers × 4 KV heads × 128 dimension gives about 0.38 GiB FP16 KV; 1 GiB allows extra sparse-runtime/context working space.')
  }),
  variant({
    id: 'gemma3-1b', name: 'Gemma 3 1B', family: 'Gemma 3', tag: 'gemma3:1b-it-q4_K_M',
    parametersB: 1, parameterLabel: '1B', downloadGB: 0.806, tasks: [...textTasks],
    description: 'A small instruction-tuned text model for short drafts, summaries and basic chat.',
    strengths: ['Compact text-only download.', 'Useful for learning prompts and comparing small-model responses.'],
    weaknesses: ['The 1B variant does not accept images.', 'Complex or ambiguous prompts can be challenging.'],
    runtimeNote: gemmaRuntime,
    sources: sources('gemma3:1b-it-q4_K_M', publisher.gemma),
    memory: memory(0.806, 0.75, 0.5, '4096-token text baseline. Hybrid local/global attention uses a separate conservative 0.5 GiB context allowance; no vision buffers are included for this text-only variant.')
  }),
  variant({
    id: 'gemma3-4b', name: 'Gemma 3 4B', family: 'Gemma 3', tag: 'gemma3:4b-it-q4_K_M',
    parametersB: 4.3, parameterLabel: '3.88B language + 0.42B vision projector', downloadGB: 3.4,
    tasks: [...textTasks, 'vision'], inputTypes: ['text', 'image'],
    description: 'A compact vision-language option for asking about a picture, drafting text or summarizing notes.',
    strengths: ['Accepts images as well as text.', 'Produces text explanations of visual content.'],
    weaknesses: ['Does not generate images or accept audio.', 'Visual details can be misread; multiple large images need more working memory.'],
    runtimeNote: gemmaRuntime,
    sources: sources('gemma3:4b-it-q4_K_M', publisher.gemma),
    memory: memory(3.4, 1.5, 1, '4096-token baseline with at most one ordinary image. Artifact includes the vision projector; runtime allowance includes image processing. Hybrid attention receives a conservative 1 GiB context allowance. Large images/crops or batches can exceed it.')
  }),
  variant({
    id: 'gemma3-12b', name: 'Gemma 3 12B', family: 'Gemma 3', tag: 'gemma3:12b-it-q4_K_M',
    parametersB: 12.221, parameterLabel: '11.8B language + 0.421B vision projector', downloadGB: 8.2,
    tasks: [...textTasks, 'vision', 'reasoning'], inputTypes: ['text', 'image'],
    description: 'A medium-sized vision-language model for text work and image questions on roomier computers.',
    strengths: ['One model for written prompts and visual questions.', 'Suitable for experimenting with document summaries and image descriptions.'],
    weaknesses: ['Heavier download and memory use than the 4B variant.', 'Image understanding is not image generation; factual and visual claims need review.'],
    runtimeNote: gemmaRuntime,
    sources: sources('gemma3:12b-it-q4_K_M', publisher.gemma),
    memory: memory(8.2, 2, 2, '4096-token baseline with at most one ordinary image. Full artifact includes projector weights. A 2 GiB context allowance and separate image/runtime buffers accommodate hybrid attention conservatively; many images are outside this estimate.')
  }),
  variant({
    id: 'gemma3-27b', name: 'Gemma 3 27B', family: 'Gemma 3', tag: 'gemma3:27b-it-q4_K_M',
    parametersB: 27.423, parameterLabel: '27B language + 0.423B vision projector', downloadGB: 17,
    tasks: [...textTasks, 'vision', 'reasoning'], inputTypes: ['text', 'image'],
    description: 'A larger vision-language model to compare on writing, analysis and image questions when memory permits.',
    strengths: ['Supports both text and images.', 'Offers a larger local option within the same Gemma family.'],
    weaknesses: ['Substantial memory requirement; CPU-only responses may be slow.', 'More parameters do not remove hallucinations or errors in visual interpretation.'],
    runtimeNote: gemmaRuntime,
    sources: sources('gemma3:27b-it-q4_K_M', publisher.gemma),
    memory: memory(17, 2.5, 3, '4096-token baseline with at most one ordinary image. Includes full artifact/projector weights, separate image processing buffers and 3 GiB of conservative context space. Long documents, many image crops and parallel requests are outside this estimate.')
  }),
  variant({
    id: 'qwen25-coder-15b', name: 'Qwen2.5-Coder 1.5B', family: 'Qwen2.5-Coder', tag: 'qwen2.5-coder:1.5b-instruct-q4_K_M',
    parametersB: 1.54, parameterLabel: '1.54B', downloadGB: 0.986, tasks: ['coding'],
    description: 'A compact code-focused starting point for explaining small functions and trying short code edits.',
    strengths: ['Code-specific instruction training.', 'Small download for a coding experiment.'],
    weaknesses: ['Review and test generated code before using it.', 'A chat model does not automatically read your repository or execute tests.'],
    sources: sources('qwen2.5-coder:1.5b-instruct-q4_K_M', publisher.coder),
    memory: memory(0.986, 0.75, 0.25, '4096-token code/text baseline. Publisher lists 28 layers and 2 KV heads; a small grouped-query cache allowance is budgeted separately from runtime buffers.')
  }),
  variant({
    id: 'qwen25-coder-7b', name: 'Qwen2.5-Coder 7B', family: 'Qwen2.5-Coder', tag: 'qwen2.5-coder:7b-instruct-q4_K_M',
    parametersB: 7.62, parameterLabel: '7.62B in Ollama metadata', downloadGB: 4.7, tasks: ['coding'],
    description: 'A code-focused model for generating functions, explaining failures and discussing code changes.',
    strengths: ['Designed for code generation, repair and code reasoning.', 'Instruction-tuned for conversational coding help.'],
    weaknesses: ['Reasoning here is primarily about code, not a guarantee of general mathematical accuracy.', 'Needs a separate editor/tool integration to operate on files.'],
    sources: sources('qwen2.5-coder:7b-instruct-q4_K_M', publisher.coder),
    memory: memory(4.7, 1.25, 0.5, '4096-token code/text baseline. Publisher lists 28 layers and 4 KV heads; 0.5 GiB is a padded grouped-query context allowance. Whole-repository context is outside this baseline.')
  }),
  variant({
    id: 'qwen25-coder-14b', name: 'Qwen2.5-Coder 14B', family: 'Qwen2.5-Coder', tag: 'qwen2.5-coder:14b-instruct-q4_K_M',
    parametersB: 14.8, parameterLabel: '14.8B in Ollama metadata', downloadGB: 9, tasks: ['coding'],
    description: 'A larger code-focused alternative for comparing debugging suggestions and implementation drafts.',
    strengths: ['Dedicated coding instruction model.', 'Useful for reviewing code explanations and proposed fixes.'],
    weaknesses: ['Higher memory and compute demand than the 7B variant.', 'Always test output; the model does not independently verify correctness.'],
    sources: sources('qwen2.5-coder:14b-instruct-q4_K_M', publisher.coder),
    memory: memory(9, 1.5, 1, '4096-token code/text baseline. Publisher lists 48 layers and 8 KV heads; 1 GiB is a padded grouped-query cache allowance. Longer code context needs a fresh estimate.')
  }),
  variant({
    id: 'llama32-1b', name: 'Llama 3.2 1B', family: 'Llama 3.2', tag: 'llama3.2:1b-instruct-q4_K_M',
    parametersB: 1.24, parameterLabel: '1.24B in Ollama metadata (1B family)', downloadGB: 0.808, tasks: [...textTasks],
    description: 'A small text assistant for rewriting short passages and practicing local chat.',
    strengths: ['Compact instruction-tuned model.', 'Publisher describes dialogue, rewriting and retrieval use cases.'],
    weaknesses: ['This is a text-only Llama variant.', 'Its trained knowledge is not current web search; check important facts.'],
    sources: sources('llama3.2:1b-instruct-q4_K_M', publisher.llama),
    memory: memory(0.808, 0.75, 0.5, '4096-token text baseline. A separate conservative 0.5 GiB context allowance is used for the compact grouped-query architecture, with no promise that full advertised context fits.')
  }),
  variant({
    id: 'llama32-3b', name: 'Llama 3.2 3B', family: 'Llama 3.2', tag: 'llama3.2:3b-instruct-q4_K_M',
    parametersB: 3.21, parameterLabel: '3.21B', downloadGB: 2, tasks: [...textTasks],
    description: 'A compact text model for everyday dialogue, rewriting and summaries.',
    strengths: ['Designed for assistant-style text use.', 'A modest-sized option for comparing writing and summarization results.'],
    weaknesses: ['Does not process images or audio.', 'Summaries may omit or invent details; compare them with the original.'],
    sources: sources('llama3.2:3b-instruct-q4_K_M', publisher.llama),
    memory: memory(2, 1, 0.75, '4096-token text baseline. A conservative 0.75 GiB context allowance is used for the grouped-query architecture; longer context is not covered by this profile.')
  }),
  variant({
    id: 'embeddinggemma-300m', name: 'EmbeddingGemma 300M', family: 'EmbeddingGemma', tag: 'embeddinggemma:300m-qat-q4_0',
    parametersB: 0.308, parameterLabel: '308M', quantization: 'Q4_0 (quantization-aware trained)', downloadGB: 0.239,
    tasks: ['embeddings'], outputTypes: ['embedding vectors'],
    description: 'Turns text into numerical vectors for semantic search, similarity and retrieval applications.',
    strengths: ['Small local embedding model with multilingual training.', 'Designed for search and retrieval rather than conversational replies.'],
    weaknesses: ['Returns numbers, not a chat answer; needs search/application code to use them.', 'Input is limited to 2048 tokens; split longer documents into chunks.'],
    runtimeNote: 'Requires Ollama 0.11.10 or newer. Use the /api/embed endpoint, not an interactive chat command. ' + localRuntime,
    sources: sources('embeddinggemma:300m-qat-q4_0', publisher.embedding),
    memory: memory(0.239, 0.75, 0.5, 'Exception to the generation baseline: one text of at most 2048 tokens, batch size one. The context allowance is embedding activation/attention working space, not an autoregressive KV cache. Large batches are excluded.', 2048)
  })
];
