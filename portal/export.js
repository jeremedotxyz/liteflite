import {readFile,writeFile} from 'node:fs/promises';
const pages=['index.html','services.html','about.html'];
let content='# Lite Flite - Full Public Page Code\n\nClient Login requires the Node service. See README-PORTAL.md.\n';
for(const page of pages)content+=`\n## ${page}\n\n\`\`\`html\n${await readFile('outputs/'+page,'utf8')}\n\`\`\`\n`;
await writeFile('outputs/lite-flite-full-code.md',content);
