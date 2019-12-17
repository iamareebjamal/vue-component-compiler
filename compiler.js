const VueTemplateCompiler = require("./vtc.js");
const fs = require("fs");
const path = require("path");
const promisify = require("util").promisify;

function findTemplateTag(js, index) {
  const toMatch = 'template'
  let keyIndex = toMatch.length - 1;
  let startIndex = index - 1;

  const isWhitespace = ch => ch.match(/\s/);
  const isTerminal = ch => [',', '/', '{'].includes(ch);

  while (startIndex > 0) {
    const ch = js[startIndex];
    if (isWhitespace(ch)) {
      startIndex--;
    } else {
      break;
    }
  }

  while (keyIndex >= 0 && toMatch[keyIndex--] === js[startIndex--]) { }
  const preceding = js[startIndex]
  if (keyIndex < 0 && (isWhitespace(preceding) || isTerminal(preceding))) {
    return startIndex + 1;
  }

  return null;
}

function findComponentOptions(js, componentStart) {
  let braceCount = 1;

  const start = js.indexOf("{", componentStart);

  if (start < 0) {
    return null;
  }

  let index = start + 1;
  let parseBlocker = null;
  let parseBlockerBuffer = null;

  const template = {
    tagIndex: null,
    start: null,
    end: null
  }

  while (index < js.length) {
    const c = js[index];

    if (!parseBlocker && !parseBlockerBuffer) {
      if (c == "{") {
        braceCount += 1;
      } else if (c == "}") {
        braceCount -= 1;
      } else if (c == ":") {
        if (braceCount == 1 && !template.tagIndex) {
          template.tagIndex = findTemplateTag(js, index);
        }
      } else if (c === '"' || c === "'" || c === "`") {
        parseBlocker = c;

        if (template.tagIndex && !template.start)
          template.start = index;
      } else if (js[index - 1] == "/") {
        if (c == "/") parseBlocker = "\n";
        else if (c == "*") parseBlockerBuffer = "*/";
      }

      if (braceCount === 0) {
        break;
      }
    } else {
      if (c === parseBlocker) {
        parseBlocker = null;

        if (template.start && !template.end)
          template.end = index
      } else if (c == '/' && js[index - 1] == '*') {
        parseBlockerBuffer = null;
      }
    }

    index++;
  }

  if (index >= js.length) return null;

  return {
    start,
    end: index,
    template: template.end ? template : null,
    componentStart: componentStart + 13
  };
}

function findComponents(js) {
  const componentStarts = [];
  let searchIndex = -1;

  do {
    searchIndex = js.indexOf("Vue.component", searchIndex + 1);

    if (searchIndex > -1) {
      const component = findComponentOptions(js, searchIndex);
      if (component != null) {
        componentStarts.push(component);
        searchIndex = component.start;
      }
    }
  } while (searchIndex > -1);

  return componentStarts;
}

function compileTemplate(js, component) {
  const template = js.substring(component.template.start + 1, component.template.end);
  return VueTemplateCompiler.compile(template);
}

function compile(js) {
  const splitted = [];
  let start = 0;
  const components = findComponents(js);

  console.log("Found " + components.length + " components\n\n");

  components.forEach(component => {
    const componentName = js.substring(component.componentStart, component.start);
    console.log(componentName);
    if (component.template) {
      splitted.push(js.substring(start, component.template.tagIndex));
      const compiled = compileTemplate(js, component);

      splitted.push(`render: function(){${compiled.render}}`)
      if (compiled.staticRenderFns.length)
        splitted.push(`,\nstaticRenderFns: [${compiled.staticRenderFns.map(fn => `function(){${fn}}`).join()}]`)

      start = component.template.end + 1;
    }
  });

  splitted.push(js.substring(start, js.length));

  return splitted.join('');
}

async function parse(file) {
  const js = (await promisify(fs.readFile)(file)).toString();
  console.log('\n\n\n\n Compiling ' + file + '\n\n')

  const compiled = compile(js);

  console.log('\n\n', compiled)
}

(async () => {
  const base =
    "/home/iamareebjamal/git/ng/newsgallery/newsgallery/media/new_layout/js/components/";

  async function recursiveParse(base) {
    const dirs = await promisify(fs.readdir)(base);
    for (const item of dirs) {
      const itemPath = base + item;
      const p = path.parse(itemPath);
      if (p.ext === ".js") parse(itemPath);
      else recursiveParse(itemPath + "/");
    }
  }

  recursiveParse(base);
  // parse("./common.js");
})();
