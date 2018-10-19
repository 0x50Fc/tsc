import "./Demo"

export function main():kk.int {

    let demo:kk.IDemo = new kk.Demo("OK",2);

    demo.exec("done");

    console.info("Hello World");

    return 0;
}
