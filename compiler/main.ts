
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { CompilerOptions } from './Compiler';
import { fileCompile } from './FileCompiler';

function compile(fileNames: string[], options: CompilerOptions): void {

  console.info(fileNames);

  let program = ts.createProgram(fileNames, options);
  
  for (let sourceFile of program.getSourceFiles()) {
    
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    console.info(sourceFile.fileName, ">>");

    fileCompile(sourceFile,program,options)

  }

  process.exit();
}

compile(process.argv.slice(2), {
  noEmitOnError: true,
  noImplicitAny: true,
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
  kk: "kk"
});
