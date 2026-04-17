const path = require('path');
const fs = require('fs');

function loadProviderConfig() {
  const ALLOWED_VARS = new Set([
    'CLAUDE_CODE_USE_OPENAI', 'CLAUDE_CODE_USE_GEMINI',
    'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX',
    'OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL',
    'GEMINI_API_KEY', 'GEMINI_MODEL',
    'AWS_REGION', 'AWS_BEARER_TOKEN_BEDROCK',
    'ANTHROPIC_VERTEX_PROJECT_ID', 'CLOUD_ML_REGION',
  ]);

  try {
    const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
    const configPath = path.join(workspaceRoot, 'config', 'providers.json');
    if (!fs.existsSync(configPath)) {
      return { active: 'anthropic', env_vars: {} };
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const active = config.active_provider || 'anthropic';
    const provider = config.providers?.[active] || {};

    const env_vars = Object.fromEntries(
      Object.entries(provider.env_vars || {}).filter(
        ([k, v]) => v !== '' && ALLOWED_VARS.has(k)
      )
    );

    return { active, env_vars, provider };
  } catch (err) {
    console.warn(`[provider-utils] Error loading config: ${err.message}`);
    return { active: 'anthropic', env_vars: {} };
  }
}

module.exports = { loadProviderConfig };
