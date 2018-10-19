
import "../kk/kk";

export namespace demo {

    interface PropertyMap {
        [key: number]: string
    }

    export interface IDemo {

        /**
         * 标题
         */
        readonly title: string;
        /**
         * 版本号
         */
        readonly version: kk.int;
        output: boolean;
        propertys: PropertyMap;
        parent: IDemo | kk.weak;
        ondone: ((name: string) => string) | undefined;

        exec(name: string): string;
    }

    export class Demo implements IDemo {

        parent: IDemo | kk.weak;

        private _title: string = "demo";
        private _version: number = 1.0;

        propertys: PropertyMap = {};

        public get title(): string {
            return this._title;
        }

        public get version(): kk.int {
            return this._version;
        }

        output: boolean = false;
        ondone: ((name: string) => string) | undefined;
        exec(name: string): string {
            for (var i: kk.int = 0, n: kk.int = 10; i < n; i++) {

            }
            var v: kk.int = 0;
            switch (v) {
                case 1:
                    break;
                default:
                    break;
            }
            this.ondone = (name: string): string => {
                return name + "_" + v;
            }
            return this.done(name);
        }

        done(name: string): string {
            let fn: ((name: string) => string) | undefined = this.ondone;
            if (fn != undefined) {
                return fn(name);
            }
            return "";
        }

        constructor(title: string, version: kk.int) {
            this._title = title;
            this._version = version;
        }

    }

    export function createDemo(title: string, version: kk.int): IDemo {
        return new Demo(title, version);
    }

}
