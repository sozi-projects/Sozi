################################################################################
#
#  Type of minifier option
#
################################################################################

SET(minifier_type "juicer" CACHE STRING "Wich minifier to use : juicer, yuicompressor, sed")

IF(${minifier_type} STREQUAL "juicer")

  MESSAGE(STATUS "juicer minifier")
  SET(minifier "juicer" CACHE FILEPATH "Path to juicer minifier" )

ELSEIF(${minifier_type} STREQUAL "yuicompressor")

  MESSAGE(STATUS "yuicompressor minifier")
  SET(minifier "yuicompressor-2.4.6.jar" CACHE FILEPATH "Path to yuicompressor minifier")

ELSE()

  MESSAGE(WARNING "Default minifier")
  SET(minifier "sed")

ENDIF()

################################################################################
#
#  Build sozi player engine
#
################################################################################

################################################################################
### The sozi_player_files variable contains all output files
################################################################################

SET(sozi_player_files "" PARENT_SCOPE)

################################################################################
### The sozi.version output file contains the version string
################################################################################

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.version
  COMMAND   echo ${SOZI_VERSION} > sozi.version
)

LIST(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.version)

################################################################################
### The sozi.js output file contains the javascript sozi engine
################################################################################

# The order is important because of dependencies (in case we don't use juicer)
# This list can be obtained by running juicer list player/js/sozi.js
SET(sozi_js ${CMAKE_CURRENT_SOURCE_DIR}/js/module.js
			${CMAKE_CURRENT_SOURCE_DIR}/js/events.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/framenumber.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/framelist.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/animation.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/display.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/player.js  
            ${CMAKE_CURRENT_SOURCE_DIR}/js/actions.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/document.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/location.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/sozi.js)

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.js
  DEPENDS   ${sozi_js}
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minifier ${minifier} sozi.js ${sozi_js}
)

LIST(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.js)

################################################################################
### The sozi.css output file contains the sozi style sheet
################################################################################

SET(sozi_css ${CMAKE_CURRENT_SOURCE_DIR}/css/sozi.css)

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.css
  DEPENDS   ${sozi_css}
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minifier ${minifier} sozi.css ${sozi_css}
)

LIST(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.css)

################################################################################
### The sozi_extras_addvideo.js output file contain code for inserting video
################################################################################

SET(sozi_extras_addvideo_js ${CMAKE_CURRENT_SOURCE_DIR}/js/extras/sozi_extras_addvideo.js) 

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi_extras_addvideo.js
  DEPENDS   ${sozi_extras_addvideo_js}
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minifier ${minifier} sozi_extras_addvideo.js ${sozi_extras_addvideo_js}
)

LIST(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi_extras_addvideo.js)

################################################################################
### The player core target
################################################################################

ADD_CUSTOM_TARGET(sozi_player ALL DEPENDS ${sozi_player_files})

INSTALL(FILES ${sozi_player_files}
        DESTINATION share/sozi
        COMPONENT player)

### Ugly hack because cmake don't keep PARENT_SCOPE with LIST(APPEND...
SET(sozi_player_files ${sozi_player_files} PARENT_SCOPE)

################################################################################
#
#  Build sozi player headers
#
################################################################################

################################################################################
### The sozi_player_files global variable contains all output files
################################################################################

SET(sozi_header_files "" PARENT_SCOPE)

################################################################################
### The sozi.h output file contain binary of the player engine for c integration
################################################################################

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.h
  DEPENDS   ${sozi_player_files}
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/header sozi.h ${sozi_player_files}
)

LIST(APPEND sozi_header_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.h)

################################################################################
### The player header target
################################################################################

ADD_CUSTOM_TARGET(sozi_header ALL DEPENDS ${sozi_header_files})

INSTALL(FILES ${sozi_header_files}
        DESTINATION include
        COMPONENT player)

### Ugly hack because cmake don't keep PARENT_SCOPE with LIST(APPEND...
SET(sozi_header_files ${sozi_header_files} PARENT_SCOPE)



