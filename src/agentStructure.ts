import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function initializeAgentStructure(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const agentDir = path.join(workspaceRoot, '.agent');

	// Check if .agent already exists
	if (fs.existsSync(agentDir)) {
		// Folder exists, only create missing subdirectories
		await createMissingStructure(agentDir);
		return;
	}

	// Create complete .agent structure
	await createCompleteStructure(workspaceRoot);
}

async function createMissingStructure(agentDir: string): Promise<void> {
	const subdirs = ['rules', 'commands', 'skills'];
	
	for (const subdir of subdirs) {
		const dirPath = path.join(agentDir, subdir);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
	}

	// Create README if missing
	const readmePath = path.join(agentDir, 'README.md');
	if (!fs.existsSync(readmePath)) {
		await createAgentReadme(readmePath);
	}

	// Create example files if directories are empty
	await createExampleCommandsIfEmpty(path.join(agentDir, 'commands'));
	await createExampleSkillsIfEmpty(path.join(agentDir, 'skills'));
}

async function createCompleteStructure(workspaceRoot: string): Promise<void> {
	const agentDir = path.join(workspaceRoot, '.agent');

	// Create main directories
	fs.mkdirSync(path.join(agentDir, 'rules'), { recursive: true });
	fs.mkdirSync(path.join(agentDir, 'commands'), { recursive: true });
	fs.mkdirSync(path.join(agentDir, 'skills'), { recursive: true });

	// Create README
	await createAgentReadme(path.join(agentDir, 'README.md'));

	// Create example commands
	await createExampleCommands(path.join(agentDir, 'commands'));

	// Create example skills
	await createExampleSkills(path.join(agentDir, 'skills'));

	vscode.window.showInformationMessage(
		'✓ Agent workspace initialized by BuildWorks.AI! Check .agent/ folder for commands and skills.'
	);
}

async function createAgentReadme(readmePath: string): Promise<void> {
	const content = `# .agent — AI Agent Workspace Configuration

This folder contains configuration, commands, and skills for AI agents working in this workspace.

## Structure

\`\`\`
.agent/
├── rules/          # Linting and code compliance rules
├── commands/       # Slash commands for quick agent instructions
├── skills/         # Reusable agent skills and expertise
└── README.md       # This file
\`\`\`

---

## 📋 Rules

**Location:** \`.agent/rules/\`

Define code compliance and linting rules that are automatically enforced by AgentHub.

**Format:** Markdown (.md), YAML (.yaml), or JSON (.json)

**Example:** \`.agent/rules/coding-standards.md\`
\`\`\`markdown
error: No console.log in production code :: console\\.log\\(
warn: TODO must reference ticket :: TODO(?!\\(JIRA-\\d+\\))
\`\`\`

**Features:**
- Real-time diagnostics while coding
- Configurable save blocking
- Build integration via \`npm run check-rules\`

---

## ⚡ Commands

**Location:** \`.agent/commands/\`

Quick slash command instructions that agents can execute. Type \`/\` in the editor to see available commands.

**Format:** Markdown (.md)

**Example:** \`.agent/commands/review.md\`
\`\`\`markdown
# Code Review Command

You are a senior code reviewer. When reviewing code:
1. Check architectural correctness
2. Verify error handling
3. Ensure tests exist
4. Validate documentation
5. Check performance implications
\`\`\`

**Usage:**
- Type \`/\` in editor → Select command → Agent executes instruction
- Commands are context-specific instructions, not shell scripts
- Can reference project-specific patterns and standards

---

## 🎯 Skills

**Location:** \`.agent/skills/\`

Reusable agent expertise and knowledge patterns. Skills provide specialized guidance for specific tasks.

**Format:** Markdown (.md) with frontmatter

**Example:** \`.agent/skills/react-best-practices/skill.md\`
\`\`\`markdown
---
name: react-best-practices
description: React 18 + TypeScript best practices
status: ✅ Working
---

# React Best Practices

## Component Design
- Keep components small and focused
- Prefer functional components
- Extract reusable logic into custom hooks
...
\`\`\`

**Types:**
- **Knowledge Skills:** Load specialized expertise into context
- **Automation Skills:** Execute specific procedures or validations

---

## 🚀 Quick Start

### 1. Add Rules

Create \`.agent/rules/my-rules.md\`:
\`\`\`markdown
error: No hardcoded secrets :: (api[_-]?key|secret)[\\s]*=\\s*['"][^'"]{20,}['"]
warn: Prefer const over let :: \\blet\\b
\`\`\`

### 2. Add Commands

Create \`.agent/commands/deploy.md\`:
\`\`\`markdown
# Deploy Command

Deploy to staging environment:
1. Run tests: npm test
2. Build: npm run build
3. Deploy: npm run deploy:staging
\`\`\`

### 3. Add Skills

Create \`.agent/skills/testing/skill.md\`:
\`\`\`markdown
---
name: testing-best-practices
description: Testing patterns and strategies
---

# Testing Best Practices
- Write tests first (TDD)
- Test behavior, not implementation
...
\`\`\`

### 4. Use Commands

Type \`/\` in editor → Select command → Agent executes

---

## 📖 References

- **AgentHub:** VS Code extension enforcing rules and managing agent workspace
- **Settings:** Configure via VS Code Settings → AgentHub
- **Build Integration:** Run \`npm run check-rules\` in CI/CD

---

**Built with ❤️ by [BuildWorks.AI](https://buildworks.ai)**

*Enterprise AI • Open Source First*

- 🌐 [Website](https://buildworks.ai)
- 💻 [GitHub](https://github.com/buildworksai)
- 💼 [LinkedIn](https://www.linkedin.com/company/buildworks-ai/)
- 📧 [info@buildworks.ai](mailto:info@buildworks.ai)
`;

	fs.writeFileSync(readmePath, content, 'utf8');
}

async function createExampleCommandsIfEmpty(commandsDir: string): Promise<void> {
	if (fs.readdirSync(commandsDir).length === 0) {
		await createExampleCommands(commandsDir);
	}
}

async function createExampleCommands(commandsDir: string): Promise<void> {
	// Approval command
	const approvalContent = `# Approval & Implementation Command

You are the **Application Architect and Implementation Agent** for this project.

> **All approved tasks must be executed with surgical precision and production-level discipline.**

---

## 1. Environment Discipline
- Treat the application as a **production-grade system** at all times
- Do **not** perform unsafe experiments, partial commits, or speculative edits
- Maintain full operational stability — no test or debug artifacts left behind

---

## 2. Solution Implementation
- Present the proposed solution for **approval** before making changes
- Once approved, **implement the fix with precision and rollback safety**
- Ensure the fix resolves the root cause completely without side effects

---

## 3. Post-Fix Validation
After every fix or update:
- Verify all systems are running cleanly
- Check and resolve all **errors and warnings** in logs
- Test affected functionality thoroughly
- Remove any **temporary or debug scripts** created during troubleshooting

---

## 4. Documentation Policy
- Do **not** create or modify documentation unless explicitly instructed

---

### ✅ Summary
Maintain operational discipline, fix with precision, validate thoroughly, and never perform actions outside explicit approval.
`;

	// Review command
	const reviewContent = `# Code Review Command

You are a **senior code reviewer** ensuring enterprise-grade quality.

Your responsibility is to ensure **end-to-end correctness across every architectural layer**.

---

## Review Process

### 1. Scope the Change
- Identify all modified files
- Map architectural impact (database → backend → API → frontend → UI)
- List affected business logic

### 2. Architecture Review
- Database: Schema changes, migrations, indexes
- Backend: Business logic, validation, error handling
- API: Endpoints, contracts, documentation
- Frontend: Components, state management, UX
- Security: Authentication, authorization, data protection

### 3. Code Quality
- Readability and maintainability
- Performance implications
- Test coverage
- Error handling
- Documentation completeness

### 4. Compliance
- Coding standards adherence
- Security best practices
- Accessibility requirements
- Performance benchmarks

---

## Output Format

Provide concise, prioritized feedback:

**🔴 Critical Issues**
- Issues that must be fixed before merge

**🟡 Warnings**
- Issues that should be addressed

**🟢 Suggestions**
- Nice-to-have improvements

**✅ Approved** or **❌ Needs Changes**
`;

	// Investigate command
	const investigateContent = `# Investigation Command

You are a **senior debugging specialist** skilled in root cause analysis.

---

## Investigation Process

### 1. Gather Information
- Reproduce the issue (steps, environment, data)
- Collect error logs and stack traces
- Identify when issue started (recent changes?)

### 2. Hypothesis Formation
- List potential root causes (most likely first)
- Eliminate impossible causes
- Form testable hypotheses

### 3. Systematic Testing
- Test each hypothesis methodically
- Document findings
- Narrow down to root cause

### 4. Impact Analysis
- Identify affected systems
- Assess severity and urgency
- Determine scope of fix needed

### 5. Solution Recommendation
- Propose fix approach
- Identify risks and mitigations
- Estimate effort and complexity

---

## Output Format

**🔍 Issue Summary**
Brief description of the problem

**🧪 Root Cause**
Identified cause with evidence

**💡 Recommended Solution**
Proposed fix with implementation steps

**⚠️ Risks**
Potential side effects or complications

**📊 Impact**
Systems affected and severity level
`;

	fs.writeFileSync(path.join(commandsDir, 'approval.md'), approvalContent, 'utf8');
	fs.writeFileSync(path.join(commandsDir, 'review.md'), reviewContent, 'utf8');
	fs.writeFileSync(path.join(commandsDir, 'investigate.md'), investigateContent, 'utf8');
}

async function createExampleSkillsIfEmpty(skillsDir: string): Promise<void> {
	if (fs.readdirSync(skillsDir).length === 0) {
		await createExampleSkills(skillsDir);
	}
}

async function createExampleSkills(skillsDir: string): Promise<void> {
	// Create subdirectories for skills
	const reactDir = path.join(skillsDir, 'react-best-practices');
	const testingDir = path.join(skillsDir, 'testing-patterns');
	const securityDir = path.join(skillsDir, 'security-audit');

	fs.mkdirSync(reactDir, { recursive: true });
	fs.mkdirSync(testingDir, { recursive: true });
	fs.mkdirSync(securityDir, { recursive: true });

	// React best practices skill
	const reactContent = `---
name: react-best-practices
description: React + TypeScript development best practices
status: ✅ Working
last-validated: 2025-12-15
---

# React Best Practices

## Purpose
Invoked when writing or reviewing React components. Provides React + TypeScript best practices for hooks, state management, and performance optimization.

## Component Design
- Keep components small and focused (single responsibility)
- Prefer functional components over class components
- Extract reusable logic into custom hooks
- Use composition over inheritance
- Props should be immutable

## Hooks Best Practices
- Follow Rules of Hooks (only at top level, only in React functions)
- Use useState for component-specific state
- Use useReducer for complex state logic
- Use useCallback for stable function references
- Use useMemo for expensive computations
- Clean up effects with return functions

## State Management
- Keep state as local as possible
- Lift state only when needed
- Use Context for global state sparingly
- Consider state management libraries for complex apps
- Derive data instead of storing redundant state

## Performance
- Use React.memo for expensive components
- Avoid inline function definitions in render
- Use key prop correctly in lists
- Split large components into smaller ones
- Use lazy loading for route components

## Code Organization
- One component per file
- Group by feature/module, not by type
- Use index files for clean imports
- Separate business logic from UI logic
- TypeScript required for all components

## Common Pitfalls
- Don't mutate state directly
- Don't use array index as key
- Don't forget cleanup in useEffect
- Don't nest components inside render
- Don't fetch data without handling loading/error states
`;

	// Testing patterns skill
	const testingContent = `---
name: testing-patterns
description: Testing strategies and best practices
status: ✅ Working
last-validated: 2025-12-15
---

# Testing Patterns

## Purpose
Provides guidance on testing strategies, patterns, and best practices for comprehensive test coverage.

## Testing Pyramid
1. **Unit Tests** (70%) - Test individual functions/components
2. **Integration Tests** (20%) - Test component interactions
3. **E2E Tests** (10%) - Test user workflows

## Unit Testing
- Test behavior, not implementation
- One assertion per test (when possible)
- Use descriptive test names
- Arrange-Act-Assert pattern
- Mock external dependencies

## Integration Testing
- Test component interactions
- Verify data flow between modules
- Test API contracts
- Database integration tests

## E2E Testing
- Test critical user journeys
- Cover happy paths and edge cases
- Keep E2E tests minimal and stable
- Run in CI/CD pipeline

## Best Practices
- Write tests first (TDD)
- Aim for high coverage (>80%)
- Keep tests fast and independent
- Use fixtures and factories for test data
- Test error cases and edge cases

## Common Patterns
- AAA (Arrange-Act-Assert)
- Given-When-Then (BDD)
- Page Object Model (E2E)
- Test Data Builders
- Mock vs Stub vs Fake
`;

	// Security audit skill
	const securityContent = `---
name: security-audit
description: Security review checklist and patterns
status: ✅ Working
last-validated: 2025-12-15
---

# Security Audit

## Purpose
Provides security review checklist for identifying vulnerabilities and ensuring secure coding practices.

## Authentication & Authorization
- [ ] Strong password requirements enforced
- [ ] Multi-factor authentication available
- [ ] Session management secure (timeout, invalidation)
- [ ] JWT tokens properly validated
- [ ] Role-based access control (RBAC) implemented
- [ ] Authorization checked on every endpoint

## Input Validation
- [ ] All user input validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF tokens on state-changing operations
- [ ] File upload validation (type, size, content)

## Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] TLS/SSL for data in transit
- [ ] No secrets in source code
- [ ] Environment variables for configuration
- [ ] Secure key management

## API Security
- [ ] Rate limiting implemented
- [ ] API authentication required
- [ ] CORS properly configured
- [ ] API versioning in place
- [ ] Error messages don't leak info

## Common Vulnerabilities (OWASP Top 10)
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. SSRF

## Security Headers
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Permissions-Policy
`;

	fs.writeFileSync(path.join(reactDir, 'skill.md'), reactContent, 'utf8');
	fs.writeFileSync(path.join(testingDir, 'skill.md'), testingContent, 'utf8');
	fs.writeFileSync(path.join(securityDir, 'skill.md'), securityContent, 'utf8');

	// Create skills README
	const skillsReadme = `# Agent Skills

Reusable agent expertise and knowledge patterns.

## Available Skills

### [react-best-practices](./react-best-practices/)
**Type:** Knowledge
**Purpose:** React + TypeScript development patterns and best practices
**Status:** ✅ Working

### [testing-patterns](./testing-patterns/)
**Type:** Knowledge
**Purpose:** Testing strategies and comprehensive test coverage guidance
**Status:** ✅ Working

### [security-audit](./security-audit/)
**Type:** Knowledge
**Purpose:** Security review checklist and vulnerability prevention
**Status:** ✅ Working

---

## Adding New Skills

1. Create a subdirectory: \`.agent/skills/my-skill/\`
2. Add \`skill.md\` with frontmatter:
   \`\`\`markdown
   ---
   name: my-skill
   description: What this skill provides
   status: ✅ Working
   ---
   
   # My Skill
   
   Content here...
   \`\`\`
3. Update this README

---

**Powered by [BuildWorks.AI](https://buildworks.ai)** — Enterprise AI • Open Source First
`;

	fs.writeFileSync(path.join(skillsDir, 'README.md'), skillsReadme, 'utf8');
	fs.writeFileSync(path.join(skillsDir, 'README.md'), skillsReadme, 'utf8');
}
