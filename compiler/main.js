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
const FileCompiler_1 = require("./FileCompiler");
function compile(fileNames, options) {
    console.info(fileNames);
    let program = ts.createProgram(fileNames, options);
    for (let sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) {
            continue;
        }
        console.info(sourceFile.fileName, ">>");
        FileCompiler_1.fileCompile(sourceFile, program, options);
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
//# sourceMappingURL=main.js.map