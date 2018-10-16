

cmake_minimum_required(VERSION 3.4.1)

add_library(demo
            STATIC
            Demo.cc)

include_directories(
            ./
            ../
            )

set_target_properties(demo PROPERTIES
    CXX_STANDARD 11
)


