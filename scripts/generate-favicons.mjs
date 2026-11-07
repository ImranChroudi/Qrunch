import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#b45309"/><text x="50%" y="50%" fontSize="320" textAnchor="middle" dy=".35em" fill="#fff">M</text></svg>`;
const out = "public";
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "logo.svg"), svg);
console.log("wrote public/logo.svg");
