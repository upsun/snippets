#!/bin/bash

# Setting up auth.json for multiple providers
AUTH_JSON="{"
FIRST=true

# Z.AI
if [ -n "$Z_API_KEY" ]; then
  if [ "$FIRST" = false ]; then AUTH_JSON="${AUTH_JSON},"; fi
  AUTH_JSON="${AUTH_JSON}\"zai-coding-plan\":{\"type\":\"api\",\"key\":\"$Z_API_KEY\"}"
  FIRST=false
fi

# Gemini
if [ -n "$GEMINI_API_KEY" ]; then
  if [ "$FIRST" = false ]; then AUTH_JSON="${AUTH_JSON},"; fi
  AUTH_JSON="${AUTH_JSON}\"google-vertex-ai\":{\"type\":\"api\",\"key\":\"$GEMINI_API_KEY\"}"
  FIRST=false
fi

# Claude
if [ -n "$CLAUDE_API_KEY" ]; then
  if [ "$FIRST" = false ]; then AUTH_JSON="${AUTH_JSON},"; fi
  AUTH_JSON="${AUTH_JSON}\"anthropic\":{\"type\":\"api\",\"key\":\"$CLAUDE_API_KEY\"}"
  FIRST=false
fi

# OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
  if [ "$FIRST" = false ]; then AUTH_JSON="${AUTH_JSON},"; fi
  AUTH_JSON="${AUTH_JSON}\"openai\":{\"type\":\"api\",\"key\":\"$OPENAI_API_KEY\"}"
  FIRST=false
fi

AUTH_JSON="${AUTH_JSON}}"
echo "$AUTH_JSON" > /app/.local/share/opencode/auth.json