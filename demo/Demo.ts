

namespace kk {

    export type int = number;
    export type int32 = number;
    export type int64 = number;

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
        readonly version: int;
        output: boolean;
        propertys: PropertyMap;
        ondone: ((name: string) => string) | undefined;

        exec(name: string): string;
    }

    export class Demo implements IDemo {

        private _title: string = "demo";
        private _version: number = 1.0;

        propertys: PropertyMap = {};

        public get title(): string {
            return this._title;
        }

        public get version(): int {
            return this._version;
        }

        output: boolean = false;
        ondone: ((name: string) => string) | undefined;
        exec(name: string): string {
            for (var i: int = 0, n: int = 10; i < n; i++) {

            }
            var v: int = 0;
            switch (v) {
                case 1:
                    break;
                default:
                    break;
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

        constructor(title: string, version: int) {
            this._title = title;
            this._version = version;
        }

    }

    export function createDemo(title: string, version: int): IDemo {
        return new Demo(title, version);
    }

}
