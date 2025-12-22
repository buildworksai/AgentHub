import assert from 'assert';

function extractLastSlashCommand(prompt: string): string | undefined {
    const promptLower = prompt.toLowerCase();
    const matches = Array.from(promptLower.matchAll(/(?:^|\s)\/([\w-]+)/g));
    if (matches.length > 0) {
        return matches[matches.length - 1][1];
    }
    return undefined;
}

describe('Slash Command Token Extraction', () => {
    it('matches /command at start', () => {
        assert.strictEqual(extractLastSlashCommand('/approval do this'), 'approval');
    });
    it('matches /command mid-prompt', () => {
        assert.strictEqual(extractLastSlashCommand('please /review this'), 'review');
    });
    it('matches last /command if multiple', () => {
        assert.strictEqual(extractLastSlashCommand('do /approval then /review'), 'review');
    });
    it('ignores / not followed by word', () => {
        assert.strictEqual(extractLastSlashCommand('do / then /review'), 'review');
    });
    it('ignores if no /command', () => {
        assert.strictEqual(extractLastSlashCommand('no command here'), undefined);
    });
    it('matches with dash', () => {
        assert.strictEqual(extractLastSlashCommand('run /my-command now'), 'my-command');
    });
    it('matches after whitespace', () => {
        assert.strictEqual(extractLastSlashCommand('foo   /investigate'), 'investigate');
    });
    it('is case-insensitive', () => {
        assert.strictEqual(extractLastSlashCommand('Do /APPROVAL now'), 'approval');
    });
});
