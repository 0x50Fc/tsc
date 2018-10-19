#include "Main.h"

kk::Int main() {
	kk::IDemo * demo = (kk::IDemo *)new kk::Demo("OK",2);
	demo->exec("done");
	console->info("Hello World");
	return 0;
}

