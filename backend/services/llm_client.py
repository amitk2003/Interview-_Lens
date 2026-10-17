import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self, override_api_key: Optional[str] = None):
        self.groq_api_key = override_api_key or os.getenv("GROQ_API_KEY", "").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.client_type = None
        self._init_clients()

    def _init_clients(self):
        if self.groq_api_key:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=self.groq_api_key)
                self.client_type = "groq"
                logger.info(f"Initialized Groq client with model: {self.groq_model}")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")

        if self.openai_api_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=self.openai_api_key)
                self.client_type = "openai"
                logger.info("Initialized OpenAI client (gpt-4o)")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")

        self.client_type = "simulation_engine"
        logger.info("No active API key found; running on InterviewLens deterministic heuristic engine.")

    async def generate_json(self, system_prompt: str, user_prompt: str, response_schema_hint: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends structured prompt and enforces JSON output from LLM with automatic model failover.
        """
        if self.client_type == "groq":
            candidate_models = [self.groq_model, "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
            # Deduplicate while preserving order
            models_to_try = []
            for m in candidate_models:
                if m and m not in models_to_try:
                    models_to_try.append(m)

            prompt_full = f"{user_prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object matching this structure: {response_schema_hint or ''}. Do not include markdown code block backticks or conversational text."

            for model_name in models_to_try:
                # Attempt 1: Strict JSON Object mode
                try:
                    completion = self.groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt + " Output ONLY strict RFC-8259 JSON."},
                            {"role": "user", "content": prompt_full}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                        max_tokens=4096
                    )
                    raw_text = completion.choices[0].message.content
                    parsed = self._parse_json(raw_text)
                    if parsed:
                        return parsed
                except Exception as e:
                    logger.warning(f"Groq {model_name} strict json mode failed: {e}. Trying unformatted mode...")

                # Attempt 2: Unformatted mode with regex extraction
                try:
                    completion = self.groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt + " Output ONLY valid JSON."},
                            {"role": "user", "content": prompt_full}
                        ],
                        temperature=0.2,
                        max_tokens=4096
                    )
                    raw_text = completion.choices[0].message.content
                    parsed = self._parse_json(raw_text)
                    if parsed:
                        return parsed
                except Exception as e:
                    logger.warning(f"Groq {model_name} fallback failed: {e}")

            logger.error("All Groq model attempts exhausted. Falling back to simulation engine.")
            return {}

        elif self.client_type == "openai":
            try:
                prompt_full = f"{user_prompt}\n\nIMPORTANT: Respond with ONLY valid JSON: {response_schema_hint or ''}"
                completion = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt_full}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=4096
                )
                raw_text = completion.choices[0].message.content
                return self._parse_json(raw_text)
            except Exception as e:
                logger.error(f"OpenAI API error: {e}. Falling back to simulation engine.")
                return {}

        return {}

    def _parse_json(self, text: str) -> Dict[str, Any]:
        if not text:
            return {}
        clean = text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        try:
            return json.loads(clean)
        except Exception:
            import re
            match = re.search(r'(\{.*\})', clean, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
            logger.error(f"Failed to parse LLM JSON: text was: {clean[:200]}")
            return {}
