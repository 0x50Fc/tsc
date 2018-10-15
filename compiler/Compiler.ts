
import * as ts from "typescript";
import { debug } from "util";

export interface CompilerOptions extends ts.CompilerOptions {
    kk: string
}


export function getType(type: ts.Type, options: CompilerOptions): string {
    if ((type.flags & ts.TypeFlags.String) != 0) {
        return options.kk + "::String";
    }
    if ((type.flags & ts.TypeFlags.Number) != 0) {
        if (type.aliasSymbol !== undefined) {
            return options.kk + "::" + type.aliasSymbol.name;
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
            return options.kk + "::Function *";
        }
    }
    throw new Error("[TYPE] " + type.flags.toString());
}


export function getSetSymbol(name: string): string {
    return "set" + name.substr(0, 1).toLocaleUpperCase() + name.substr(1);
}

export function isPublicProperty(node: ts.PropertyDeclaration): boolean {

    if (node.modifiers !== undefined) {

        for (let m of node.modifiers) {
            if (m.kind == ts.SyntaxKind.PrivateKeyword || m.kind == ts.SyntaxKind.ProtectedKeyword) {
                return false;
            }
        }
    }
    return true;
}
