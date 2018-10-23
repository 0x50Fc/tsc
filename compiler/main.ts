
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { CC } from "./CCompiler";


function compile(stconfig: string): void {

  console.info(stconfig);

  let data = ts.readConfigFile(stconfig, (path: string): string => {
    return fs.readFileSync(path, { encoding: 'utf8' });
  });

  if (data.error !== undefined) {
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

  let options: CC.Options = config.kk;

  if (options.lib === undefined) {
    options.lib = "kk";
  }

  let program = ts.createProgram(files, config.compilerOptions);

  for (let file of program.getSourceFiles()) {

    if (file.isDeclarationFile) {
      continue;
    }

    let extname = path.extname(file.fileName);
    let dirname = path.dirname(file.fileName);
    var outdir = dirname;
    if (options.outDir !== undefined) {
      outdir = path.normalize(path.join(basedir, options.outDir));
    }

    console.info(file.fileName, ">>", outdir);

    let basename = path.basename(file.fileName, extname);
    let name = path.relative(basedir, path.join(dirname, basename));
    {
      let p = path.join(outdir, basename + ".h");
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
      let p = path.join(outdir, basename + ".cc");
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
