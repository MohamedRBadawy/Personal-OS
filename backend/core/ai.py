"""Compatibility shim — re-exports the public AI provider API.

All logic has been moved to:
  core/ai_base.py      — AIProvider abstract base + DeterministicAIProvider
  core/ai_providers.py — AnthropicAIProvider, GeminiAIProvider

Existing imports such as ``from core.ai import get_ai_provider`` continue to work.
"""
from config import settings as project_settings

from core.ai_base import AIProvider, DeterministicAIProvider  # noqa: F401
from core.ai_providers import AnthropicAIProvider, GeminiAIProvider  # noqa: F401


def get_ai_provider():
    """Return the currently configured AI provider."""
    config = project_settings.get_ai_runtime_config()
    if config["provider"] == "gemini" and config.get("gemini_api_key"):
        return GeminiAIProvider(
            api_key=config["gemini_api_key"],
            model=config["gemini_model"],
            max_tokens=config["gemini_max_tokens"],
        )
    if config["provider"] == "anthropic" and config["api_key"]:
        return AnthropicAIProvider(
            api_key=config["api_key"],
            model=config["model"],
            timeout_seconds=config["timeout_seconds"],
            max_tokens=config["max_tokens"],
        )
    return DeterministicAIProvider()
