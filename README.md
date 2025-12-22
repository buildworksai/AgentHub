# AgentHub

<div align="center">

![BuildWorks.AI](https://img.shields.io/badge/BuildWorks.AI-Enterprise%20AI%20Tools-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-green)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC)

**Part of the [BuildWorks.AI](https://buildworks.ai) Open Source AI Tooling Ecosystem**

*Your AI agent command center for VS Code*

[Website](https://buildworks.ai) • [GitHub](https://github.com/buildworksai) • [Documentation](https://github.com/buildworksai/agenthub) • [Report Issue](https://github.com/buildworksai/agenthub/issues)

</div>

---


## Overview

AgentHub is a rules enforcement engine for VS Code. It auto-initializes a `.agent/` workspace structure and provides powerful, configurable linting and enforcement for your codebase using YAML, JSON, or Markdown rules.

**Built by [BuildWorks.AI](https://buildworks.ai)** — creators of [SARAISE](https://github.com/buildworksai/saraise) (AI-Enabled ERP) and [AISTRALE](https://github.com/buildworksai/aistrale) (LLM Engineering Platform).

## Features

### 🚀 Auto-Initialize Agent Workspace
- **One-click setup**: Automatically creates `.agent/` structure on first activation
- **Example rules**: Pre-configured linting rules for best practices
- **Comprehensive documentation**: Auto-generated `.agent/README.md` explaining structure

### 📋 Rule Enforcement
- **Rule source**: Reads rules from `.agent/rules` directory (supports nested folders)
- **Multiple formats**: YAML, JSON, Markdown, and plain text rule files
- **Real-time linting**: Diagnostics on document open, save, and change (configurable debounce)
- **Quick fixes**: Automated fixes where rules define them
- **Save blocking**: Block file saves when errors/warnings exist (configurable)
- **Build integration**: CLI script for CI/CD pipelines and pre-commit hooks
- **Strict mode**: Multiple enforcement levels from passive to draconian
- **Status bar**: Shows current enforcement mode at a glance
- **Path filtering**: Include/exclude patterns using minimatch globs
- **Language filtering**: Target specific programming languages
- **Workspace scanning**: Command to scan entire workspace for violations
- **Auto-reload**: Watches `.agent/rules/**` and reloads on changes
- **Fully configurable**: All features can be enabled/disabled via settings

### 📋 Rule Enforcement
- **Rule source**: Reads rules from `.agent/rules` directory (supports nested folders)
- **Multiple formats**: YAML, JSON, Markdown, and plain text rule files
- **Real-time linting**: Diagnostics on document open, save, and change (configurable debounce)
- **Quick fixes**: Automated fixes where rules define them
- **Save blocking**: Block file saves when errors/warnings exist (configurable)
- **Build integration**: CLI script for CI/CD pipelines and pre-commit hooks
- **Strict mode**: Multiple enforcement levels from passive to draconian
- **Status bar**: Shows current enforcement mode at a glance
- **Path filtering**: Include/exclude patterns using minimatch globs
- **Language filtering**: Target specific programming languages
- **Workspace scanning**: Command to scan entire workspace for violations
- **Auto-reload**: Watches `.agent/rules/**` and reloads on changes
- **Fully configurable**: All features can be enabled/disabled via settings

## Getting Started

### 1. Install Extension

When you first activate the extension, it automatically creates:
```
.agent/
├── rules/              # Your linting rules
├── commands/           # Slash commands (approval, review, investigate)
│   ├── approval.md
│   ├── review.md
│   └── investigate.md
├── skills/             # Reusable agent expertise
│   ├── react-best-practices/
│   ├── testing-patterns/
│   └── security-audit/
└── README.md          # Complete documentation
```



### 3. Define Rules

#### YAML Format

Create `.agent/rules/example.yaml`:

```yaml
version: 1
rules:
  - id: no-console-log
    severity: warn
    message: "Avoid console.log in production code"
    match:
      languages: [javascript, typescript]
      regex: "console\\.log\\("
      pathExclude: ["**/test/**", "**/*.test.ts"]
    fix:
      kind: replace
      replaceWith: "// console.log("

  - id: todo-must-have-ticket
    severity: error
    message: "TODO comments must reference a ticket number"
    match:
      regex: "TODO(?!\\(JIRA-\\d+\\))"
      flags: "gi"

  - id: forbidden-rbac-todo
    severity: error
    message: "RBAC TODOs are not allowed"
    match:
      regex: "TODO\\(RBAC\\)"
      flags: "g"
    fix:
      kind: delete
```

#### JSON Format

Create `.agent/rules/example.json`:

```json
{
  "version": 1,
  "rules": [
    {
      "id": "no-hardcoded-secrets",
      "severity": "error",
      "message": "Hardcoded API keys detected",
      "match": {
        "regex": "(api[_-]?key|secret)[\\s]*=\\s*['\"][^'\"]{20,}['\"]",
        "flags": "i"
      }
    }
  ]
}
```

#### Markdown/Text Format

Create `.agent/rules/simple-rules.md`:

```markdown
# Simple Rules

error: No debugger statements allowed :: debugger;
warn: Prefer const over let :: \\blet\\b
info: Consider using async/await :: \\.then\\(
```

**Format**: `SEVERITY: <message> :: <regex>`
- `SEVERITY`: `error`, `warn`, or `info` (defaults to `warn` if omitted)
- `::` separator is required
- Lines starting with `#` are comments

## Rule Schema

### Structured Rules (YAML/JSON)

```typescript
{
  id: string              // Unique identifier
  severity: "error" | "warn" | "info"
  message: string         // Diagnostic message
  match: {
    languages?: string[]   // Filter by language IDs (e.g., ["typescript", "javascript"])
    regex: string          // Regular expression pattern
    flags?: string         // Regex flags (default: "g")
    pathInclude?: string[] // Include paths matching these globs
    pathExclude?: string[] // Exclude paths matching these globs (takes priority)
  }
  fix?: {                  // Optional quick fix
    kind: "replace" | "insert" | "delete"
    replaceWith?: string   // For "replace" kind
    insertText?: string    // For "insert" kind
    position?: "start" | "end"  // For "insert" kind
  }
}
```

### Text Rules (Markdown/Plain Text)

Simple line-based format:
```
SEVERITY: <message> :: <regex>
```

Examples:
```
error: No console.error allowed :: console\\.error\\(
warn: Avoid var keyword :: \\bvar\\b
info: Consider using template literals :: '.*\\+.*'
```


## Commands

| Command | Description |
|---------|-------------|
| `Agent Rules: Scan Workspace` | Scan all files in workspace (max 2000 files) |
| `Agent Rules: Open Rules Folder` | Open/create `.agent/rules` folder |
| `Agent Rules: Enable Strict Mode` | Enable save blocking with override + reason required |
| `Agent Rules: Disable Strict Mode` | Switch to passive mode (diagnostics only) |
| `Agent Rules: Toggle Save Blocking` | Toggle save blocking on/off |
| `Agent Rules: Temporarily Disable` | Disable for current session only |

## Strict Enforcement

### Enforcement Modes

**Passive Mode (Default)**
- Shows diagnostics only
- No save blocking
- User awareness

**Active Mode**
- Blocks saves when errors/warnings found
- Allows override with optional reason
- Status bar shows warning icon

**Strict Mode**
- Blocks saves on errors
- Requires reason for override
- Recommended for team enforcement

**Draconian Mode** 
- Blocks saves on errors
- No override allowed
- Must fix before saving

### Configuration

Access via Settings UI (`Cmd+,`) or `.vscode/settings.json`:

```jsonc
{
  // Master switch
  "agentRules.enabled": true,
  
  // Save blocking
  "agentRules.blockSaveOnErrors": false,      // Block on errors
  "agentRules.blockSaveOnWarnings": false,    // Block on warnings
  "agentRules.allowSaveOverride": true,       // Allow override
  "agentRules.requireOverrideReason": false,  // Require reason
  
  // Build integration
  "agentRules.failBuildOnErrors": false,
  "agentRules.failBuildOnWarnings": false,
  
  // General
  "agentRules.autoFix": false,                // Auto-apply fixes on save
  "agentRules.debounceMs": 250,               // Typing delay
  "agentRules.rulesPath": ".agent/rules",     // Custom rules location
  "agentRules.maxFilesToScan": 2000,          // Workspace scan limit
  "agentRules.showStatusBar": true            // Show mode indicator
}
```

### Build Integration

Use the CLI checker in your build pipeline:

```bash
# NPM script
npm run check-rules

# Pre-commit hook
echo "npm run check-rules" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# GitHub Actions
- name: Check Agent Rules
  run: npm run check-rules
```

The script exits with code 1 if violations found, failing the build.

### Status Bar Indicators

- `🛡️ Agent Rules: Strict` - Strict mode (red background)
- `⚠️ Agent Rules: Active` - Save blocking enabled (yellow)
- `ℹ️ Agent Rules: Passive` - Diagnostics only
- `🚫 Agent Rules: Disabled` - Temporarily disabled

## Default Ignored Folders

The following folders are automatically excluded from scanning:
- `**/node_modules/**`
- `**/.git/**`
- `**/dist/**`
- `**/build/**`
- `**/out/**`

Override with `pathInclude` in individual rules.

## Path Filtering Examples

```yaml
# Only TypeScript files in src/
match:
  pathInclude: ["**/src/**/*.ts"]

# Exclude test files
match:
  pathExclude: ["**/*.test.ts", "**/*.spec.ts"]

# Both include and exclude
match:
  pathInclude: ["**/src/**"]
  pathExclude: ["**/src/test/**"]
```

## Quick Fix Examples

```yaml
# Replace
fix:
  kind: replace
  replaceWith: "// FIXED: "

# Delete
fix:
  kind: delete

# Insert at start
fix:
  kind: insert
  insertText: "// @ts-ignore\n"
  position: start

# Insert at end
fix:
  kind: insert
  insertText: " // TODO: review"
  position: end
```

## Requirements

- VS Code 1.107.0 or higher
- Node.js (for development)


## Extension Settings

All configuration is done via `.agent/rules` files and the `agentRules.*` settings in your workspace settings. See the Configuration section above for details.

## Known Issues

- Workspace scan is capped at 2000 files for performance
- Very complex regex patterns may impact performance
- Text-based rules (Markdown/plain text) do not support quick fixes unless a clear mapping exists

## Development

### Build from Source

```bash
npm install
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Package Extension

```bash
npm install -g @vscode/vsce
vsce package
```

---

## About BuildWorks.AI

[BuildWorks.AI](https://buildworks.ai) builds enterprise-grade AI products with a commitment to open source innovation. We believe in democratizing AI for businesses worldwide.

### Our Products

- **[SARAISE](https://github.com/buildworksai/saraise)** — AI-Enabled Enterprise ERP (Apache 2.0)
- **[AISTRALE](https://github.com/buildworksai/aistrale)** — LLM Engineering & Observability Platform (Apache 2.0)
- **AI Agents Org** — Enterprise Multi-Agent Orchestration (Enterprise)
- **AgentHub** — AI agent command center for VS Code (Apache 2.0)

### Connect With Us

- 🌐 Website: [buildworks.ai](https://buildworks.ai)
- 💼 LinkedIn: [BuildWorks.AI](https://www.linkedin.com/company/buildworks-ai/)
- 🐦 Twitter: [@Buildworks_ai](https://x.com/Buildworks_ai)
- 📧 Email: [info@buildworks.ai](mailto:info@buildworks.ai)
- 💻 GitHub: [github.com/buildworksai](https://github.com/buildworksai)

---

## License

Apache 2.0

Copyright © 2025 BuildWorks.AI (BuildFlow Consultancy Private Limited)

Licensed under the Apache License, Version 2.0. This is part of BuildWorks.AI's commitment to **Open Source First** — democratizing AI-powered automation for businesses worldwide.

---


**Enforce your code quality and compliance with AgentHub by BuildWorks.AI!**

