CMAKE_MINIMUM_REQUIRED(VERSION 2.6)

PROJECT(sozi)

################################################################################
### Compute the sozi version with the current date
################################################################################

IF (WIN32)
    # FIXME
    EXECUTE_PROCESS(COMMAND "cmd" " /C date /T" OUTPUT_VARIABLE SOZI_VERSION)
    STRING(REGEX REPLACE "(..)/(..)/..(..).*" "\\3\\2\\1" SOZI_VERSION ${SOZI_VERSION})
ELSEIF(UNIX)
    EXECUTE_PROCESS(COMMAND "date" "+%y.%m-%d%H%M%S" OUTPUT_VARIABLE SOZI_VERSION)
    STRING(REPLACE "\n" "" SOZI_VERSION ${SOZI_VERSION})
ELSE (WIN32)
    MESSAGE(SEND_ERROR "date not implemented")
    SET(SOZI_VERSION 000000)
ENDIF (WIN32)

#MESSAGE(STATUS "SOZI_VERSION=${SOZI_VERSION}")

################################################################################
### Recurse to subfolders
################################################################################

ADD_SUBDIRECTORY(doc)
ADD_SUBDIRECTORY(player)
ADD_SUBDIRECTORY(editors)

################################################################################
### Packaging
################################################################################

SET(CPACK_PACKAGE_NAME                "sozi")
SET(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Sozi is a zooming presentation program")
SET(CPACK_PACKAGE_VERSION             "${SOZI_VERSION}")

SET(CPACK_GENERATOR                   "TGZ")
SET(CPACK_ARCHIVE_COMPONENT_INSTALL   "ON")
SET(CPACK_COMPONENTS_GROUPING         "IGNORE")

INCLUDE(CPack)

