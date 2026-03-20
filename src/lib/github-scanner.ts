import { Octokit } from "octokit";

function normalizePkgName(name: string): string {
  return name.trim().toLowerCase().replace(/_/g, "-");
}

/** Python AI/ML packages (match normalized names). */
export const PYTHON_AI_PACKAGES = new Set(
  [
    "tensorflow",
    "keras",
    "torch",
    "pytorch",
    "transformers",
    "huggingface_hub",
    "huggingface-hub",
    "openai",
    "anthropic",
    "google.generativeai",
    "google-generativeai",
    "langchain",
    "llamaindex",
    "sklearn",
    "scikit-learn",
    "scikit_learn",
    "xgboost",
    "lightgbm",
    "catboost",
    "prophet",
    "spacy",
    "nltk",
    "gensim",
    "sentence_transformers",
    "sentence-transformers",
    "diffusers",
    "accelerate",
    "auto-gptq",
    "auto_gptq",
    "bitsandbytes",
    "peft",
    "trl",
    "vllm",
    "mlflow",
    "wandb",
    "optuna",
  ].map((p) => normalizePkgName(p))
);

/** npm package names / scopes to match (exact or prefix for scoped). */
export const NPM_AI_PACKAGES: string[] = [
  "@tensorflow/tfjs",
  "onnxruntime-web",
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "langchain",
  "llamaindex",
  "ml5",
  "brain.js",
  "@huggingface/inference",
  "replicate",
  "cohere-ai",
  "ai",
];

const MODEL_EXTENSIONS = [
  ".onnx",
  ".pt",
  ".pth",
  ".h5",
  ".hdf5",
  ".pkl",
  ".joblib",
  ".safetensors",
  ".bin",
  ".pb",
  ".tflite",
  ".mlmodel",
  ".pmml",
  ".gguf",
  ".ggml",
  ".q4_0",
  ".q8_0",
] as const;

/** Host/subdomain patterns for .env and config scanning. */
const API_HOST_SNIPPETS = [
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "api.cohere.ai",
  "api.replicate.com",
  "api.huggingface.co",
  ".openai.azure.com",
  "bedrock-runtime.",
  ".amazonaws.com",
] as const;

const ENV_KEY_PATTERNS =
  /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|HF_TOKEN|HF_API_KEY|GOOGLE_AI_API_KEY|COHERE_API_KEY|REPLICATE_API_TOKEN)\b/gi;

export interface ScanFinding {
  /** Suggested inventory system name */
  name: string;
  framework: string;
  files: string[];
  dependencies: string[];
  suggestedRiskTier: string;
  suggestedSector: string;
  confidence: number;
  apiEndpoints?: string[];
  suggestedUseCase?: string;
}

export interface RepositoryScanResult {
  repository: string;
  branch: string;
  findings: ScanFinding[];
  totalFindings: number;
  reviewRequired: number;
  truncatedTree?: boolean;
  errors: string[];
}

function extractPythonPkgFromLine(line: string): string | null {
  const stripped = line.split("#")[0]?.trim() ?? "";
  if (!stripped || stripped.startsWith("-")) return null;
  const m = stripped.match(/^([a-zA-Z0-9_.-]+)/);
  if (!m?.[1]) return null;
  return normalizePkgName(m[1].replace(/_/g, "-"));
}

export function parseGithubRepo(input: string): { owner: string; repo: string } {
  const raw = input.trim();
  if (!raw) throw new Error("Repository URL or owner/repo is required");

  let path = raw;
  const ghMatch = raw.match(
    /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:\/)?(?:#.*)?(?:\?.*)?$/i
  );
  if (ghMatch?.[1] && ghMatch[2]) {
    return {
      owner: ghMatch[1],
      repo: ghMatch[2].replace(/\.git$/i, ""),
    };
  }

  if (raw.includes("://")) {
    try {
      const u = new URL(raw);
      path = u.pathname.replace(/^\/+/, "");
    } catch {
      path = raw;
    }
  }

  path = path.replace(/^\/+/, "").replace(/\.git$/i, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const o = parts[0];
    const r = parts[1];
    if (o && r) return { owner: o, repo: r.split(/[?#]/)[0] ?? r };
  }

  throw new Error('Invalid format. Use "owner/repo" or a github.com URL.');
}

function decodeContent(data: { content?: string; encoding?: string }): string {
  if (!data.content || data.encoding !== "base64") return "";
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

function parsePackageJsonJson(text: string): string[] {
  try {
    const j = JSON.parse(text) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const keys: string[] = [];
    for (const block of [
      j.dependencies,
      j.devDependencies,
      j.optionalDependencies,
      j.peerDependencies,
    ]) {
      if (block && typeof block === "object") keys.push(...Object.keys(block));
    }
    return keys;
  } catch {
    return [];
  }
}

function matchNpmAiPackages(pkgNames: string[]): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const name of pkgNames) {
    const lower = name.toLowerCase();
    for (const sig of NPM_AI_PACKAGES) {
      if (lower === sig.toLowerCase() || lower.startsWith(sig.toLowerCase() + "/")) {
        if (!seen.has(name)) {
          seen.add(name);
          matched.push(name);
        }
        break;
      }
    }
  }
  return matched;
}

function parseRequirementsTxt(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split("\n")) {
    const pkg = extractPythonPkgFromLine(line);
    if (pkg) names.push(pkg);
  }
  return names;
}

function parsePyprojectToml(text: string): string[] {
  const names: string[] = [];
  const lines = text.split("\n");
  let inPoetryDeps = false;
  let inPep621Deps = false;
  let bracketDepth = 0;

  for (const line of lines) {
    const t = line.trim();
    if (/^\[tool\.poetry\.dependencies\]/i.test(t)) {
      inPoetryDeps = true;
      inPep621Deps = false;
      continue;
    }
    if (/^\[project\]/i.test(t)) {
      inPoetryDeps = false;
      inPep621Deps = false;
      continue;
    }
    if (inPoetryDeps && /^\[/.test(t)) {
      inPoetryDeps = false;
    }
    if (/^\[project\.optional-dependencies\]/i.test(t) || /^\[/.test(t)) {
      inPep621Deps = false;
    }
    if (/^dependencies\s*=\s*\[/i.test(t)) {
      inPep621Deps = true;
      bracketDepth = (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
      continue;
    }
    if (inPep621Deps) {
      bracketDepth += (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
      const m = t.match(/"([a-zA-Z0-9_.-]+)/) || t.match(/'([a-zA-Z0-9_.-]+)/);
      if (m?.[1]) {
        const pkg = extractPythonPkgFromLine(m[1]);
        if (pkg) names.push(pkg);
      }
      if (bracketDepth <= 0 && t.includes("]")) inPep621Deps = false;
      continue;
    }
    if (inPoetryDeps && t && !t.startsWith("#")) {
      const m = t.match(/^([a-zA-Z0-9_.-]+)\s*=/);
      if (m?.[1] && m[1].toLowerCase() !== "python") {
        names.push(normalizePkgName(m[1]));
      }
    }
  }
  return names;
}

function matchPythonAiPackages(normalizedNames: string[]): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const n of normalizedNames) {
    if (PYTHON_AI_PACKAGES.has(n) && !seen.has(n)) {
      seen.add(n);
      matched.push(n);
    }
  }
  return matched;
}

function pathLooksLikeModelFile(path: string): boolean {
  const lower = path.toLowerCase();
  for (const ext of MODEL_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function pathLooksLikeEnvFile(path: string): boolean {
  const base = path.split("/").pop() ?? "";
  return /^\.env/.test(base) && !base.endsWith(".sample") && !base.endsWith(".example");
}

function scanTextForApiSignals(text: string): { hosts: string[]; keys: string[] } {
  const hosts: string[] = [];
  const lower = text.toLowerCase();
  for (const h of API_HOST_SNIPPETS) {
    if (lower.includes(h.toLowerCase())) hosts.push(h);
  }
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(ENV_KEY_PATTERNS.source, "gi");
  while ((m = re.exec(text)) !== null) {
    if (m[1]) keys.push(m[1]);
  }
  return { hosts: [...new Set(hosts)], keys: [...new Set(keys)] };
}

function inferSectorFromContext(repoName: string, paths: string[]): string {
  const blob = `${repoName} ${paths.join(" ")}`.toLowerCase();
  if (/health|medical|clinical|patient|diagnos/i.test(blob)) return "Healthcare";
  if (/finance|bank|credit|fraud|trading|payment/i.test(blob)) return "Financial Services";
  if (/police|law.enforcement|crime|surveillance/i.test(blob)) return "Law Enforcement";
  if (/border|migration|visa|asylum/i.test(blob)) return "Migration & Border Control";
  if (/hr|hiring|recruit|employ/i.test(blob)) return "Employment & HR";
  if (/education|student|school|university/i.test(blob)) return "Education";
  if (/bio|face|fingerprint|iris|gait/i.test(blob)) return "Biometric Identification";
  return "Other";
}

function dominantFramework(
  npmMatches: string[],
  pyMatches: string[]
): string {
  const py0 = pyMatches[0];
  const npm0 = npmMatches[0];
  if (py0 && npm0) {
    return `${py0} + ${npm0}`;
  }
  if (py0) {
    const map: Record<string, string> = {
      torch: "PyTorch",
      pytorch: "PyTorch",
      tensorflow: "TensorFlow",
      keras: "Keras",
      transformers: "Hugging Face Transformers",
      openai: "OpenAI (Python)",
      anthropic: "Anthropic (Python)",
      langchain: "LangChain",
      llamaindex: "LlamaIndex",
      sklearn: "scikit-learn",
      "scikit-learn": "scikit-learn",
    };
    return map[py0] ?? py0;
  }
  if (npm0) {
    const map: Record<string, string> = {
      openai: "OpenAI (Node)",
      "@anthropic-ai/sdk": "Anthropic SDK",
      "@google/generative-ai": "Google Generative AI",
      langchain: "LangChain",
      "@tensorflow/tfjs": "TensorFlow.js",
      "@huggingface/inference": "Hugging Face Inference",
    };
    const key = npm0.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (key === k.toLowerCase()) return v;
    }
    return npm0;
  }
  return "Unknown";
}

function suggestRiskTier(args: {
  hasGenerativeApi: boolean;
  hasModelFiles: boolean;
  depCount: number;
}): string {
  if (args.hasGenerativeApi) return "limited";
  if (args.hasModelFiles && args.depCount > 0) return "limited";
  if (args.depCount > 0) return "limited";
  return "unassessed";
}

function confidenceScore(args: {
  depCount: number;
  modelCount: number;
  apiCount: number;
}): number {
  let c = 0.35;
  if (args.depCount > 0) c += 0.25;
  if (args.modelCount > 0) c += 0.2;
  if (args.apiCount > 0) c += 0.15;
  return Math.min(0.95, Math.round(c * 100) / 100);
}

async function getTextFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    if (Array.isArray(data) || data.type !== "file") return null;
    return decodeContent(data);
  } catch {
    return null;
  }
}

/**
 * Scans a GitHub repository for AI/ML dependencies, model files, and API-related .env patterns.
 * Pass an empty token for public repos only; private repos require a PAT.
 */
export async function scanRepository(
  token: string,
  owner: string,
  repo: string
): Promise<RepositoryScanResult> {
  const errors: string[] = [];
  const octokit = new Octokit(token ? { auth: token } : {});

  let defaultBranch = "main";
  let repoPrivate = false;
  try {
    const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
    defaultBranch = repoInfo.default_branch || "main";
    repoPrivate = Boolean(repoInfo.private);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load repository";
    const notFound = /404|not found/i.test(msg);
    throw new Error(
      notFound
        ? `Repository not found or inaccessible.${!token?.trim() ? " Private repositories require a GitHub Personal Access Token." : ""}`
        : msg
    );
  }

  if (repoPrivate && !token?.trim()) {
    throw new Error(
      "This repository is private. Provide a GitHub Personal Access Token with repo read access."
    );
  }

  let treeSha: string;
  try {
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: refData.object.sha,
    });
    treeSha = commit.tree.sha;
  } catch {
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });
      const { data: commit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: refData.object.sha,
      });
      treeSha = commit.tree.sha;
      defaultBranch = "main";
    } catch (e2) {
      throw new Error(
        e2 instanceof Error ? e2.message : "Could not resolve default branch"
      );
    }
  }

  let truncatedTree = false;
  const allPaths: string[] = [];
  try {
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true",
    });
    truncatedTree = Boolean(tree.truncated);
    for (const item of tree.tree) {
      if (item.type === "blob" && item.path) allPaths.push(item.path);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Failed to list repository tree");
  }

  const modelFiles = allPaths.filter(pathLooksLikeModelFile);
  const envPaths = allPaths.filter(pathLooksLikeEnvFile).slice(0, 25);

  const [pkgJson, reqTxt, pyproject] = await Promise.all([
    getTextFile(octokit, owner, repo, "package.json", defaultBranch),
    getTextFile(octokit, owner, repo, "requirements.txt", defaultBranch),
    getTextFile(octokit, owner, repo, "pyproject.toml", defaultBranch),
  ]);

  const npmKeys = pkgJson ? parsePackageJsonJson(pkgJson) : [];
  const npmMatches = matchNpmAiPackages(npmKeys);

  const pyFromReq = reqTxt ? parseRequirementsTxt(reqTxt) : [];
  const pyFromProject = pyproject ? parsePyprojectToml(pyproject) : [];
  const pyNormalized = [...pyFromReq, ...pyFromProject].map((p) =>
    typeof p === "string" ? normalizePkgName(p) : p
  );
  const pyMatches = matchPythonAiPackages(pyNormalized);

  const dependencyLabels = [
    ...npmMatches.map((n) => `${n} (npm)`),
    ...pyMatches.map((p) => `${p} (pypi)`),
  ];

  const apiHosts: string[] = [];
  const apiKeys: string[] = [];
  for (const envPath of envPaths) {
    const text = await getTextFile(octokit, owner, repo, envPath, defaultBranch);
    if (!text) continue;
    const { hosts, keys } = scanTextForApiSignals(text);
    apiHosts.push(...hosts);
    apiKeys.push(...keys);
  }
  const uniqueHosts = [...new Set(apiHosts)];
  const uniqueKeyHints = [...new Set(apiKeys)];

  const findings: ScanFinding[] = [];
  const repoSlug = `${owner}/${repo}`;
  const sector = inferSectorFromContext(repo, [...modelFiles, ...allPaths.slice(0, 50)]);

  const hasStack = npmMatches.length > 0 || pyMatches.length > 0 || modelFiles.length > 0;
  if (hasStack) {
    const fw = dominantFramework(npmMatches, pyMatches);
    const risk = suggestRiskTier({
      hasGenerativeApi: uniqueHosts.length > 0 || uniqueKeyHints.length > 0,
      hasModelFiles: modelFiles.length > 0,
      depCount: npmMatches.length + pyMatches.length,
    });
    findings.push({
      name: `${repo} — ML stack & artifacts`,
      framework: fw,
      files: [...new Set([...(pkgJson ? ["package.json"] : []), ...(reqTxt ? ["requirements.txt"] : []), ...(pyproject ? ["pyproject.toml"] : []), ...modelFiles.slice(0, 40)])],
      dependencies: dependencyLabels,
      suggestedRiskTier: risk,
      suggestedSector: sector,
      confidence: confidenceScore({
        depCount: npmMatches.length + pyMatches.length,
        modelCount: modelFiles.length,
        apiCount: uniqueHosts.length + uniqueKeyHints.length,
      }),
      apiEndpoints: uniqueHosts.length ? uniqueHosts : undefined,
      suggestedUseCase: "Inferred from repository dependencies and model artifacts — confirm purpose in inventory.",
    });
  }

  if (
    !hasStack &&
    (uniqueHosts.length > 0 || uniqueKeyHints.length > 0)
  ) {
    findings.push({
      name: `${repo} — External AI APIs`,
      framework: "Cloud / API (env configuration)",
      files: envPaths.slice(0, 15),
      dependencies: uniqueKeyHints.map((k) => `${k} (env)`),
      suggestedRiskTier: "limited",
      suggestedSector: sector,
      confidence: confidenceScore({
        depCount: 0,
        modelCount: 0,
        apiCount: uniqueHosts.length + uniqueKeyHints.length,
      }),
      apiEndpoints: uniqueHosts,
      suggestedUseCase:
        "Application may call third-party AI APIs — document data flows and DPA in inventory.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      name: `${repo} — No AI signals`,
      framework: "None detected",
      files: [],
      dependencies: [],
      suggestedRiskTier: "minimal",
      suggestedSector: "Other",
      confidence: 0.4,
      suggestedUseCase: "No matching ML dependencies, model files, or API patterns were found on the default branch.",
    });
  }

  const reviewRequired = findings.filter((f) => f.confidence < 0.75).length;

  return {
    repository: repoSlug,
    branch: defaultBranch,
    findings,
    totalFindings: findings.length,
    reviewRequired,
    truncatedTree,
    errors,
  };
}
