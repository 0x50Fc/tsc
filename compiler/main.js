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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CCompiler_1 = require("./CCompiler");
function compile(stconfig) {
    console.info(stconfig);
    let data = ts.readConfigFile(stconfig, (path) => {
        return fs.readFileSync(path, { encoding: 'utf8' });
    });
    if (data.error !== undefined) {
        throw new Error(data.error.messageText);
    }
    let config = data.config;
    let files = [];
    let basedir = path.dirname(stconfig);
    if (config.files !== undefined) {
        for (let p of config.files) {
            files.push(path.normalize(path.join(basedir, p)));
        }
    }
    let options = config.compilerOptions;
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
            let out = [];
            let cc = new CCompiler_1.CC.Compiler(options, (text) => {
                out.push(text);
            });
            cc.file(CCompiler_1.CC.FileType.Header, file, program, name);
            fs.writeFileSync(p, out.join(''), {
                encoding: 'utf8'
            });
        }
        {
            let p = path.join(dirname, basename + ".cc");
            let out = [];
            let cc = new CCompiler_1.CC.Compiler(options, (text) => {
                out.push(text);
            });
            cc.file(CCompiler_1.CC.FileType.Source, file, program, name);
            fs.writeFileSync(p, out.join(''), {
                encoding: 'utf8'
            });
        }
    }
    process.exit();
}
compile(process.argv[2]);
//# sourceMappingURL=main.js.map