#include "Main.h"

kk::Int main() {
	kk::Any demo = (kk::Any)new demo::Demo("OK",2);
	demo->exec("done");
	console->info("Hello World");
	return 0;
}

