# Local Lab

A beginner-friendly, static guide to choosing and running local models with Ollama. The first version includes **16 downloadable variants across five families**: Qwen3, Qwen2.5-Coder, Gemma 3, Llama 3.2, and EmbeddingGemma. It is a curated starting collection, not a complete model directory or benchmark ranking.

The three pages provide a searchable catalog and hardware lookup, an installation and learning guide, and a personalized quick start. Everything runs in the browser using HTML, vanilla JavaScript, and CSS. There are no runtime AI calls, backend, API keys, frameworks, external fonts, analytics, build tools, or package dependencies.

## Run locally

Open a terminal in this `local-ai-guide` directory, then run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Stop the server with `Ctrl+C`. Python 3 must already be available; this command installs nothing. If port 8000 is occupied, choose another port and use the matching URL.

Use an HTTP server rather than double-clicking `index.html`: browsers restrict JavaScript modules under `file://`. Node.js is optional and is only needed for the automated tests. `npm start` is an optional alias for the Python server command; **do not run `npm install`** because no dependencies are needed.

To host later, copy the contents of this directory to any static host that serves HTML, JavaScript modules, CSS, and SVG with their normal content types. Keep relative file paths intact. No server routes or environment variables are required. The website has not been published as part of this build.

## File responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | Model explorer, computer profile, reverse hardware lookup, filters, and navigation. |
| `install.html` | Installation, terminology, troubleshooting, and methodology page. |
| `quick-start.html` | Three-step personalized setup flow. |
| `css/styles.css` | Shared design tokens, components, responsive layout, focus states, and print styling. |
| `js/models.js` | Single source of truth for exact model variants, capabilities, sources, dates, and model-specific memory allowances. |
| `js/platform.js` | Verified platform facts, installation steps, terminology, official sources, and shell-specific API examples. |
| `js/compatibility.js` | Pure hardware validation, conditional profiles, compatibility assessment, keyword matching, and recommendation ordering. |
| `js/ui.js` | Shared form rendering, HTML escaping, saved profiles, copy fallback, hardware display, and generated instructions. |
| `js/app.js` | Catalog search, combined filters, profile actions, and model lookup. |
| `js/install.js` | Renders guide content from the shared data and instruction functions. |
| `js/quick-start.js` | Wizard navigation, recommendation selection, alternatives, copy-all, and printing. |
| `tests/compatibility.test.mjs` | Focused tests of estimation boundaries, platform validation, task matching, and catalog consistency. |
| `tests/ui-logic.test.mjs` | Generated instructions, task-specific exercises, text escaping, and manual clipboard fallback tests. |
| `favicon.svg` | Local vector favicon; no external asset request. |
| `package.json` | ES-module declaration and optional start/test aliases; no dependencies. |

## Hardware estimates

These are **editorial planning allowances, not measured usage, published manufacturer minimums, or guarantees**. No models were downloaded, run, or benchmarked during development. Results do not guarantee crash-free operation, thermal safety, answer quality, or a generation speed.

The catalog, reverse lookup, and wizard all call the same engine. `profilesFor(model)` calculates thresholds; `assess(model, hardware)` checks them; `recommend(...)` uses that same assessment. Keep any future rule changes in these functions instead of adding page-specific thresholds.

### Units and baseline

- Runtime memory uses **GiB** (`2^30` bytes). The forms label memory as GB for familiarity and explain that it approximates the number shown in system settings. There is no automatic conversion of user-entered RAM/VRAM values.
- Download sizes and available storage use **decimal GB** (`10^9` bytes). Catalog sizes are rounded figures from the linked Ollama variant pages.
- The text-generation baseline is one user, one loaded model, one request at a time, and **4,096 context tokens**. The EmbeddingGemma estimate instead covers **one text of at most 2,048 tokens**, batch size one.
- Vision allowances do not cover arbitrary image resolutions, multiple images, or batches. Longer contexts, concurrent work, large inputs, and heavy background apps can require more memory.

### Calculations

All global constants are in `ESTIMATE_CONFIG` in `js/compatibility.js`. Model-specific allowances and their reasoning live in `js/models.js`.

The quantized artifact size is a starting proxy for resident weights. `models.js` converts it to GiB, adds 5% for rounding/metadata, and rounds upward to a tenth:

```text
weightGiB = ceil(downloadGB × 10^9 / 2^30 × 1.05 × 10) / 10
W = weightGiB + overheadGiB + kvGiB
```

`overheadGiB` is a separate runtime allowance. `kvGiB` is a model-specific context/working buffer: autoregressive models use architecture-aware KV-cache estimates where available; the embedding entry uses an activation/attention allowance instead. The catalog note explains each assumption. Parameter count does not drive these formulas, and active mixture-of-experts parameters do not replace the full weight budget.

The following totals round **up to the next whole unit**:

| Budget | Current rule |
| --- | --- |
| Minimum host RAM | `ceil(W + 4)` GiB |
| Comfortable host RAM | `ceil(W × 1.25 + 6)` GiB |
| Minimum dedicated VRAM | `ceil(W + 1)` GiB, plus minimum host RAM independently |
| Comfortable dedicated VRAM | `ceil(W × 1.25 + 2)` GiB, plus comfortable host RAM independently |
| Apple unified memory | Use the host RAM figures once; CPU and GPU share that pool. |
| Free disk | `ceil(downloadGB × 1.25 + 4 + 2)` decimal GB |

The disk rule reserves 4 GB for Ollama and another 2 GB beyond the model margin. Multiple installed models, simultaneous downloads, and updates can require more. The dedicated-GPU profile deliberately still requires enough host memory for a CPU-sized working allocation. It is conservative and can exclude configurations that work with more specialized tuning.

### Result categories and execution

- **Recommended fit:** a verified entry, supported platform baseline, enough disk, and comfortable memory targets.
- **May run with compromises:** estimated minimum memory is met, but comfortable headroom is missing.
- **Not recommended:** a known platform, memory, or disk limit is not met.
- **Insufficient information:** a required input, verification, or platform condition is unknown or invalid.

GPU acceleration is considered only for a dedicated device with user-confirmed GPU/OS/driver support and sufficient dedicated VRAM. Otherwise, the engine evaluates CPU-only execution and explains that choice. This is a planning fallback; the generated commands do not force Ollama to disable or select a GPU. Actual placement is checked afterward with `ollama ps`.

RAM and VRAM are never added together, partial offloading is not promised, and Apple unified memory is counted once. Intel Macs use the verified CPU-only baseline. Capacity fit is separate from speed: optional CPU/GPU descriptions are profile notes, not a benchmark database.

The platform baseline is macOS 14+, Windows 10 22H2/build 19045 or Windows 11 on x64, and official Linux x64/ARM64 packages. Windows ARM64 is unverified and cannot receive a confident recommendation. Linux distribution dependencies and exact GPU/driver support still need checking against current documentation.

## Task matching and ranking

Task matching uses local English keyword patterns and catalog capability tags. It does not understand requests like an AI model. A recognized typed request takes priority over the dropdown; an unmatched request falls back to the selected category, or general starting suggestions, with an explanation.

Direct image generation/editing, audio processing, and video generation/analysis have no verified match in this catalog. Image understanding uses still-image input. Text models can help with supplied transcripts or scripts; embedding models return vectors and require additional application code for a complete search system.

Recommendations first filter to the requested capability and verified entries, then prioritize comfortable hardware fit over conditional fit. Within equal-fit choices, speed/balanced prefers a smaller working allocation; capability prefers a larger one. This is a resource preference, **not evidence that a larger model gives a better answer**. Unknown and unsuitable entries are not forced into the quick start.

## Generated setup instructions

The wizard generates OS-specific instructions, pulls the selected exact tag, and uses the same memory profile as the explorer. For chat and vision models it writes a small `LocalLab.Modelfile` with `FROM <exact-tag>` and `PARAMETER num_ctx 4096`, registers a `local-lab-<id>` preset, then runs that preset. This sets context before the first run instead of relying on Ollama’s hardware-dependent default. The instruction explains that the file is written in a new empty working folder.

Embeddings use the local `/api/embed` endpoint with a single short input and `truncate: false`. The catalog’s embedding model has a 2,048-token limit. The Windows example uses PowerShell; macOS/Linux use POSIX shell syntax. An embedding result is a numeric array, not conversational prose. Vision examples require the user’s real image path; no sample image is bundled.

Direct `ollama run` commands in catalog cards use Ollama’s current settings and are labeled accordingly. Use the personalized guide when you want the context preset that corresponds to the estimate. The website never executes these instructions, installs Ollama, calls the local Ollama server, or downloads model weights.

## Update the catalog and sources

Facts were checked against primary sources on **2026-11-01**. Display names, purposes, strengths, and weaknesses are editorial descriptions. Hardware numbers are explicitly estimated. Exact tags reduce ambiguity but can still be changed upstream; verification dates are not permanent guarantees.

1. Open the exact [Ollama library](https://ollama.com/library) tag page and the model publisher’s documentation. Verify that the tag is downloadable locally, its quantization, listed artifact size, parameter metadata, input/output types, capabilities, and minimum runtime version if specified. Do not substitute cloud-only variants.
2. Add or edit one entry in `js/models.js`, using a unique `id` and exact `tag`. Include official source links, `verifiedDate`, capability tags, caveats, and the per-model memory note. Update active and total parameter fields where relevant.
3. Recalculate weight, runtime, and context allowances from evidence. Document uncertainties; do not estimate solely from parameters or infer runtime RAM directly from download size. An entry with `verified: false` is excluded from confident recommendations.
4. Keep model commands derived from trusted catalog tags. Never interpolate the free-text task field or a user-provided model name into executable commands. `guideSteps()` checks catalog membership; UI text is escaped before rendering.
5. Recheck OS, architecture, drivers, and CLI changes in `js/platform.js`. Update its verification date and links when checked. If only some catalog entries were rechecked, use their individual dates rather than falsely resetting the whole catalog’s verification date.
6. Run the automated suite and inspect affected pages. Test task filters, hardware boundaries, reverse lookup, wizard instructions, empty states, copy fallback, mobile layout, and print output after relevant changes.

Useful official references:

- [macOS requirements](https://docs.ollama.com/macos), [Windows requirements](https://docs.ollama.com/windows), and [Linux installation](https://docs.ollama.com/linux)
- [GPU and driver support](https://docs.ollama.com/gpu)
- [CLI commands](https://docs.ollama.com/cli) and [local quick start](https://docs.ollama.com/quickstart)
- [Modelfile presets](https://docs.ollama.com/modelfile) and [context length](https://docs.ollama.com/context-length)
- [Embeddings API](https://docs.ollama.com/api/embed) and [vision](https://docs.ollama.com/capabilities/vision)
- [Ollama FAQ, privacy, and local-only mode](https://docs.ollama.com/faq)

Each model card separately links its exact variant and publisher sources.

## Restyle through CSS

Start with the `:root` custom properties in `css/styles.css`: colors, typography, spacing, page width, radii, border, and shadow. The stylesheet has numbered sections for base rules, navigation, the catalog, forms, guide/wizard components, feedback, responsive layouts, and printing. Reusable component classes and `data-status` attributes keep visual states separate from JavaScript behavior.

Some component-specific colors remain in the stylesheet for terminal and status treatments; adjust those selectors when building a fully different theme. Keep contrast, visible keyboard focus, text status labels, reduced-motion rules, and mobile/print styles when changing appearance. There are no inline style rules to chase through the scripts.

## Local data and privacy

Computer specs are entered manually; the browser does not detect hardware. They remain in page memory unless the user explicitly saves them or enables the wizard’s remember option. Saved profiles use the `local-lab-hardware-v1` localStorage key on the current website origin. Clear removes that profile. Profiles are not synced, and changing host or port creates a different storage origin. The app remains usable if browser storage is unavailable.

The static website sends no profile or task input to an AI service. Following official external links opens those websites, with their own data handling. Installing Ollama, pulling models, and updating require internet access; a downloaded local model can perform local inference afterward. This does not make a blanket privacy promise about third-party integrations, cloud models, or web search.

## Validation

Run the focused suite from this directory using a current Node.js release with the built-in test runner:

```sh
node --test tests/*.test.mjs
```

Or use `npm test`. No dependencies need to be installed. The tests cover CPU-memory and disk thresholds; unified-memory accounting; independent RAM/VRAM budgets; confirmed, unknown, and integrated GPUs; invalid and missing input; platform/version handling; task mismatches; ranking order; mixture-of-experts parameter independence; and the bundled catalog’s profiles.

These tests do not execute Ollama or prove actual performance. Browser interaction, clipboard permission/fallback, responsive appearance, keyboard navigation, and printed output require browser checks. No browser-test outcome is claimed in this README. Check the delivery summary for the checks actually performed for this version.

## Current limits

This is a static, manually maintained snapshot. It does not discover new models, inspect installed drivers, probe available memory, fetch live model information, benchmark hardware, or verify the user’s inputs. Models and platform support change. The estimate is intentionally conservative, English keyword matching is limited, and a manually confirmed GPU can still have driver-specific problems. No publication or model execution was performed during this build.

## Verification performed for this version

- 21 automated Node tests passed, including all 16 catalog profiles, hardware boundaries, OS gates, task exclusions, exact-tag commands, context presets, personalized first prompts, safe text rendering, and clipboard fallback with absent/denied access.
- All JavaScript modules passed syntax checks; local HTML/CSS/JS references were checked.
- Browser checks passed for combined search and filters, no-result states, unsupported media, macOS unified-memory matching, reverse lookup, exact command copying, explicit profile saving/reloading/clearing, a model-specific writing guide, insufficient disk, and a Windows embedding guide.
- Desktop (1440 px) and mobile (390 px) layouts were visually inspected. No horizontal overflow was observed on the tested views. Keyboard activation and visible focus were checked on model disclosure controls. No browser console errors or warnings were captured across the three pages.
- Print styles are provided; a physical print or PDF print-preview inspection was not performed. Clipboard fallback was verified in automated tests; successful native clipboard copying was checked in the browser.
- Ollama itself and model weights were not installed or downloaded. These are source-verified instructions, not machine-specific install or performance test results.
