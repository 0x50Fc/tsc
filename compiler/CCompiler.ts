
import * as ts from "typescript";
import { read } from "fs";

export namespace CC {


    function isPublicProperty(node: ts.PropertyDeclaration): boolean {

        if (node.modifiers !== undefined) {

            for (let m of node.modifiers) {
                if (m.kind == ts.SyntaxKind.PrivateKeyword || m.kind == ts.SyntaxKind.ProtectedKeyword) {
                    return false;
                }
            }
        }
        return true;
    }


    function isFunctionType(type: ts.Type): boolean {
        if ((type.flags & ts.TypeFlags.Union) != 0) {
            type = type.getNonNullableType();
        }
        return (type.flags & ts.TypeFlags.Object) != 0 && !type.isClassOrInterface();
    }

    function isObjectType(type: ts.Type): boolean {
        if ((type.flags & ts.TypeFlags.Union) != 0) {
            type = type.getNonNullableType();
        }
        return (type.flags & ts.TypeFlags.Object) != 0 && type.isClassOrInterface();
    }

    interface Type extends ts.Type {
        name:string | undefined;
    }

    function getTypeAtLocation(node:ts.TypeNode | undefined,checker:ts.TypeChecker):ts.Type | undefined {
        if(node === undefined) {
            return undefined;
        }
        let type = checker.getTypeAtLocation(node) as (Type | undefined);
        if(type === undefined) {
            return undefined;
        }
        type.name = node.getText();
        return type;
    }

    function getType(type: ts.Type | undefined, options: Options): string {
        if (type === undefined) {
            return options.kk + "::Any";
        }
        if ((type.flags & ts.TypeFlags.Union) != 0) {
            type = type.getNonNullableType();
        }
        if ((type.flags & ts.TypeFlags.String) != 0) {
            return options.kk + "::String";
        }
        if ((type.flags & ts.TypeFlags.Number) != 0) {
            let t:Type = type as Type;
            if(t.name !== undefined) {
                switch(t.name) {
                case "int":
                    return options.kk + "::Int";
                case "uint":
                    return options.kk + "::Uint";
                case "int32":
                    return options.kk + "::Int32";
                case "uint32":
                    return options.kk + "::Uint32";
                case "int64":
                    return options.kk + "::Int64";
                case "uint64":
                    return options.kk + "::Uint64";
                }
            }
            
            return options.kk + "::Number";
        }
        if ((type.flags & ts.TypeFlags.Boolean) != 0) {
            return options.kk + "::Boolean";
        }
        if ((type.flags & ts.TypeFlags.Object) != 0) {
            if (type.isClassOrInterface()) {
                return type.symbol.name + " *";
            } else {
                throw new Error("[TYPE] " + type.flags.toString());
            }
        }
        throw new Error("[TYPE] " + type.flags.toString());
    }

    function getDefaultValue(type: ts.Type | undefined, options: Options): string {
        if (type === undefined) {
            return "nullptr";
        }
        if ((type.flags & ts.TypeFlags.Union) != 0) {
            type = type.getNonNullableType();
        }
        if ((type.flags & ts.TypeFlags.String) != 0) {
            return '""';
        }
        if ((type.flags & ts.TypeFlags.Number) != 0) {
            return "0";
        }
        if ((type.flags & ts.TypeFlags.Boolean) != 0) {
            return "false";
        }
        return "nullptr";
    }

    function define(name: string, type: ts.Type | undefined, program: ts.Program, options: Options): string {

        if (type !== undefined && isFunctionType(type)) {

            let checker = program.getTypeChecker();
            let vs: string[] = [];

            if ((type.flags & ts.TypeFlags.Union) != 0) {
                type = type.getNonNullableType();
            }

            for (let sign of type.getCallSignatures()) {

                vs.push(define("", sign.getReturnType(), program, options))
                vs.push(" ((*" + name + ")(");

                let args: string[] = [];

                for (let param of sign.parameters) {

                    if (ts.isParameter(param.valueDeclaration)) {
                        let vType = getTypeAtLocation(param.valueDeclaration.type!,checker);
                        args.push(define(param.name, vType, program, options));
                    }
                }

                vs.push(args.join(","));

                vs.push("))");

                break;
            }

            return vs.join('');

        } else {
            let s = getType(type, options);
            if (name != "") {
                s += " " + name;
            }
            return s;
        }

    }

    function getter(name: string, type: ts.Type | undefined, program: ts.Program, options: Options): string {

        let out: string[] = [];

        if (type !== undefined && isFunctionType(type)) {

            let checker = program.getTypeChecker();

            if ((type.flags & ts.TypeFlags.Union) != 0) {
                type = type.getNonNullableType();
            }

            for (let sign of type.getCallSignatures()) {

                out.push(define("", sign.getReturnType(), program, options))
                out.push(" (*" + name + "())(");

                let args: string[] = [];

                for (let param of sign.parameters) {

                    if (ts.isParameter(param.valueDeclaration)) {
                        let vType = getTypeAtLocation(param.valueDeclaration.type!,checker);
                        args.push(define(param.name, vType, program, options));
                    }
                }

                out.push(args.join(","));

                out.push(")");

                break;
            }

        } else {

            out.push(define(name, type, program, options));
            out.push("()");

        }

        return out.join('');
    }


    function setter(name: string, value: string, type: ts.Type | undefined, program: ts.Program, options: Options): string {

        let out: string[] = [];

        out.push("void ");
        out.push(name);
        out.push("(")
        out.push(define(value, type, program, options));
        out.push(")");

        return out.join('');
    }

    function getSetSymbol(name: string): string {
        return "set" + name.substr(0, 1).toLocaleUpperCase() + name.substr(1);
    }

    export interface Options extends ts.CompilerOptions {
        kk: string
    }

    export enum FileType {
        Header, Source
    }

    export class Compiler {

        private _out: (text: string) => void;
        private _options: Options;
        private _level: number = 0;
        private _isNewLine: boolean = true;

        public get isNewLine(): boolean {
            return this._isNewLine
        }

        constructor(options: Options, out: (text: string) => void) {
            this._options = options;
            this._out = out;
        }

        protected out(text: string): void {
            this._out(text);
            this._isNewLine = text.endsWith("\n");
        }

        protected level(level: number = 0): void {
            this.out("\t".repeat(Math.max(this._level + level, 0)));
        }

        public include(name: string, isLibrary: boolean = false): void {
            this.out("#include ");
            if (isLibrary) {
                this.out("<");
            } else {
                this.out('"');
            }
            this.out(name);
            if (isLibrary) {
                this.out(">\n");
            } else {
                this.out('"\n');
            }
        }

        public namespaceStart(name: string): void {
            this.level();
            this.out("namespace ");
            this.out(name);
            this.out(" {\n\n");
            this._level++;
        }

        public namespaceEnd(): void {
            this._level--;
            this.level();
            this.out("}\n\n");
        }

        protected heritageClauses(clauses?: ts.NodeArray<ts.HeritageClause>, isClass = true): void {

            if (clauses !== undefined) {

                var superClass: ts.HeritageClause | undefined;

                for (let extend of clauses) {

                    if (extend.token == ts.SyntaxKind.ExtendsKeyword) {
                        superClass = extend;
                        break;
                    }

                }

                var s = ":";

                if (superClass !== undefined) {
                    for (let type of superClass.types) {
                        this.out(s);
                        this.out("public ")
                        this.out(type.expression.getText());
                        s = ",";
                    }
                } else {
                    this.out(s);
                    this.out("public ")
                    this.out(this._options.kk);
                    if (isClass) {
                        this.out("::Object");
                    } else {
                        this.out("::IObject");
                    }
                    s = ",";
                }

                for (let extend of clauses) {

                    if (superClass == extend) {
                        continue;
                    }

                    for (let type of extend.types) {
                        this.out(s);
                        this.out("public ")
                        this.out(type.expression.getText());
                        s = ",";
                    }

                }

            } else {
                this.out(":public " + this._options.kk);
                if (isClass) {
                    this.out("::Object");
                } else {
                    this.out("::IObject");
                }
            }

        }

        public classStart(node: ts.ClassDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();

            if (node.name !== undefined) {

                let name = checker.getSymbolAtLocation(node.name)!;

                this.level();
                this.out("class ");
                this.out(name.name);
                this.heritageClauses(node.heritageClauses, true);
                this.out(" {\n");
                this._level++;
                console.info("[class]", name.name, ">>");

            }
        }

        public classEnd() {
            console.info("[class] <<");
            this._level--;
            this.level();
            this.out("};\n\n");
        }

        public classGetter(s: ts.PropertyDeclaration | ts.GetAccessorDeclaration, program: ts.Program, mod: boolean = false): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);

            if (mod === true) {

                var m = "public: ";
                if (s.modifiers !== undefined) {
                    for (let element of s.modifiers) {
                        if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                            m = "private: ";
                        } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                            m = "protected: ";
                        }
                    }
                }

                this.level(-1);
                this.out(m);
                this.out("\n");
            }
            this.level();
            this.out("virtual ")
            this.out(getter(name.name, type, program, this._options));
            this.out(";\n");

        }

        public classSetter(s: ts.PropertyDeclaration | ts.SetAccessorDeclaration, program: ts.Program, mod: boolean = false): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);

            if (mod === true) {

                var m = "public: ";
                if (s.modifiers !== undefined) {
                    for (let element of s.modifiers) {
                        if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                            m = "private: ";
                        } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                            m = "protected: ";
                        }
                    }
                }

                this.level(-1);
                this.out(m);
                this.out("\n");
            }

            this.level();
            this.out("virtual ")
            this.out(setter(getSetSymbol(name.name), "v", type, program, this._options));
            this.out(";\n");

        }

        public classMember(s: ts.PropertyDeclaration, program: ts.Program, prefix: string = "_"): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);

            this.level();

            if (type !== undefined && isFunctionType(type)) {
                this.out(this._options.kk);
                this.out("::Function<");
                this.out(define("", type, program, this._options));
                this.out("> ");
                this.out(prefix);
                this.out(name.name);
            } else if (type !== undefined && isObjectType(type)) {
                this.out(this._options.kk);
                this.out("::Strong<");
                this.out(define("", type, program, this._options));
                this.out("> ");
                this.out(prefix);
                this.out(name.name);
            } else {
                this.out(define(prefix + name.name, type, program, this._options));
            }

            this.out(";\n");

        }

        public classProperty(s: ts.PropertyDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();

            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);
            let name = checker.getSymbolAtLocation(s.name)!;

            var mod = "public: ";
            var st = false;
            var readonly = false;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
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

                this.level(-1);
                this.out(mod);
                this.out("\n");
                this.classMember(s, program, "");

            } else {

                this.level(-1);
                this.out(mod);
                this.out("\n");

                this.classGetter(s, program);

                if (!readonly) {
                    this.classSetter(s, program);
                }

                this.level(-1);
                this.out("protected:\n");
                this.classMember(s, program, "_");

            }

            this.out("\n");

        }

        public classPropertys(s: ts.ClassDeclaration, program: ts.Program): void {

            let v = this;

            ts.forEachChild(s, (node: ts.Node): void => {

                if (ts.isPropertyDeclaration(node)) {

                    v.classProperty(node, program);

                } else if (ts.isGetAccessorDeclaration(node)) {

                    v.classGetter(node, program, true);
                } else if (ts.isSetAccessorDeclaration(node)) {

                    v.classSetter(node, program, true);
                }

            });

        }

        public classMethod(s: ts.MethodDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type!,checker);
            let symbol = checker.getSymbolAtLocation(s.name)!;

            var mod = "public: ";
            var st = false;
            var readonly = false;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        mod = "private: ";
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        mod = "protected: ";
                    } else if (element.kind == ts.SyntaxKind.StaticKeyword) {
                        st = true;
                    }
                }
            }

            this.level(-1);
            this.out(mod);
            this.out("\n");
            this.level();
            if (st) {
                this.out("static ");
            } else {
                this.out("virtual ");
            }
            this.out(type === undefined ? "void " + symbol.name : define(symbol.name, type, program, this._options));
            this.out("(");

            if (s.parameters !== undefined) {
                var dot = "";
                for (let param of s.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                    this.out(dot);
                    this.out(define(name.name, type, program, this._options));
                    dot = ",";
                }
            }

            this.out(");\n");
        }

        public classMethods(s: ts.ClassDeclaration, program: ts.Program): void {

            let v = this;

            ts.forEachChild(s, (node: ts.Node): void => {

                if (ts.isMethodDeclaration(node)) {

                    v.classMethod(node, program);

                }

            });

        }

        public classConstructor(s: ts.ConstructorDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let p: ts.ClassDeclaration = s.parent as ts.ClassDeclaration;
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            this.level(-1)
            this.out("public:\n");
            this.level();
            this.out(psymbol.name);
            this.out("(");

            var vs: string[] = [];

            for (let param of s.parameters) {

                let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                let name = checker.getSymbolAtLocation(param.name)!;
                vs.push(define(name.name, type, program, this._options));
            }

            this.out(vs.join(","));

            this.out(");\n\n");
        }

        public classDefaultConstructor(p: ts.ClassDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let psymbol = checker.getSymbolAtLocation(p.name!)!;

            this.level(-1)
            this.out("public:\n");
            this.level();
            this.out(psymbol.name);
            this.out("(");

            this.out(");\n\n");
        }

        public class(s: ts.ClassDeclaration, program: ts.Program): void {

            this.classStart(s, program);

            let v = this;
            var hasConstructor = false;

            ts.forEachChild(s, (node: ts.Node): void => {

                if (ts.isPropertyDeclaration(node)) {
                    v.classProperty(node, program);
                } else if (ts.isGetAccessorDeclaration(node)) {
                    v.classGetter(node, program, true);
                } else if (ts.isSetAccessorDeclaration(node)) {
                    v.classSetter(node, program, true);
                } else if (ts.isMethodDeclaration(node)) {
                    v.classMethod(node, program);
                } else if (ts.isConstructorDeclaration(node)) {
                    v.classConstructor(node, program);
                    hasConstructor = true;
                }

            });

            if (!hasConstructor) {
                this.classDefaultConstructor(s, program);
            }

            this.classEnd();

        }

        public interfaceStart(node: ts.InterfaceDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();

            let name = checker.getSymbolAtLocation(node.name)!;

            this.level();
            this.out("class ");
            this.out(name.name);
            this.heritageClauses(node.heritageClauses, false);
            this.out(" {\n");
            this._level++;
            this.level(-1);
            this.out("public:\n");

            console.info("[interface]", name.name, ">>");

        }

        public interfaceEnd() {
            console.info("[interface] <<");
            this._level--;
            this.level();
            this.out("};\n\n");
        }

        public interfaceObject(name: string, key: string, value: string): void {
            this.level();
            this.out("typedef ");
            this.out(this._options.kk);
            this.out("::Map<");
            this.out(key);
            this.out(",");
            this.out(value);
            this.out("> ");
            this.out(name);
            this.out(";\n\n");
        }

        public interfaceGetter(s: ts.PropertySignature, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);

            this.level();
            this.out("virtual ")
            this.out(getter(name.name, type, program, this._options));
            this.out(" = 0;\n");

        }

        public interfaceSetter(s: ts.PropertySignature, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);

            this.level();
            this.out("virtual ")
            this.out(setter(getSetSymbol(name.name), "v", type, program, this._options));
            this.out(" = 0;\n");

        }

        public interfaceProperty(s: ts.PropertySignature, program: ts.Program): void {

            var readonly = false;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
                    if (element.kind == ts.SyntaxKind.ReadonlyKeyword) {
                        readonly = true;
                    }
                }
            }

            this.interfaceGetter(s, program);

            if (!readonly) {
                this.interfaceSetter(s, program);
            }

        }

        public interfacePropertys(s: ts.InterfaceDeclaration, program: ts.Program): void {

            let v = this;

            ts.forEachChild(s, (node: ts.Node): void => {

                if (ts.isPropertySignature(node)) {

                    v.interfaceProperty(node, program);

                }

            });

        }

        public interfaceMethod(s: ts.MethodSignature, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type!,checker);
            let symbol = checker.getSymbolAtLocation(s.name)!;

            this.level();
            this.out("virtual ");
            this.out(type === undefined ? "void " + symbol.name : define(symbol.name, type, program, this._options));
            this.out("(");

            if (s.parameters !== undefined) {
                var dot = "";
                for (let param of s.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                    this.out(dot);
                    this.out(define(name.name, type, program, this._options));
                    dot = ",";
                }
            }

            this.out(") = 0;\n");
        }

        public interfaceMethods(s: ts.InterfaceDeclaration, program: ts.Program): void {

            let v = this;

            ts.forEachChild(s, (node: ts.Node): void => {

                if (ts.isMethodSignature(node)) {

                    v.interfaceMethod(node, program);

                }

            });

        }

        public interface(s: ts.InterfaceDeclaration, program: ts.Program): void {

            var index: ts.IndexSignatureDeclaration | undefined;

            ts.forEachChild(s, (node: ts.Node): void => {
                if (ts.isIndexSignatureDeclaration(node)) {
                    index = node;
                }
            });

            if (index === undefined) {

                this.interfaceStart(s, program);

                let v = this;

                ts.forEachChild(s, (node: ts.Node): void => {

                    if (ts.isPropertySignature(node)) {

                        v.interfaceProperty(node, program);

                    } else if (ts.isMethodSignature(node)) {
                        v.interfaceMethod(node, program);
                    }

                });

                this.interfaceEnd();

            } else {
                let checker = program.getTypeChecker();
                let name = checker.getSymbolAtLocation(s.name)!;
                var key: ts.Type | undefined;
                let type = index.type === undefined ? undefined : getTypeAtLocation(index.type,checker);
                for (let param of index.parameters) {
                    let pType = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                    key = pType;
                    break;
                }
                this.interfaceObject(name.name, getType(key, this._options), getType(type, this._options));
            }

        }

        public function(s: ts.FunctionDeclaration, program: ts.Program): void {

            if (s.name === undefined) {
                return;
            }

            let checker = program.getTypeChecker();
            let symbol = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type!,checker);

            this.level();

            if (type !== undefined) {
                this.out(define(symbol.name, type, program, this._options));
            } else {
                this.out("void ");
                this.out(symbol.name);
            }

            this.out("(");

            if (s.parameters !== undefined) {
                var dot = "";
                for (let param of s.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                    this.out(dot);
                    this.out(define(name.name, type, program, this._options));
                    dot = ",";
                }
            }

            this.out(");\n\n");

        }



        public implementGetter(s: ts.PropertyDeclaration | ts.GetAccessorDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);
            let p: ts.ClassDeclaration = s.parent as ts.ClassDeclaration;
            let pname = checker.getSymbolAtLocation(p.name!)!;
            var isPublic = true;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        isPublic = false;
                        break;
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        isPublic = false;
                        break;
                    }
                }
            }

            this.level();
            this.out(getter(pname.name + "::" + name.name, type, program, this._options));
            this.out("{\n");

            this._level++;

            if (ts.isPropertyDeclaration(s)) {

                this.level()
                this.out("return ");
                if (isPublic) {
                    this.out("_");
                }
                this.out(name.name);

                if (type !== undefined && (isFunctionType(type) || isObjectType(type))) {
                    this.out(".as();\n");
                } else {
                    this.out(";\n");
                }

            } else if (s.body !== undefined) {
                this.body(s.body, program, p);
            }

            this._level--;

            this.level();
            this.out("}\n\n");
        }

        public implementSetter(s: ts.PropertyDeclaration | ts.SetAccessorDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name)!;
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);
            let p: ts.ClassDeclaration = s.parent as ts.ClassDeclaration;
            let pname = checker.getSymbolAtLocation(p.name!)!;
            var isPublic = true;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword) {
                        isPublic = false;
                        break;
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword) {
                        isPublic = false;
                        break;
                    }
                }
            }

            if (ts.isPropertyDeclaration(s)) {

                this.level();
                this.out(setter(pname.name + "::" + getSetSymbol(name.name), "__newValue__", type, program, this._options));
                this.out("{\n");

                this._level++;

                this.level()
                this.out("this->");
                if (isPublic) {
                    this.out("_");
                }
                this.out(name.name);
                this.out(" = __newValue__ ;\n");
                this._level--;

                this.level();
                this.out("}\n\n");

            } else {

                this.level();

                this.out(type === undefined ? "void " + name.name : define(name.name, type, program, this._options));
                this.out("(");

                if (s.parameters !== undefined) {
                    var dot = "";
                    for (let param of s.parameters) {
                        let name = checker.getSymbolAtLocation(param.name)!;
                        let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                        this.out(dot);
                        this.out(define(name.name, type, program, this._options));
                        dot = ",";
                    }
                }

                this.out("){\n");

                this._level++;

                if (s.body !== undefined) {
                    this.body(s.body, program, p);
                }

                this._level--;

                this.level();
                this.out("}\n\n");

            }

        }

        public implementProperty(s: ts.PropertyDeclaration, program: ts.Program): void {

            var readonly = false;
            var isPublic = true;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
                    if (element.kind == ts.SyntaxKind.ReadonlyKeyword) {
                        readonly = true;
                    } else if (element.kind == ts.SyntaxKind.ProtectedKeyword || element.kind == ts.SyntaxKind.PrivateKeyword) {
                        isPublic = false;
                    }
                }
            }

            if (isPublic) {

                this.implementGetter(s, program);

                if (!readonly) {
                    this.implementSetter(s, program);
                }

            }


        }

        public implementMethod(s: ts.MethodDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);
            let name = checker.getSymbolAtLocation(s.name)!;
            let p: ts.ClassDeclaration = s.parent as ts.ClassDeclaration;
            let pname = checker.getSymbolAtLocation(p.name!)!;

            this.level();
            this.out(define(pname.name + "::" + name.name, type, program, this._options));
            this.out("(");

            if (s.parameters !== undefined) {
                var dot = "";
                for (let param of s.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = getTypeAtLocation(param.type!,checker);
                    this.out(dot);
                    this.out(define(name.name, type, program, this._options));
                    dot = ",";
                }
            }

            this.out(") {\n");

            if (s.body !== undefined) {
                this._level++;
                this.body(s.body, program, p);
                this._level--;
            }

            this.level();
            this.out("}\n\n");

        }

        public implementClass(s: ts.ClassDeclaration, program: ts.Program): void {

            let v = this;
            var hasConstructor = false;

            ts.forEachChild(s, (node: ts.Node): void => {

                if (ts.isPropertyDeclaration(node)) {
                    v.implementProperty(node, program);
                } else if (ts.isGetAccessorDeclaration(node)) {
                    v.implementGetter(node, program);
                } else if (ts.isSetAccessorDeclaration(node)) {
                    v.implementSetter(node, program);
                } else if (ts.isMethodDeclaration(node)) {
                    v.implementMethod(node, program);
                } else if (ts.isConstructorDeclaration(node)) {
                    v.implementConstructor(node, program);
                    hasConstructor = true;
                }

            });

            if (!hasConstructor) {
                this.implementDefaultConstructor(s, program);
            }
        }

        public implementFunction(s: ts.FunctionDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let name = checker.getSymbolAtLocation(s.name!)!;

            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type!,checker);

            this.level();

            if (type !== undefined) {
                this.out(define(name.name, type, program, this._options));
            } else {
                this.out("void ");
                this.out(name.name);
            }

            this.out("(");

            if (s.parameters !== undefined) {
                var dot = "";
                for (let param of s.parameters) {
                    let name = checker.getSymbolAtLocation(param.name)!;
                    let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                    this.out(dot);
                    this.out(define(name.name, type, program, this._options));
                    dot = ",";
                }
            }

            this.out(") {\n");

            if (s.body !== undefined) {
                this._level++;
                this.body(s.body, program, undefined);
                this._level--;
            }

            this.level();
            this.out("}\n\n");
        }

        public implementInitializer(s: ts.PropertyDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();

            let name = checker.getSymbolAtLocation(s.name)!
            let type = s.type === undefined ? undefined : getTypeAtLocation(s.type,checker);
            let p: ts.ClassDeclaration = s.parent as ts.ClassDeclaration;

            var isPublic = true;

            if (s.modifiers !== undefined) {
                for (let element of s.modifiers) {
                    if (element.kind == ts.SyntaxKind.PrivateKeyword || ts.SyntaxKind.ProtectedKeyword) {
                        isPublic = false;
                        break;
                    }
                }
            }

            if (s.initializer !== undefined && ts.isObjectLiteralExpression(s.initializer)) {

                if (type === undefined || !type.isClassOrInterface()) {
                    return;
                }

                let e = s.initializer;

                this.level();
                this.out("{\n");
                {
                    this.level(1);
                    this.out(type.symbol.name);
                    this.out(" * __V__ = new ");
                    this.out(type.symbol.name);
                    this.out("();\n");

                    for (let prop of e.properties) {
                        if (ts.isPropertyAssignment(prop)) {
                            let n = checker.getSymbolAtLocation(prop.name)!
                            this.level(1);
                            this.out("v->");
                            this.out(getSetSymbol(n.name));
                            this.out("(");
                            this.expression(prop.initializer, program, p);
                            this.out(");\n");
                        }
                    }

                    this.level(1);
                    this.out("this->");

                    if (isPublic) {
                        this.out("_");
                    }

                    this.out(name.name);
                    this.out(" = __V__;\n");

                }

                this.level();
                this.out("}\n");

            } else if (s.initializer !== undefined) {
                this.level();
                if (isPublic) {
                    this.out("this->_");
                    this.out(name.name);
                    this.out("=");
                } else {
                    this.out("this->");
                    this.out(name.name);
                    this.out("=");
                }
                this.expression(s.initializer, program, p);
                this.out(";\n");
            } else {
                this.level();
                if (isPublic) {
                    this.out("this->_");
                    this.out(name.name);
                    this.out("=");
                } else {
                    this.out("this->");
                    this.out(name.name);
                    this.out("=");
                }
                this.out(getDefaultValue(type, this._options));
                this.out(";\n");
            }


        }

        public implementDefaultConstructor(p: ts.ClassDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let pname = checker.getSymbolAtLocation(p.name!)!;

            this.level();
            this.out(pname.name);
            this.out("::");
            this.out(pname.name);
            this.out("(");

            this.out(") {\n");

            this._level++;

            let v = this;

            ts.forEachChild(p, (node: ts.Node): void => {

                if (ts.isPropertyDeclaration(node)) {
                    v.implementInitializer(node, program);
                }

            });

            this._level--;

            this.level();
            this.out("}\n\n");

        }

        public implementConstructor(s: ts.ConstructorDeclaration, program: ts.Program): void {

            let checker = program.getTypeChecker();
            let p: ts.ClassDeclaration = s.parent as ts.ClassDeclaration;
            let pname = checker.getSymbolAtLocation(p.name!)!;

            this.level();
            this.out(pname.name);
            this.out("::");
            this.out(pname.name);
            this.out("(");

            var vs: string[] = [];

            for (let param of s.parameters) {
                let type = param.type === undefined ? undefined : getTypeAtLocation(param.type,checker);
                let name = checker.getSymbolAtLocation(param.name)!;
                vs.push(define(name.name, type, program, this._options));
            }

            this.out(vs.join(","));

            this.out(") {\n");

            this._level++;

            let v = this;

            ts.forEachChild(p, (node: ts.Node): void => {

                if (ts.isPropertyDeclaration(node)) {
                    v.implementInitializer(node, program);
                }

            });

            if (s.body !== undefined) {
                this.body(s.body, program, p);
            }

            this._level--;

            this.level();
            this.out("}\n\n");

        }

        public expression(e: ts.Expression, program: ts.Program, isa: ts.ClassDeclaration | undefined): void {

            let checker = program.getTypeChecker();

            if (ts.isPropertyAccessExpression(e)) {

                let name = checker.getSymbolAtLocation(e.name)!;

                if (e.expression.kind == ts.SyntaxKind.ThisKeyword && isa !== undefined) {

                    var property: ts.PropertyDeclaration | undefined;

                    ts.forEachChild(isa, (node: ts.Node): void => {

                        if (ts.isPropertyDeclaration(node)) {

                            let n = checker.getSymbolAtLocation(node.name)!;

                            if (n.name == name.name) {
                                property = node;
                            }

                        }
                    });

                    if (property !== undefined) {

                        let type = property.type === undefined ? undefined : getTypeAtLocation(property.type!,checker);

                        if (isPublicProperty(property)) {
                            this.out("this->")
                            let name = checker.getSymbolAtLocation(e.name)!;
                            this.out("_");
                            this.out(name.name);
                        } else {
                            this.out("this->")
                            let name = checker.getSymbolAtLocation(e.name)!;
                            this.out(name.name);
                        }

                        if (type != undefined) {
                            if ((type.flags & ts.TypeFlags.Union) != 0) {
                                type = type.getNonNullableType();
                            }
                            if ((type.flags & ts.TypeFlags.Object) != 0) {
                                this.out(".as()");
                            }
                        }

                    } else {
                        this.out("this->")
                        this.out(name.name);
                        this.out("()");
                    }

                } else {
                    this.expression(e.expression, program, isa);
                    this.out("->")

                    this.out(name.name);
                    this.out("()");
                }
            } else if (ts.isBinaryExpression(e)) {
                this.expression(e.left, program, isa);
                this.out(e.operatorToken.getText());
                this.expression(e.right, program, isa);
            } else if (ts.isIdentifier(e)) {
                if (e.text == "undefined" || e.text == "null") {
                    this.out("nullptr");
                } else {
                    this.out(e.text);
                }
            } else if (ts.isCallExpression(e)) {
                if (ts.isPropertyAccessExpression(e.expression)) {
                    let name = checker.getSymbolAtLocation(e.expression.name)!;
                    this.expression(e.expression.expression, program, isa);
                    this.out("->");
                    this.out(name.name);

                    this.out("(");

                    var vs: string[] = [];

                    for (let arg of e.arguments) {
                        this.expression(arg, program, isa);
                    }

                    this.out(vs.join(","));

                    this.out(")");

                } else {

                    this.out("(*(")
                    this.expression(e.expression, program, isa);
                    this.out("))(");

                    var vs: string[] = [];

                    for (let arg of e.arguments) {
                        this.expression(arg, program, isa);
                    }

                    this.out(vs.join(","));

                    this.out(")");

                }

            } else if (ts.isNewExpression(e)) {

                this.out("new ")
                this.expression(e.expression, program, isa);

                this.out("(");

                var dot = "";

                if (e.arguments != undefined) {
                    for (let arg of e.arguments) {
                        this.out(dot);
                        this.expression(arg, program, isa);
                        dot = ",";
                    }
                }
                this.out(")");
            } else if (ts.isNumericLiteral(e)) {
                this.out(e.getText());
            } else if (ts.isStringLiteral(e)) {
                this.out(JSON.stringify(e.text));
            } else if (e.kind == ts.SyntaxKind.ThisKeyword) {
                this.out("this");
            } else if (e.kind == ts.SyntaxKind.FalseKeyword) {
                this.out("false");
            } else if (e.kind == ts.SyntaxKind.TrueKeyword) {
                this.out("true");
            } else if (e.kind == ts.SyntaxKind.UndefinedKeyword) {
                this.out("nullptr");
            } else if (e.kind == ts.SyntaxKind.NullKeyword) {
                this.out("nullptr");
            } else if(ts.isPostfixUnaryExpression(e)) {
                this.expression(e.operand,program,isa);
                if(e.operator == ts.SyntaxKind.PlusPlusToken) {
                    this.out("++");
                } else {
                    this.out("--");
                }
            } else if(ts.isPrefixUnaryExpression(e)) {
                if(e.operator == ts.SyntaxKind.PlusPlusToken) {
                    this.out("++");
                } else {
                    this.out("--");
                }
                this.expression(e.operand,program,isa);
            } else {
                this.out(e.getText());
                console.info("[EX]", e.kind, e.getText());
            }

        }

        public statement(st: ts.Statement, program: ts.Program, isa: ts.ClassDeclaration | undefined): void {

            let checker = program.getTypeChecker();

            if (ts.isReturnStatement(st)) {
                this.level();
                this.out("return ");
                if (st.expression !== undefined) {
                    this.expression(st.expression, program, isa);
                }
                this.out(";\n");
            } else if (ts.isIfStatement(st)) {
                this.level();
                this.out("if(");
                this.expression(st.expression, program, isa);
                this.out(") ");
                this.statement(st.thenStatement, program, isa);
                if (st.elseStatement !== undefined) {
                    this.level();
                    this.out("else ");
                    this.statement(st.elseStatement, program, isa);
                }
            } else if (ts.isForStatement(st)) {
                this.level();
                this.out("for(");
                if (st.initializer !== undefined) {
                    if (ts.isVariableDeclarationList(st.initializer)) {

                        var type: ts.Type | undefined;
                        var dot = " ";

                        for (let v of st.initializer.declarations) {
                            type = getTypeAtLocation(v.type,checker);
                            this.out(define("", type, program, this._options));
                            break;
                        }

                        for (let v of st.initializer.declarations) {
                            let n = checker.getSymbolAtLocation(v.name)!;
                            this.out(dot);
                            this.out(n.name);
                            if (v.initializer !== undefined) {
                                this.out(" = (");
                                this.out(define("", type, program, this._options));
                                this.out(")");
                                this.expression(v.initializer, program, isa);
                            }
                            dot = ",";
                        }

                    } else {
                        this.expression(st.initializer, program, isa);
                    }
                }
                this.out(";");
                if (st.condition !== undefined) {
                    this.expression(st.condition, program, isa);
                }
                this.out(";");
                if (st.incrementor !== undefined) {
                    this.expression(st.incrementor, program, isa);
                }
                this.out(") ");
                this.statement(st.statement, program, isa);
            } else if (ts.isWhileStatement(st)) {
                this.level();
                this.out("while(");
                this.expression(st.expression, program, isa);
                this.out(") ");
                this.statement(st.statement, program, isa);
            } else if (ts.isSwitchStatement(st)) {
                this.level();
                this.out("switch(");
                this.expression(st.expression, program, isa);
                this.out(") {\n");
                for (let clause of st.caseBlock.clauses) {
                    if (ts.isCaseClause(clause)) {
                        this.level();
                        this.out("case ");
                        this.expression(clause.expression,program,isa);
                        this.out(" :\n");
                        this._level++;
                        for (let s of clause.statements) {
                            this.statement(s, program, isa);
                        }
                        this._level--;
                    } else {
                        this.level();
                        this.out("default:\n");
                        this._level++;
                        for (let s of clause.statements) {
                            this.statement(s, program, isa);
                        }
                        this._level--;
                    }
                }
                this.level();
                this.out("}\n");
            } else if (ts.isBlock(st)) {
                if (this._isNewLine) {
                    this.level();
                }
                this.out("{\n");
                this._level++;
                for (let v of st.statements) {
                    this.statement(v, program, isa);
                }
                this._level--;
                this.level();
                this.out("}\n");
            } else if (ts.isExpressionStatement(st)) {
                this.level();
                this.expression(st.expression, program, isa);
                this.out(";\n");
            } else if (ts.isVariableStatement(st)) {
                for (let v of st.declarationList.declarations) {
                    this.level();
                    let n = checker.getSymbolAtLocation(v.name)!;
                    let t = v.type === undefined ? undefined : getTypeAtLocation(v.type,checker);
                    this.out(define(n.name, t, program, this._options));
                    if (v.initializer !== undefined) {
                        this.out(" = (");
                        this.out(define("", t, program, this._options));
                        this.out(")");
                        this.expression(v.initializer, program, isa);
                    }
                    this.out(";\n");
                }
            } else if(ts.isBreakStatement(st)) {
                this.level();
                this.out("break;\n");
            } else if(ts.isContinueStatement(st)) {
                this.level();
                this.out("continue;\n");
            } else {
                console.info("[ST]", st.kind, st.getText());
            }
        }

        public body(body: ts.FunctionBody, program: ts.Program, isa: ts.ClassDeclaration | undefined): void {

            for (let st of body.statements) {
                this.statement(st, program, isa);
            }
        }

        public file(type: FileType, file: ts.SourceFile, program: ts.Program, name: string): void {

            if (type == FileType.Header) {

                let fileName = name.replace("/", "_").toLocaleUpperCase();

                this.out("#ifndef _" + fileName + "_H\n");
                this.out("#define _" + fileName + "_H\n\n");

                this.include(this._options.kk + "/" + this._options.kk + ".h", true);

                this.out("\n");

                let v = this;
                let checker = program.getTypeChecker();

                function each(node: ts.Node): void {
                    if (ts.isModuleDeclaration(node)) {
                        let name = checker.getSymbolAtLocation(node.name)!;
                        v.namespaceStart(name.name);
                        if (node.body !== undefined) {
                            ts.forEachChild(node.body, each);
                        }
                        v.namespaceEnd();
                    } else if (ts.isInterfaceDeclaration(node)) {
                        v.interface(node, program);
                    } else if (ts.isClassDeclaration(node) && node.name !== undefined) {
                        v.class(node, program);
                    } else if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
                        v.function(node, program);
                    }
                }

                ts.forEachChild(file, each);

                this.out("#endif\n\n");

            } else {

                this.include(name + ".h");

                this.out("\n");

                let v = this;
                let checker = program.getTypeChecker();

                function each(node: ts.Node): void {
                    if (ts.isModuleDeclaration(node)) {
                        let name = checker.getSymbolAtLocation(node.name)!;
                        v.namespaceStart(name.name);
                        if (node.body !== undefined) {
                            ts.forEachChild(node.body, each);
                        }
                        v.namespaceEnd();
                    } else if (ts.isClassDeclaration(node) && node.name !== undefined) {
                        v.implementClass(node, program);
                    } else if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
                        v.implementFunction(node, program);
                    }
                }

                ts.forEachChild(file, each);


            }

        }


    };

}