const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(PROJECT_ROOT, 'index.js');

function runCli(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [CLI_PATH, ...args], { cwd });
        let stderr = '';

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) return resolve();
            reject(new Error(`path-fixer exited with code ${code}: ${stderr}`));
        });
    });
}

async function withTempDir(callback) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-fixer-test-'));
    try {
        await callback(tempDir);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

test('prefers "<specifier>.js" when file exists', async () => {
    await withTempDir(async (tempDir) => {
        const outDir = path.join(tempDir, 'dist');
        const providersDir = path.join(outDir, 'common', 'providers', 'OpenRouter');
        await fs.mkdir(providersDir, { recursive: true });

        const sourceFile = path.join(outDir, 'entry.js');
        await fs.writeFile(
            sourceFile,
            'import OpenRouter from "./common/providers/OpenRouter";\n',
            'utf8'
        );

        await fs.writeFile(path.join(outDir, 'common', 'providers', 'OpenRouter.js'), 'export default 1;\n', 'utf8');
        await fs.writeFile(path.join(providersDir, 'index.js'), 'export default 2;\n', 'utf8');

        await runCli(['-d', outDir], PROJECT_ROOT);

        const result = await fs.readFile(sourceFile, 'utf8');
        assert.match(result, /import OpenRouter from\s+"\.\/common\/providers\/OpenRouter\.js";/);
    });
});

test('uses "<specifier>/index.js" when direct file does not exist', async () => {
    await withTempDir(async (tempDir) => {
        const outDir = path.join(tempDir, 'dist');
        const providersDir = path.join(outDir, 'common', 'providers', 'OpenRouter');
        await fs.mkdir(providersDir, { recursive: true });

        const sourceFile = path.join(outDir, 'entry.js');
        await fs.writeFile(
            sourceFile,
            'import OpenRouter from "./common/providers/OpenRouter";\n',
            'utf8'
        );

        await fs.writeFile(path.join(providersDir, 'index.js'), 'export default 2;\n', 'utf8');

        await runCli(['-d', outDir], PROJECT_ROOT);

        const result = await fs.readFile(sourceFile, 'utf8');
        assert.match(result, /import OpenRouter from\s+"\.\/common\/providers\/OpenRouter\/index\.js";/);
    });
});

test('falls back to "<specifier>.js" when neither path exists', async () => {
    await withTempDir(async (tempDir) => {
        const outDir = path.join(tempDir, 'dist');
        await fs.mkdir(outDir, { recursive: true });

        const sourceFile = path.join(outDir, 'entry.js');
        await fs.writeFile(
            sourceFile,
            'import OpenRouter from "./common/providers/OpenRouter";\n',
            'utf8'
        );

        await runCli(['-d', outDir], PROJECT_ROOT);

        const result = await fs.readFile(sourceFile, 'utf8');
        assert.match(result, /import OpenRouter from\s+"\.\/common\/providers\/OpenRouter\.js";/);
    });
});

test('keeps specifier unchanged when it already has ".js" extension', async () => {
    await withTempDir(async (tempDir) => {
        const outDir = path.join(tempDir, 'dist');
        const providersDir = path.join(outDir, 'common', 'providers');
        await fs.mkdir(providersDir, { recursive: true });

        const sourceFile = path.join(outDir, 'entry.js');
        await fs.writeFile(
            sourceFile,
            'import OpenRouter from "./common/providers/OpenRouter.js";\n',
            'utf8'
        );

        await fs.writeFile(path.join(providersDir, 'OpenRouter.js'), 'export default 1;\n', 'utf8');

        await runCli(['-d', outDir], PROJECT_ROOT);

        const result = await fs.readFile(sourceFile, 'utf8');
        assert.match(result, /import OpenRouter from\s+"\.\/common\/providers\/OpenRouter\.js";/);
        assert.doesNotMatch(result, /OpenRouter\.js\.js/);
    });
});
