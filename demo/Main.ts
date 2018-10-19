import "../kk/kk"
import "./Demo"

export function main():kk.int {

    let demo:demo.IDemo = new demo.Demo("OK",2);

    demo.exec("done");

    console.info("Hello World");

    return 0;
}
