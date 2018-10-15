
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { CompilerOptions, getType, getSetSymbol } from './Compiler';
import { bodyCompile, expressionCompile } from './BodyCompiler';

function fileCompile_h(out: string[], basename: string, file: ts.SourceFile, program: ts.Program, options: CompilerOptions): void {

    let FILE_NAME = basename.replace("/", "_");

    out.push("#ifndef _" + FILE_NAME + "_H\n");
    out.push("#define _" + FILE_NAME + "_H\n\n");

    out.push("#include <" + options.kk + "/" + options.kk + ".h>\n\n");

    let checker = program.getTypeChecker();

    var level = 0;

    ts.forEachChild(file, visit);

    function visit(node: ts.Node) {

        console.info("[KIND]", node.kind.toString());

        if (ts.isModuleDeclaration(node)) {

            let symbol = checker.getSymbolAtLocation(node.name)!;

            out.push("\t".repeat(level));
            out.push("namespace ");
            out.push(symbol.name);
            out.push(" {\n\n");

            level++;

            console.info("[namespace] >>");

            ts.forEachChild(node.body!, visit);

            console.info("[namespace] <<");

            level--;

            out.push("\t".repeat(level));
            out.push("}\n\n");

        } else if (ts.isInterfaceDeclaration(node)) {

            let symbol = checker.getSymbolAtLocation(node.name)!;
            var index: ts.IndexSignatureDeclaration | undefined;

            ts.forEachChild(node, (node: ts.Node): void => {
                if (ts.isIndexSignatureDeclaration(node)) {
                    index = node;
                }
            });

            if (index !== undefined) {

                out.push("\t".repeat(level));
                out.push("typedef ");
                out.push(options.kk);
                out.push("::Map<");
                for(let param of index.parameters) {
                    let pType = checker.getTypeAtLocation(param.type!)!;
                    out.push(getType(pType,options));
                    break;
                }
                out.push(",");
                let vType = checker.getTypeAtLocation(index.type!)!;
                out.push(getType(vType,options));
                out.push("> ");
                out.push(symbol.name);
                out.push(";\n");

                return;
            }

            out.push("\t".repeat(level));
            out.push("class ");
            out.push(symbol.name);

            if (node.heritageClauses !== undefined) {

                var superClass: ts.HeritageClause | undefined;

                for (let extend of node.heritageClauses) {

                    if (extend.token == ts.SyntaxKind.ExtendsKeyword) {
                        superClass = extend;
                        break;
                    }

                }

                var s = ":";

                if (superClass !== undefined) {
                    for (let type of superClass.types) {
                        out.push(s);
                        out.push("public ")
                        out.push(type.expression.getText());
                        s = ",";
                    }
                } else {
                    out.push(s);
                    out.push("public ")
                    out.push(options.kk);
                    out.push("::IObject");
                    s = ",";
                }

                for (let extend of node.heritageClauses) {

                    if (superClass == extend) {
                        continue;
                    }

                    for (let type of extend.types) {
                        out.push(s);
                        out.push("public ")
                        out.push(type.expression.getText());
                        s = ",";
                    }

                }

            } else {
                out.push(":public " + options.kk + "::IObject");
            }

            out.push(" {\n");

            out.push("\t".repeat(level));
            out.push("public:\n");

            level++;

            console.info("[interface] >>");

            ts.forEachChild(node, visit);

            console.info("[interface] <<");

            level--;

            out.push("\t".repeat(level));
            out.push("};\n\n");

        } else if (ts.isClassDeclaration(node) && node.name !== undefined) {

            let symbol = checker.getSymbolAtLocation(node.name)!;

            out.push("\t".repeat(level));
            out.push("class ");
            out.push(symbol.name);

            if (node.heritageClauses !== undefined) {

                var superClass: ts.HeritageClause | undefined;

                for (let extend of node.heritageClauses) {

                    if (extend.token == ts.SyntaxKind.ExtendsKeyword) {
                        superClass = extend;
                        break;
                    }

                }

                var s = ":";

                if (superClass !== undefined) {
                    for (let type of superClass.types) {
                        out.push(s);
                        out.push("public ")
                        out.push(type.expression.getText());
                        s = ",";
                    }
                } else {
                    out.push(s);
                    out.push("public ")
                    out.push(options.kk);
                    out.push("::Object");
                    s = ",";
                }

                for (let extend of node.heritageClauses) {

                    if (superClass == extend) {
                        continue;
                    }

                    for (let type of extend.types) {
                        out.push(s);
                        out.push("public ")
                        out.push(type.expression.getText());
                        s = ",";
                    }

                }

            } else {
                out.push(":public " + options.kk + "::Object");
            }

            out.push(" {\n");

            console.info("[class] >>");

            ts.forEachChild(node, visit);

            console.info("[class] <<");

            out.push("\t".repeat(level));
            out.push("};\n\n");

        } else if (ts.isPropertySignature(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let symbol = checker.getSymbolAtLocation(node.name)!;
            var readonly = false;

            if (node.modifiers !== undefined) {
                for (let element of node.modifiers) {
                    if (element.kind == ts.SyntaxKind.ReadonlyKeyword) {
                        readonly = true;
                    }
                }
            }

            let stype = getType(type, options);
            out.push("\t".repeat(level));
            out.push("virtual ");
            out.push(stype);
            out.push(" " + symbol.name + "() = 0;\n");

            if (!readonly) {

                out.push("\t".repeat(level));
                out.push("virtual void " + getSetSymbol(symbol.name) + "(" + stype + " v) = 0;\n");
            }


        } else if (ts.isPropertyDeclaration(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;

            var mod = "public: ";
            var st = false;
            var readonly = false;

            if (node.modifiers !== undefined) {
                for (let element of node.modifiers) {
                    if (element.kind == ts.SyntaxKind.ReadonlyKeyword) {
                        readonly = true;
                    } else if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        mod = "private: ";
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        mod = "protected: ";
                    } else if (element.kind == ts.SyntaxKind.StaticKeyword) {
                        st = true;
                    }
                }
            }

            if (mod != "public: ") {

                out.push("\t".repeat(level));
                out.push(mod + "\n");
                out.push("\t".repeat(level + 1));
                if ((type.flags & ts.TypeFlags.Object) != 0) {
                    out.push(options.kk);
                    out.push("::Strong");
                } else {
                    out.push(stype);
                }
                out.push(" " + symbol.name + ";\n\n");

            } else {

                out.push("\t".repeat(level));
                out.push(mod);
                out.push("\n");
                out.push("\t".repeat(level + 1));
                if (st) {
                    out.push("static ");
                } else {
                    out.push("virtual ");
                }
                out.push(stype);
                out.push(" " + symbol.name + "();\n");

                if (!readonly) {

                    out.push("\t".repeat(level + 1));
                    if (st) {
                        out.push("static ");
                    } else {
                        out.push("virtual ");
                    }
                    out.push("void " + getSetSymbol(symbol.name) + "(" + stype + " v);\n");

                }
                out.push("\t".repeat(level));
                out.push("protected:\n");
                out.push("\t".repeat(level + 1));
                if ((type.flags & ts.TypeFlags.Object) != 0) {
                    out.push(options.kk);
                    out.push("::Strong");
                } else {
                    out.push(stype);
                }
                out.push(" _" + symbol.name + ";\n\n");
            }

        } else if (ts.isMethodSignature(node)) {


            let type = node.type === undefined ? undefined : checker.getTypeAtLocation(node.type!);
            let stype = type === undefined ? 'void' : getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;

            out.push("\t".repeat(level));
            out.push("virtual ");
            out.push(stype);
            out.push(" " + symbol.name + "(");

            if (node.parameters !== undefined) {
                var s = "";
                for (let param of node.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = checker.getTypeAtLocation(node.type!)!;
                    let stype = getType(type, options);
                    out.push(s);
                    out.push(stype);
                    out.push(" ");
                    out.push(name.name);
                    s = ",";
                }
            }

            out.push(") = 0;\n");

        } else if (ts.isMethodDeclaration(node)) {

            var mod = "public: ";
            var st = false;

            if (node.modifiers !== undefined) {
                for (let element of node.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        mod = "private: ";
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        mod = "protected: ";
                    } else if (element.kind == ts.SyntaxKind.StaticKeyword) {
                        st = true;
                    }
                }
            }

            let type = node.type === undefined ? undefined : checker.getTypeAtLocation(node.type!);
            let stype = type === undefined ? 'void' : getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;

            out.push("\t".repeat(level));
            out.push(mod);
            out.push("\n");
            out.push("\t".repeat(level + 1));
            if (st) {
                out.push("static ");
            } else {
                out.push("virtual ");
            }
            out.push(stype);
            out.push(" " + symbol.name + "(");

            if (node.parameters !== undefined) {
                var s = "";
                for (let param of node.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = checker.getTypeAtLocation(param.type!)!;
                    let stype = getType(type, options);
                    out.push(s);
                    out.push(stype);
                    out.push(" ");
                    out.push(name.name);
                    s = ",";
                }
            }

            out.push(");\n");

        } else if (ts.isFunctionDeclaration(node) && node.name !== undefined) {

            let symbol = checker.getSymbolAtLocation(node.name)!;

            let type = node.type === undefined ? undefined : checker.getTypeAtLocation(node.type!);
            let stype = type === undefined ? 'void' : getType(type, options);

            out.push("\t".repeat(level));

            out.push(stype);
            out.push(" " + symbol.name + "(");

            if (node.parameters !== undefined) {
                var s = "";
                for (let param of node.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = checker.getTypeAtLocation(param.type!)!;
                    let stype = getType(type, options);
                    out.push(s);
                    out.push(stype);
                    out.push(" ");
                    out.push(name.name);
                    s = ",";
                }
            }

            out.push(");\n");
        } else if (ts.isGetAccessorDeclaration(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;

            var mod = "public: ";
            var st = false;

            if (node.modifiers !== undefined) {
                for (let element of node.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        mod = "private: ";
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        mod = "protected: ";
                    } else if (element.kind == ts.SyntaxKind.StaticKeyword) {
                        st = true;
                    }
                }
            }

            out.push("\t".repeat(level));
            out.push(mod);
            out.push("\n");
            out.push("\t".repeat(level + 1));
            if (st) {
                out.push("static ");
            } else {
                out.push("virtual ");
            }
            out.push(stype);
            out.push(" " + symbol.name + "();\n\n");
        } else if (ts.isSetAccessorDeclaration(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;

            var mod = "public: ";
            var st = false;

            if (node.modifiers !== undefined) {
                for (let element of node.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        mod = "private: ";
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        mod = "protected: ";
                    } else if (element.kind == ts.SyntaxKind.StaticKeyword) {
                        st = true;
                    }
                }
            }

            out.push("\t".repeat(level + 1));
            out.push(mod);
            out.push("\n");
            out.push("\t".repeat(level + 1));
            if (st) {
                out.push("static ");
            } else {
                out.push("virtual ");
            }
            out.push("void " + getSetSymbol(symbol.name) + "(" + stype + " v);\n");

        } else if (ts.isConstructorDeclaration(node)) {

            let p: ts.ClassDeclaration = node.parent as ts.ClassDeclaration;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            out.push("\t".repeat(level));
            out.push("public:\n");
            out.push("\t".repeat(level + 1));
            out.push(psymbol.name);
            out.push("(");

            var vs: string[] = [];

            for (let param of node.parameters) {

                let type = checker.getTypeAtLocation(param.type!)!;
                let stype = getType(type, options);
                let name = checker.getSymbolAtLocation(param.name)!;

                vs.push(stype + " " + name.name);
            }

            out.push(vs.join(","));

            out.push(");\n\n");
        }

    }

    out.push("#endif\n\n");
}

function fileCompile_cc(out: string[], basename: string, file: ts.SourceFile, program: ts.Program, options: CompilerOptions): void {

    let FILE_NAME = basename.replace("/", "_");

    out.push("#include \"" + basename + ".h\"\n\n");

    let checker = program.getTypeChecker();

    var level = 0;

    ts.forEachChild(file, visit);

    function visit(node: ts.Node) {

        console.info("[KIND]", node.kind.toString());

        if (ts.isModuleDeclaration(node)) {

            let symbol = checker.getSymbolAtLocation(node.name)!;

            out.push("\t".repeat(level));
            out.push("namespace ");
            out.push(symbol.name);
            out.push(" {\n\n");

            level++;

            console.info("[namespace] >>");

            ts.forEachChild(node.body!, visit);

            console.info("[namespace] <<");

            level--;

            out.push("\t".repeat(level));
            out.push("}\n\n");

        } else if (ts.isClassDeclaration(node) && node.name !== undefined) {

            console.info("[class] >>");

            ts.forEachChild(node, visit);

            console.info("[class] <<");

        } else if (ts.isPropertyDeclaration(node)) {

            let p: ts.ClassDeclaration = node.parent as ts.ClassDeclaration;
            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            var mod = "public: ";

            if (node.modifiers !== undefined) {
                for (let element of node.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        mod = "private: ";
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        mod = "protected: ";
                    }
                }
            }

            if (mod == "public: ") {

                var readonly = false;

                if (node.modifiers !== undefined) {
                    for (let element of node.modifiers) {
                        if (element.kind == ts.SyntaxKind.ReadonlyKeyword) {
                            readonly = true;
                        }
                    }
                }

                out.push("\t".repeat(level));
                out.push(stype);
                out.push(" ");
                out.push(psymbol.name);
                out.push("::");
                out.push(symbol.name + "() {\n");
                if ((type.flags & ts.TypeFlags.Object) != 0) {
                    out.push("\t".repeat(level + 1));
                    out.push("return (");
                    out.push(stype);
                    out.push(")")
                    out.push("_" + symbol.name);
                    out.push(".get();\n");
                } else {
                    out.push("\t".repeat(level + 1));
                    out.push("return ");
                    out.push("_" + symbol.name);
                    out.push(";\n");
                }
                out.push("\t".repeat(level));
                out.push("}\n");

                if (!readonly) {

                    out.push("\t".repeat(level));
                    out.push("void ");
                    out.push(psymbol.name);
                    out.push("::");
                    out.push(getSetSymbol(symbol.name) + "(");
                    out.push(stype);
                    out.push(" __newValue__");
                    out.push(") {\n");
                    {
                        out.push("\t".repeat(level + 1));
                        out.push("_" + symbol.name);
                        out.push(" = __newValue__;\n");
                    }
                    out.push("\t".repeat(level));
                    out.push("}\n");

                }

                out.push("\n");
            }

        } else if (ts.isMethodDeclaration(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;
            let p: ts.ClassDeclaration = node.parent as ts.ClassDeclaration;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            out.push("\t".repeat(level));
            out.push(stype);
            out.push(" ")
            out.push(psymbol.name);
            out.push("::");
            out.push(symbol.name + "(");

            if (node.parameters !== undefined) {
                var s = "";
                for (let param of node.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = checker.getTypeAtLocation(param.type!)!;
                    let stype = getType(type, options);
                    out.push(s);
                    out.push(stype);
                    out.push(" ");
                    out.push(name.name);
                    s = ",";
                }
            }

            out.push(") {\n");

            if (node.body !== undefined) {
                bodyCompile(out, node.body, program, options, level + 1, p);
            }

            out.push("\t".repeat(level));
            out.push("}\n\n");


        } else if (ts.isFunctionDeclaration(node) && node.name !== undefined) {

            let symbol = checker.getSymbolAtLocation(node.name)!;

            let type = node.type === undefined ? undefined : checker.getTypeAtLocation(node.type!);
            let stype = type === undefined ? 'void' : getType(type, options);

            out.push("\t".repeat(level));

            out.push(stype);
            out.push(" " + symbol.name + "(");

            if (node.parameters !== undefined) {
                var s = "";
                for (let param of node.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = checker.getTypeAtLocation(param.type!)!;
                    let stype = getType(type, options);
                    out.push(s);
                    out.push(stype);
                    out.push(" ");
                    out.push(name.name);
                    s = ",";
                }
            }

            out.push(") {\n");

            if (node.body !== undefined) {
                bodyCompile(out, node.body, program, options, level + 1, undefined);
            }

            out.push("\t".repeat(level));
            out.push("}\n\n");

        } else if (ts.isGetAccessorDeclaration(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;
            let p: ts.ClassDeclaration = node.parent as ts.ClassDeclaration;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            out.push("\t".repeat(level));
            out.push(stype);
            out.push(" ");
            out.push(psymbol.name);
            out.push("::");
            out.push(symbol.name + "() {\n");

            if (node.body !== undefined) {
                bodyCompile(out, node.body, program, options, level + 1, p);
            }

            out.push("\t".repeat(level));
            out.push("}\n\n");

        } else if (ts.isSetAccessorDeclaration(node)) {

            let type = checker.getTypeAtLocation(node.type!)!;
            let stype = getType(type, options);
            let symbol = checker.getSymbolAtLocation(node.name)!;
            let p: ts.ClassDeclaration = node.parent as ts.ClassDeclaration;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            out.push("\t".repeat(level));
            out.push("void ");
            out.push(psymbol.name);
            out.push("::");
            out.push(getSetSymbol(symbol.name) + "(");

            if (node.parameters !== undefined) {
                var s = "";
                for (let param of node.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = checker.getTypeAtLocation(param.type!)!;
                    let stype = getType(type, options);
                    out.push(s);
                    out.push(stype);
                    out.push(" ");
                    out.push(name.name);
                    s = ",";
                }
            }

            out.push(") {\n");

            if (node.body !== undefined) {
                bodyCompile(out, node.body, program, options, level + 1, p);
            }

            out.push("\t".repeat(level));
            out.push("}\n\n");

        } else if (ts.isConstructorDeclaration(node)) {

            let p: ts.ClassDeclaration = node.parent as ts.ClassDeclaration;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            out.push("\t".repeat(level));

            out.push(psymbol.name);
            out.push("::");
            out.push(psymbol.name);
            out.push("(");

            var vs: string[] = [];

            for (let param of node.parameters) {

                let type = checker.getTypeAtLocation(param.type!)!;
                let stype = getType(type, options);
                let name = checker.getSymbolAtLocation(param.name)!;

                vs.push(stype + " " + name.name);
            }

            out.push(vs.join(","));

            out.push(") {\n");

            ts.forEachChild(p, (node: ts.Node): void => {

                if (ts.isPropertyDeclaration(node)) {

                    if (node.initializer !== undefined) {

                        let name = checker.getSymbolAtLocation(node.name)!
                        let type = checker.getTypeAtLocation(node.type!)!;

                        var isPublic = true;

                        if (node.modifiers !== undefined) {
                            for (let element of node.modifiers) {
                                if (element.kind == ts.SyntaxKind.PrivateKeyword || ts.SyntaxKind.ProtectedKeyword) {
                                    isPublic = false;
                                    break;
                                }
                            }
                        }

                        if (ts.isObjectLiteralExpression(node.initializer)) {

                            if (!type.isClassOrInterface()) {
                                return;
                            }

                            let e = node.initializer;

                            out.push("\t".repeat(level + 1));
                            out.push("{\n");
                            {
                                out.push("\t".repeat(level + 2));
                                out.push(type.symbol.name);
                                out.push(" * __V__ = new ");
                                out.push(type.symbol.name);
                                out.push("();\n");

                                for (let prop of e.properties) {
                                    if (ts.isPropertyAssignment(prop)) {
                                        let n = checker.getSymbolAtLocation(prop.name)!
                                        out.push("\t".repeat(level + 2));
                                        out.push("v->");
                                        out.push(getSetSymbol(n.name));
                                        out.push("(");
                                        expressionCompile(out, prop.initializer, program, options, p);
                                        out.push(");\n");
                                    }
                                }

                                out.push("\t".repeat(level + 2));
                                out.push("this->");

                                if (isPublic) {
                                    out.push("_");
                                }

                                out.push(name.name);
                                out.push(" = __V__;\n");

                            }

                            out.push("\t".repeat(level + 1));
                            out.push("}\n");

                        } else {
                            out.push("\t".repeat(level + 1));
                            if (isPublic) {
                                out.push("this->_");
                                out.push(name.name);
                                out.push("=");
                            } else {
                                out.push("this->");
                                out.push(name.name);
                                out.push("=");
                            }
                            expressionCompile(out, node.initializer, program, options, p);
                            out.push(";\n");
                        }


                    }
                }

            });

            if (node.body !== undefined) {
                bodyCompile(out, node.body, program, options, level + 1, p);
            }

            out.push("\t".repeat(level));
            out.push("}\n\n");
        }
    }

    out.push("\n\n");

}

export function fileCompile(file: ts.SourceFile, program: ts.Program, options: CompilerOptions): void {

    let extname = path.extname(file.fileName);
    var dirname = path.dirname(file.fileName);

    if (options.outDir) {
        dirname = options.outDir!;
    }

    let basename = path.basename(file.fileName, extname);
    let name = path.relative(path.join(dirname, basename), ".");
    let h_path = path.join(dirname, basename + ".h");
    let cc_path = path.join(dirname, basename + ".cc");

    let h_out: string[] = [];
    let cc_out: string[] = [];

    fileCompile_h(h_out, basename, file, program, options);
    fileCompile_cc(cc_out, basename, file, program, options);

    fs.writeFileSync(h_path, h_out.join(''), {
        encoding: 'utf8'
    });
    fs.writeFileSync(cc_path, cc_out.join(''), {
        encoding: 'utf8'
    });
}
