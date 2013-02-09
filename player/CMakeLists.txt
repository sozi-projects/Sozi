################################################################################
#
#  Type of minifier option
#
################################################################################

set(MINIFIER_JS "uglifyjs" CACHE FILEPATH "Wich minifier to use for js: yuicompressor, juicer, uglifyjs, sed, cat")
string(TOUPPER ${MINIFIER_JS} MINIFIER_JS_U)

find_program(${MINIFIER_JS_U} ${MINIFIER_JS})
if(${MINIFIER_JS_U}-NOTFOUND)
  message(FATAL_ERROR "${MINIFIER_JS} not found on your system.") 
endif()

set(MINIFIER_CSS "cat" CACHE FILEPATH "Wich minifier to use for css: yuicompressor, juicer, sed, cat")
string(TOUPPER ${MINIFIER_CSS} MINIFIER_CSS_U)

find_program(${MINIFIER_CSS_U} ${MINIFIER_CSS})
if(${MINIFIER_CSS_U}-NOTFOUND)
  message(FATAL_ERROR "${MINIFIER_CSS} not found on your system.") 
endif()

################################################################################
#
#  Build sozi player engine
#
################################################################################

################################################################################
### The sozi_player_files variable contains all output files
################################################################################

set(sozi_player_files "" PARENT_SCOPE)

################################################################################
### The sozi.version output file contains the version string
################################################################################

add_custom_command(
  OUTPUT    sozi.version
  COMMAND   echo ${SOZI_VERSION} > sozi.version
)

list(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.version)

################################################################################
### The sozi.js output file contains the javascript sozi engine
################################################################################

add_custom_command(
  OUTPUT    sozi.js
  DEPENDS   ${sozi_js} tools/minify
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minify
            ${${MINIFIER_JS_U}} 
            sozi.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/sozi.js
)

list(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.js)

################################################################################
### The sozi.css output file contains the sozi style sheet
################################################################################

add_custom_command(
  OUTPUT    sozi.css
  DEPENDS   ${sozi_css} tools/minify
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minify
            ${${MINIFIER_CSS_U}} 
            sozi.css 
            ${CMAKE_CURRENT_SOURCE_DIR}/css/sozi.css
)

list(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.css)

################################################################################
### The sozi_extras_addvideo.js output file contain code for inserting video
################################################################################

add_custom_command(
  OUTPUT    sozi_extras_addvideo.js
  DEPENDS   ${sozi_extras_addvideo_js} tools/minify
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minify 
            ${${MINIFIER_JS_U}} 
            sozi_extras_addvideo.js 
            ${CMAKE_CURRENT_SOURCE_DIR}/js/extras/sozi_extras_addvideo.js
)

list(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi_extras_addvideo.js)

################################################################################
### The player core target
################################################################################

add_custom_target(sozi_player ALL DEPENDS ${sozi_player_files})

install(FILES ${sozi_player_files}
        DESTINATION share/sozi
        COMPONENT player)

### Ugly hack because cmake don't keep PARENT_SCOPE with LIST(APPEND...
set(sozi_player_files ${sozi_player_files} PARENT_SCOPE)

################################################################################
### Some maintainer's targets
################################################################################

find_program(LINT autolint)
if(LINT)
  add_custom_target(verify 
    COMMAND ${LINT} 
            --once 
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  )
endif()

find_program(JSDOC jsdoc)
if(JSDOC)
  add_custom_target(doc
    COMMAND   ${JSDOC} 
              --private --recurse --destination web/api
              ${CMAKE_CURRENT_SOURCE_DIR}/js
  )
endif()

################################################################################
#
#  Build sozi player C headers
#
################################################################################

################################################################################
### The sozi_player_files global variable contains all output files
################################################################################

set(sozi_header_files "" PARENT_SCOPE)

################################################################################
### The sozi.h output file contain binary of the player engine for c integration
################################################################################

add_custom_command(
  OUTPUT    sozi.h
  DEPENDS   ${sozi_player_files}
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/gen_header
            sozi.h 
            ${sozi_player_files}
)

list(APPEND sozi_header_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.h)

################################################################################
### The player header target
################################################################################

add_custom_target(sozi_header ALL DEPENDS ${sozi_header_files})

install(FILES ${sozi_header_files}
        DESTINATION include
        COMPONENT player)

### Ugly hack because cmake don't keep PARENT_SCOPE with LIST(APPEND...
set(sozi_header_files ${sozi_header_files} PARENT_SCOPE)



