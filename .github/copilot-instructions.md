# AgentHub by BuildWorks.AI

TypeScript VS Code extension - Your AI agent command center. Enforces rules from `.agent/rules`, provides slash commands, and initializes agent workspace structure.

## Project Type
VS Code Extension (TypeScript)

## Key Features
- Reads rules from `.agent/rules` directory
- Supports YAML, JSON, Markdown, and plain text rule formats
- Provides diagnostics for rule violations
- Offers quick fixes where applicable
- Commands for workspace scanning and rules folder management

## Dependencies
- yaml
- minimatch
- @types/vscode
- @types/node

## Build Commands
- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `vsce package` - Package extension

## Activation Events
- onStartupFinished
- onCommand:agentRules.scanWorkspace
- onCommand:agentRules.openRulesFolder
