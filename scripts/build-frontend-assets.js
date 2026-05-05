#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicRoot = path.join(repoRoot, 'public');
const distRoot = path.join(repoRoot, 'dist', 'frontend');
const manifestFile = 'asset-manifest.json';

const hashedExtensions = new Set([
    '.css',
    '.js',
    '.mjs',
    '.woff2',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.svg',
    '.ico',
    '.mp3',
    '.wav',
    '.wasm',
]);

const copyExtensions = new Set([
    '.html',
    '.json',
    '.txt',
    '.map',
    '.woff',
    '.ttf',
]);

const ignoreSegments = new Set([
    '.git',
    '.github',
    '.playwright-cli',
    'output',
    'node_modules',
]);

function toPosix(value) {
    return value.split(path.sep).join('/');
}

function shouldIgnore(relativePath) {
    return relativePath.split(path.sep).some(segment => ignoreSegments.has(segment));
}

function getHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

function getOutputName(relativePath, hash) {
    const parsed = path.parse(relativePath);
    return path.join(parsed.dir, `${parsed.name}-${hash}${parsed.ext}`);
}

function minifyCss(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
}

async function optimizeAsset(inputPath, relativePath, ext, warnings) {
    const buffer = await fs.readFile(inputPath);

    if (ext === '.js' || ext === '.mjs') {
        const source = buffer.toString('utf8');
        try {
            const result = await minify(source, {
                module: ext === '.mjs' || relativePath.includes(`${path.sep}scripts${path.sep}`) || relativePath === 'script.js' || relativePath === 'lib.js',
                compress: {
                    passes: 1,
                },
                mangle: true,
                format: {
                    comments: false,
                },
            });

            if (result.code) {
                return Buffer.from(result.code, 'utf8');
            }
        } catch (error) {
            warnings.push(`Skipped JS minification for ${toPosix(relativePath)}: ${error.message}`);
        }
    }

    if (ext === '.css') {
        return Buffer.from(minifyCss(buffer.toString('utf8')), 'utf8');
    }

    return buffer;
}

async function walk(directory, files = []) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(publicRoot, fullPath);

        if (shouldIgnore(relativePath)) {
            continue;
        }

        if (entry.isDirectory()) {
            await walk(fullPath, files);
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

async function copyFile(inputPath, outputRelativePath) {
    const outputPath = path.join(distRoot, outputRelativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(inputPath, outputPath);
}

async function build() {
    await fs.rm(distRoot, { recursive: true, force: true });
    await fs.mkdir(distRoot, { recursive: true });

    const files = await walk(publicRoot);
    const assets = {};
    const skipped = [];
    const warnings = [];

    for (const inputPath of files) {
        const relativePath = path.relative(publicRoot, inputPath);
        const ext = path.extname(relativePath).toLowerCase();
        const source = toPosix(relativePath);

        if (hashedExtensions.has(ext)) {
            const buffer = await optimizeAsset(inputPath, relativePath, ext, warnings);
            const hash = getHash(buffer);
            const output = getOutputName(relativePath, hash);
            await copyFile(inputPath, relativePath);
            await fs.mkdir(path.dirname(path.join(distRoot, output)), { recursive: true });
            await fs.writeFile(path.join(distRoot, output), buffer);
            assets[source] = {
                hash,
                output: toPosix(output),
                bytes: buffer.length,
            };
            continue;
        }

        if (copyExtensions.has(ext)) {
            await copyFile(inputPath, relativePath);
            assets[source] = {
                output: source,
                bytes: (await fs.stat(inputPath)).size,
            };
            continue;
        }

        skipped.push(source);
    }

    const manifest = {
        version: 1,
        generatedAt: new Date().toISOString(),
        publicRoot: 'public',
        assets,
        skipped,
        warnings,
    };

    await fs.writeFile(path.join(distRoot, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`);

    const hashedCount = Object.values(assets).filter(asset => asset.hash).length;
    console.log(`Built ${Object.keys(assets).length} frontend assets (${hashedCount} hashed) in ${path.relative(repoRoot, distRoot)}`);
    warnings.forEach(warning => console.warn(warning));
}

build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
