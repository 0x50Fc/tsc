
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";



function compile(fileNames: string[], options: ts.CompilerOptions, ns: string = "kk"): void {

  console.info(fileNames);

  let program = ts.createProgram(fileNames, options);
  let checker = program.getTypeChecker();

  for (let sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    console.info(sourceFile.fileName, ">>");

    let extname = path.extname(sourceFile.fileName);
    let dirname = path.dirname(sourceFile.fileName);
    let basename = path.basename(sourceFile.fileName, extname);
    let h_path = path.join(dirname, basename + ".h");
    let cc_path = path.join(dirname, basename + ".cc");
    let h_content: string[] = [];
    let cc_content: string[] = [];
    var level = 0;

    h_content.push("#ifndef _" + basename.toUpperCase() + "_H\n");
    h_content.push("#define _" + basename.toUpperCase() + "_H\n\n");

    cc_content.push("#include \"" + basename + ".h\"\n\n");

    ts.forEachChild(sourceFile, visit);

    function getType(type: ts.Type): string {
      if ((type.flags & ts.TypeFlags.String) != 0) {
        return ns + "::String";
      }
      if ((type.flags & ts.TypeFlags.Number) != 0) {
        if (type.aliasSymbol !== undefined) {
          return ns + "::" + type.aliasSymbol.name;
        }
        return ns + "::Number";
      }
      if ((type.flags & ts.TypeFlags.Boolean) != 0) {
        return ns + "::Boolean";
      }
      console.info("[TYPE] 0x", type.flags.toString(16));
      return "";
    }

    function visit(node: ts.Node) {

      console.info("[KIND]", node.kind.toString());

      if (ts.isModuleDeclaration(node)) {

        let symbol = checker.getSymbolAtLocation(node.name)!;

        h_content.push("\t".repeat(level));
        h_content.push("namespace ");
        h_content.push(symbol.name);
        h_content.push(" {\n\n");

        cc_content.push("\t".repeat(level));
        cc_content.push("namespace ");
        cc_content.push(symbol.name);
        cc_content.push(" {\n\n");

        level++;

        console.info("[namespace] >>");

        ts.forEachChild(node.body!, visit);

        console.info("[namespace] <<");

        level--;

        h_content.push("\t".repeat(level));
        h_content.push("}\n\n");

        cc_content.push("\t".repeat(level));
        cc_content.push("}\n\n");

      } else if (ts.isInterfaceDeclaration(node)) {

        let symbol = checker.getSymbolAtLocation(node.name)!;

        h_content.push("\t".repeat(level));
        h_content.push("class ");
        h_content.push(symbol.name);
        h_content.push(" {\n\n");

        level++;

        h_content.push("\t".repeat(level));
        h_content.push("public:\n");

        level++;
        console.info("[interface] >>");

        ts.forEachChild(node, visit);

        console.info("[interface] <<");
        level--;

        level--;

        h_content.push("\t".repeat(level));
        h_content.push("};\n\n");

      } else if (ts.isClassDeclaration(node) && node.name !== undefined) {

        let symbol = checker.getSymbolAtLocation(node.name)!;

        h_content.push("\t".repeat(level));
        h_content.push("class ");
        h_content.push(symbol.name);
        h_content.push(" {\n\n");

        console.info("[class] >>");

        ts.forEachChild(node, visit);

        console.info("[class] <<");

        h_content.push("\t".repeat(level));
        h_content.push("};\n\n");

      } else if (ts.isPropertySignature(node)) {

        let type = getType(checker.getTypeAtLocation(node.type!)!);
        let symbol = checker.getSymbolAtLocation(node.name)!;

        h_content.push("\t".repeat(level));
        h_content.push(type);
        h_content.push(" " + symbol.name + "() = 0;\n");

        var readonly = false;

        if (node.modifiers !== undefined) {
          for (let element of node.modifiers) {
            if (element.kind == ts.SyntaxKind.ReadonlyKeyword) {
              readonly = true;
            }
          }
        }

        if (!readonly) {
          h_content.push("\t".repeat(level));
          h_content.push("void set" + symbol.escapedName + "(" + type + " v) = 0;\n");
        }

      }
    }

    h_content.push("#endif\n");

    fs.writeFileSync(h_path, h_content.join(''));
    fs.writeFileSync(cc_path, cc_content.join(''));
  }

  process.exit();
}

compile(process.argv.slice(2), {
  noEmitOnError: true,
  noImplicitAny: true,
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS
});
