
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { CC } from "./CCompiler";


function compile(stconfig: string): void {

  console.info(stconfig);

  let data = ts.readConfigFile(stconfig, (path: string): string => {
    return fs.readFileSync(path, { encoding: 'utf8' });
  });

  if(data.error !== undefined) {
    throw new Error(data.error.messageText as string);
  }

  let config = data.config;

  let files: string[] = [];
  let basedir = path.dirname(stconfig);

  if (config.files !== undefined) {
    for (let p of config.files) {
      files.push(path.normalize(path.join(basedir, p)));
    }
  }

  let options: CC.Options = config.compilerOptions;

  if (options.kk === undefined) {
    options.kk = "kk";
  }

  let program = ts.createProgram(files, options);

  for (let file of program.getSourceFiles()) {

    if (file.isDeclarationFile) {
      continue;
    }

    console.info(file.fileName, ">>");

    let extname = path.extname(file.fileName);
    let dirname = path.dirname(file.fileName);

    let basename = path.basename(file.fileName, extname);
    let name = path.relative(basedir, path.join(dirname, basename));

    {
      let p = path.join(dirname, basename + ".h");
      let out: string[] = [];
      let cc = new CC.Compiler(options, (text: string): void => {
        out.push(text);
      });
      cc.file(CC.FileType.Header, file, program, name);
      fs.writeFileSync(p, out.join(''), {
        encoding: 'utf8'
      });
    }
    {
      let p = path.join(dirname, basename + ".cc");
      let out: string[] = [];
      let cc = new CC.Compiler(options, (text: string): void => {
        out.push(text);
      });
      cc.file(CC.FileType.Source, file, program, name);
      fs.writeFileSync(p, out.join(''), {
        encoding: 'utf8'
      });
    }

  }

  process.exit();
}

compile(process.argv[2]);
