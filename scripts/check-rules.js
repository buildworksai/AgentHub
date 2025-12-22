#!/usr/bin/env node

/**
 * Agent Rules CLI Checker
 * 
 * Use this script in your build pipeline, pre-commit hooks, or CI/CD
 * to enforce agent rules compliance.
 * 
 * Usage:
 *   node scripts/check-rules.js
 *   npm run check-rules
 * 
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found or error occurred
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { minimatch } = require('minimatch');

const workspaceRoot = process.cwd();
const rulesDir = path.join(workspaceRoot, '.agent', 'rules');

let totalErrors = 0;
let totalWarnings = 0;
let totalInfo = 0;

function loadRules() {
	const rules = [];
	
	if (!fs.existsSync(rulesDir)) {
		console.error(`❌ Rules directory not found: ${rulesDir}`);
		return rules;
	}

	function loadFromDirectory(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			
			if (entry.isDirectory()) {
				loadFromDirectory(fullPath);
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				const content = fs.readFileSync(fullPath, 'utf8');
				
				if (ext === '.yaml' || ext === '.yml') {
					const data = yaml.parse(content);
					if (data && data.rules) {
						rules.push(...data.rules);
					}
				} else if (ext === '.json') {
					const data = JSON.parse(content);
					if (data && data.rules) {
						rules.push(...data.rules);
					}
				} else if (ext === '.md' || ext === '.txt' || ext === '') {
					// Parse text rules
					const lines = content.split('\n');
					lines.forEach((line, idx) => {
						const trimmed = line.trim();
						if (!trimmed || trimmed.startsWith('#')) return;
						
						const match = trimmed.match(/^(error|warn|info):\s*(.+?)\s*::\s*(.+)$/i);
						if (match) {
							rules.push({
								id: `${entry.name}-line${idx + 1}`,
								severity: match[1].toLowerCase(),
								message: match[2].trim(),
								match: { regex: match[3].trim() }
							});
						}
					});
				}
			}
		}
	}

	loadFromDirectory(rulesDir);
	return rules;
}

function shouldApplyRule(rule, filePath) {
	// Check path exclusions
	if (rule.match.pathExclude) {
		for (const pattern of rule.match.pathExclude) {
			if (minimatch(filePath, pattern)) {
				return false;
			}
		}
	}

	// Check path inclusions
	if (rule.match.pathInclude) {
		let matched = false;
		for (const pattern of rule.match.pathInclude) {
			if (minimatch(filePath, pattern)) {
				matched = true;
				break;
			}
		}
		if (!matched) return false;
	}

	return true;
}

function checkFile(filePath, rules) {
	const violations = [];
	const content = fs.readFileSync(filePath, 'utf8');
	const relativePath = path.relative(workspaceRoot, filePath);

	for (const rule of rules) {
		if (!shouldApplyRule(rule, filePath)) {
			continue;
		}

		try {
			const regex = new RegExp(rule.match.regex, rule.match.flags || 'g');
			let match;
			
			while ((match = regex.exec(content)) !== null) {
				// Calculate line number
				const lineNumber = content.substring(0, match.index).split('\n').length;
				
				violations.push({
					file: relativePath,
					line: lineNumber,
					severity: rule.severity,
					message: rule.message,
					ruleId: rule.id
				});

				if (rule.severity === 'error') totalErrors++;
				else if (rule.severity === 'warn') totalWarnings++;
				else totalInfo++;
			}
		} catch (err) {
			console.error(`Error applying rule ${rule.id}: ${err.message}`);
		}
	}

	return violations;
}

function findFiles(dir, files = []) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		
		// Skip ignored directories
		if (entry.isDirectory()) {
			if (['node_modules', '.git', 'dist', 'build', 'out'].includes(entry.name)) {
				continue;
			}
			findFiles(fullPath, files);
		} else if (entry.isFile()) {
			files.push(fullPath);
		}
	}
	
	return files;
}

function main() {
	console.log('🔍 Agent Rules Checker\n');

	// Load rules
	const rules = loadRules();
	if (rules.length === 0) {
		console.error('❌ No rules loaded. Check your .agent/rules directory.');
		process.exit(1);
	}

	console.log(`✓ Loaded ${rules.length} rules from ${rulesDir}\n`);

	// Find all files
	const files = findFiles(workspaceRoot);
	console.log(`📁 Scanning ${files.length} files...\n`);

	// Check each file
	const allViolations = [];
	for (const file of files) {
		const violations = checkFile(file, rules);
		allViolations.push(...violations);
	}

	// Report results
	if (allViolations.length === 0) {
		console.log('✅ No violations found! All checks passed.\n');
		process.exit(0);
	}

	console.log(`\n❌ Found ${allViolations.length} violation(s):\n`);
	
	// Group by severity
	const errors = allViolations.filter(v => v.severity === 'error');
	const warnings = allViolations.filter(v => v.severity === 'warn');
	const infos = allViolations.filter(v => v.severity === 'info');

	if (errors.length > 0) {
		console.log(`\n🔴 Errors (${errors.length}):`);
		errors.forEach(v => {
			console.log(`  ${v.file}:${v.line} - ${v.message}`);
		});
	}

	if (warnings.length > 0) {
		console.log(`\n🟡 Warnings (${warnings.length}):`);
		warnings.forEach(v => {
			console.log(`  ${v.file}:${v.line} - ${v.message}`);
		});
	}

	if (infos.length > 0) {
		console.log(`\n🔵 Info (${infos.length}):`);
		infos.forEach(v => {
			console.log(`  ${v.file}:${v.line} - ${v.message}`);
		});
	}

	console.log(`\n📊 Summary: ${totalErrors} errors, ${totalWarnings} warnings, ${totalInfo} info\n`);

	// Exit with error if violations found
	process.exit(errors.length > 0 ? 1 : 0);
}

main();
