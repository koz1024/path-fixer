#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const tsconfigName = getArg('-c') || 'tsconfig.json';
let outDir = getArg('-d');

function getArg(key) {
    const index = process.argv.indexOf(key);
    if (index === -1) return null;
    return process.argv[index + 1];
}

const regexp = new RegExp(/import (.*)['"](\..*)['"]/gmi);

(async function(){
    if (!outDir) {
        const tsconfig = await getTsConfig();
        outDir = path.resolve(tsconfig.compilerOptions.outDir);
    } else {
        outDir = path.resolve(outDir);
    }
    const files = await getFiles(outDir);
    for (let file of files) {
        if (!file.endsWith('.js')) continue;
        await processFile(file, {});
    }
})();

async function getTsConfig() {
    let tsconfig;
    try {
        tsconfig = JSON.parse(await fs.readFile(tsconfigName, {encoding: "utf8"}));
    } catch (e) {
        console.log('Could not read tsconfig.json');
    }
    if (!tsconfig?.compilerOptions?.outDir) {
        console.log('No outdir in tsconfig.json');
        console.log(tsconfig.compilerOptions);
        process.exit(1);
    }
    return tsconfig;
}

async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function processFile(file, tsconfig) {
    //todo: process "@" imports
    let data = await fs.readFile(file, {encoding: "utf8"});
    data = data.replace(regexp, (match, p1, p2) => {
        return `import ${p1} "${p2}.js"`;
    });
    await fs.writeFile(file, data);
}
