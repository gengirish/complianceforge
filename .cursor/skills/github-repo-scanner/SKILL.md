---
name: github-repo-scanner
description: >-
  Scan GitHub/GitLab repositories for AI model usage and auto-populate compliance inventory.
  Use when discovering AI systems in codebases, detecting ML library dependencies,
  finding model files, or auditing repositories for EU AI Act compliance.
---

# GitHub Repository Scanner

## Detection Signatures

### Python AI/ML Libraries
```
tensorflow, keras, torch, pytorch, transformers, huggingface_hub,
openai, anthropic, google.generativeai, langchain, llamaindex,
sklearn, scikit-learn, xgboost, lightgbm, catboost, prophet,
spacy, nltk, gensim, sentence_transformers, diffusers, accelerate,
auto-gptq, bitsandbytes, peft, trl, vllm, mlflow, wandb, optuna
```

### JavaScript/TypeScript AI Libraries
```
@tensorflow/tfjs, onnxruntime-web, openai, @anthropic-ai/sdk,
@google/generative-ai, langchain, llamaindex, ml5, brain.js,
@huggingface/inference, replicate, cohere-ai, ai (vercel ai sdk)
```

### Model File Extensions
```
.onnx, .pt, .pth, .h5, .hdf5, .pkl, .joblib, .safetensors,
.bin (with model config), .pb, .tflite, .mlmodel, .pmml,
.gguf, .ggml, .q4_0, .q8_0
```

### API Endpoint Patterns
```
api.openai.com, api.anthropic.com, generativelanguage.googleapis.com,
api.cohere.ai, api.replicate.com, api.huggingface.co,
*.openai.azure.com, bedrock-runtime.*.amazonaws.com
```

### Configuration Files
```
.env (OPENAI_API_KEY, ANTHROPIC_API_KEY, HF_TOKEN patterns)
model_config.json, config.json (with model_type field)
mlflow.yaml, wandb/settings, dvc.yaml
```

## Scan Workflow

1. **Clone/access** repository (read-only)
2. **Parse** dependency files (requirements.txt, package.json, pyproject.toml, Cargo.toml, go.mod)
3. **Search** for AI library imports in source code
4. **Detect** model files in repository
5. **Identify** API endpoints and keys in configuration
6. **Classify** each finding by AI system type
7. **Generate** inventory entries with metadata

## Output Format

```json
{
  "repository": "org/repo-name",
  "scan_date": "2026-03-20T00:00:00Z",
  "ai_systems_found": [
    {
      "name": "Customer Churn Predictor",
      "type": "classification_model",
      "framework": "scikit-learn",
      "files": ["models/churn_model.pkl", "src/predict.py"],
      "dependencies": ["scikit-learn==1.4.0", "pandas==2.2.0"],
      "api_calls": [],
      "suggested_risk_tier": "limited",
      "confidence": 0.7,
      "suggested_sector": "financial_services",
      "suggested_use_case": "Customer retention prediction",
      "requires_review": true
    }
  ],
  "total_findings": 1,
  "review_required": 1
}
```

## Integration with Inventory

After scanning, auto-create inventory entries:
1. Map findings to AI system inventory schema
2. Pre-fill sector, use case, and technology fields
3. Flag for human review before risk classification
4. Link to source repository for traceability
