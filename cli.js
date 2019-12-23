#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const process = require('process');
const { compileFile } = require('.');
const promisify = require("util").promisify;

async function demo() {
  const base =
    "/home/iamareebjamal/git/ng/newsgallery/newsgallery/media/new_layout/js/components/";

  async function recursiveParse(base) {
    const dirs = await promisify(fs.readdir)(base);
    for (const item of dirs) {
      const itemPath = base + item;
      const p = path.parse(itemPath);
      if (p.ext === ".js") compileFile(itemPath, demo = true);
      else recursiveParse(itemPath + "/");
    }
  }

  recursiveParse(base);
}

(async () => {
  const arguments = process.argv;
  if (arguments.length < 3)
    await demo()
  else if (arguments.length < 4)
    console.log(await compileFile(arguments[2]))
  else if (arguments.length < 5) {
    await promisify(fs.writeFile)(arguments[3], await compileFile(arguments[2]))
  } else {
    console.error('Usage: compiler [infile.js [outfile.js]]')
  }
})();
