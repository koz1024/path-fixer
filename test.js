let data = '\
import {readdir, readFile, writeFile} from "node:fs/promises";\n\
import path from "path";\n\
import { Core } from "./Core";\n\
';

const regexp = new RegExp(/import .*"(\..*)"/gmi);

data = data.replace(regexp, (match, p1) => {
    console.log(p1);
    return `${p1}.js`;
});

console.log(data);