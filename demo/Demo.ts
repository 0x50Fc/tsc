
namespace kk {

    type int = number;
    type int32 = number;
    type int64 = number;

    export interface IDemo {

        readonly title: string;
        readonly version: int;
        readonly output: boolean;
        readonly ondone: ((name: string) => string | undefined) | undefined;

        exec(name: string): string | undefined;
    }

    export class Demo implements IDemo {

        title: string;
        version: int;
        output: boolean;
        ondone: ((name: string) => string | undefined) | undefined;
        exec(name: string): string | undefined {
            if (this.ondone != undefined) {
                return this.ondone(name);
            }
        }

    }
}
