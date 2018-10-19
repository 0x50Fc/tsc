

cmake_minimum_required(VERSION 3.4.1)

set(CMAKE_CXX_FLAGS "-g -O3 -Wno-c++11-extensions")

add_library(demo
            STATIC
            Demo.cc
            Main.cc
            ../kk/kk.cc)

include_directories(
            ./
            ../
            )

set_target_properties(demo PROPERTIES
    CXX_STANDARD 11
)

link_libraries(demo)

add_executable(main demo)

