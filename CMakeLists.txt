cmake_minimum_required(VERSION 2.8.8)

project(sozi)

################################################################################
### Compute the sozi version with the current date
################################################################################

if(WIN32)
    # FIXME
    execute_process(COMMAND "cmd" " /C date /T" OUTPUT_VARIABLE SOZI_VERSION)
    string(REGEX REPLACE "(..)/(..)/..(..).*" "\\3\\2\\1" SOZI_VERSION ${SOZI_VERSION})
elseif(UNIX)
    execute_process(COMMAND "date" "+%y.%m-%d%H%M%S" OUTPUT_VARIABLE SOZI_VERSION)
    string(REPLACE "\n" "" SOZI_VERSION ${SOZI_VERSION})
else()
    message(SEND_ERROR "date not implemented")
    set(SOZI_VERSION 000000)
endif()

#message(STATUS "SOZI_VERSION=${SOZI_VERSION}")

################################################################################
### Recurse to subfolders
################################################################################

add_subdirectory(doc)
add_subdirectory(player)
add_subdirectory(editors)

################################################################################
### Packaging
################################################################################

set(CPACK_PACKAGE_NAME                "sozi")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Sozi is a zooming presentation program")
set(CPACK_PACKAGE_VERSION             "${SOZI_VERSION}")

set(CPACK_GENERATOR                   "TGZ")
set(CPACK_ARCHIVE_COMPONENT_INSTALL   "ON")
set(CPACK_COMPONENTS_GROUPING         "IGNORE")

include(CPack)

