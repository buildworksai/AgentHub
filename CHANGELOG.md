# Change Log

All notable changes to AgentHub.

## [0.3.0] - 2025-12-15

### Added
- **GitHub Copilot Chat Integration**
  - Register `@agent` participant in Copilot Chat
  - Slash commands: `/approval`, `/review`, `/investigate`, `/role`
  - Commands load content from `.agent/commands/*.md` directly into chat
  - No clipboard workflow needed - native chat integration
  
- **New Command**
  - `role.md` - Application Architect & Implementation Agent (ruthless mentor persona)
  
### Changed
- Removed keybinding-based Quick Pick (superseded by native chat commands)
- Extension now integrates with GitHub Copilot for slash command functionality

## [0.2.0] - 2025-12-15

### Added
- **Auto-Initialize Agent Structure**
  - Automatically creates `.agent/` folder structure on first activation
  - Creates `.agent/rules/`, `.agent/commands/`, `.agent/skills/` directories
  - Generates comprehensive `.agent/README.md` documentation
  - Respects existing folders and files (non-destructive)
  
- **Example Commands**
  - `approval.md` - Application Architect & Implementation command
  - `review.md` - Code review command with architectural validation
  - `investigate.md` - Root cause analysis and debugging command
  
- **Example Skills**
  - `react-best-practices/` - React + TypeScript patterns
  - `testing-patterns/` - Testing strategies and best practices
  - `security-audit/` - Security review checklist (OWASP Top 10)
  
- **Slash Command Picker**
  - Quick Pick UI for browsing available agent commands
  - Keyboard shortcut: `Cmd+/` (Mac) or `Ctrl+/` (Windows/Linux)
  - Command content copied to clipboard for easy pasting
  - Option to open command file for editing

### Changed
- Extension `activate()` function is now async
- Added workspace structure initialization on startup

## [0.1.0] - 2025-12-15

### Added
- **Strict Enforcement Features**
  - Save blocking with configurable override options
  - Multiple enforcement modes (Passive, Active, Strict, Draconian)
  - Status bar indicator showing current mode
  - Command palette toggles for quick mode switching
  
- **Build Integration**
  - CLI script (`npm run check-rules`) for CI/CD pipelines
  - Pre-commit hook support
  - Exit codes for build failure on violations
  
- **Configuration**
  - 12 configurable settings for fine-grained control
  - Per-workspace and global settings support
  - Settings UI integration
  
- **Commands**
  - Enable/Disable Strict Mode
  - Toggle Save Blocking
  - Temporarily Disable (session only)

### Changed
- Updated README with comprehensive strict mode documentation
- Improved status bar with color-coded indicators
- Enhanced error messages with actionable options

## [0.0.1] - 2025-12-15

### Added
- Initial release
- Load rules from `.agent/rules` directory
- Support YAML, JSON, Markdown, and plain text formats
- Real-time diagnostics with debouncing
- Quick fixes for structured rules
- Path and language filtering
- Workspace scanning command
- Auto-reload on rule changes
