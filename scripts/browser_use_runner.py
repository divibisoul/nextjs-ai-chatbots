#!/usr/bin/env python3
import asyncio
import json
import os
import sys

def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    raise SystemExit(code)

try:
    request = json.load(sys.stdin)
except Exception as exc:
    emit({"state": "FAIL", "code": "BROWSER_USE_REQUEST_INVALID", "detail": str(exc)}, 2)

root = os.path.abspath(str(request.get("root") or "").strip())
task = str(request.get("task") or "").strip()
provider = str(request.get("provider") or "openai").strip().lower()
model = str(request.get("model") or "").strip()
allowed_domains = request.get("allowedDomains") or []
prohibited_domains = request.get("prohibitedDomains") or []
max_steps = int(request.get("maxSteps") or 20)
use_vision = bool(request.get("useVision", False))

if not root or not os.path.isdir(root):
    emit({"state": "DEGRADED", "code": "BROWSER_USE_SOURCE_NOT_AVAILABLE"}, 0)
if not task:
    emit({"state": "FAIL", "code": "BROWSER_USE_TASK_REQUIRED"}, 2)
if provider not in {"openai", "google", "browser-use", "ollama"}:
    emit({"state": "FAIL", "code": "BROWSER_USE_LLM_PROVIDER_UNSUPPORTED", "provider": provider}, 2)

sys.path.insert(0, root)

try:
    from browser_use import Agent, BrowserSession, ChatBrowserUse, ChatGoogle, ChatOllama, ChatOpenAI
except Exception as exc:
    emit({"state": "DEGRADED", "code": "BROWSER_USE_PYTHON_IMPORT_FAILED", "detail": str(exc)}, 0)

try:
    if provider == "google":
        llm = ChatGoogle(model=model, api_key=os.environ.get("GOOGLE_API_KEY"))
    elif provider == "browser-use":
        llm = ChatBrowserUse(model=model)
    elif provider == "ollama":
        llm = ChatOllama(model=model)
    else:
        llm = ChatOpenAI(model=model, api_key=os.environ.get("OPENAI_API_KEY"))

    browser = BrowserSession(
        allowed_domains=list(allowed_domains) or None,
        prohibited_domains=list(prohibited_domains) or None,
    )
    agent = Agent(
        task=task,
        llm=llm,
        browser_session=browser,
        use_vision=use_vision,
    )
    history = asyncio.run(agent.run(max_steps=max_steps))
    final_result = history.final_result()
    asyncio.run(browser.kill())
except Exception as exc:
    emit({"state": "FAIL", "code": "BROWSER_USE_EXECUTION_FAILED", "detail": str(exc)}, 2)

emit({
    "state": "PASS",
    "provider": "browser-use",
    "llmProvider": provider,
    "model": model,
    "maxSteps": max_steps,
    "finalResult": final_result,
})
