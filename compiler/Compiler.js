"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("typescript"));
function getType(type, options) {
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
        }
        else {
            return options.kk + "::Function *";
        }
    }
    throw new Error("[TYPE] " + type.flags.toString());
}
exports.getType = getType;
function getSetSymbol(name) {
    return "set" + name.substr(0, 1).toLocaleUpperCase() + name.substr(1);
}
exports.getSetSymbol = getSetSymbol;
function isPublicProperty(node) {
    if (node.modifiers !== undefined) {
        for (let m of node.modifiers) {
            if (m.kind == ts.SyntaxKind.PrivateKeyword || m.kind == ts.SyntaxKind.ProtectedKeyword) {
                return false;
            }
        }
    }
    return true;
}
exports.isPublicProperty = isPublicProperty;
//# sourceMappingURL=Compiler.js.map