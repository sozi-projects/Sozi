################################################################################
#  Type of minifier option
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
#  Build sozi player
################################################################################

# the order is important because of depencies
SET(sozi_js                  ${CMAKE_CURRENT_SOURCE_DIR}/js/events.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/framelist.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/actions.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/animation.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/player.js  
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/display.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/document.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/location.js 
                             ${CMAKE_CURRENT_SOURCE_DIR}/js/sozi.js)

SET(sozi_css                 ${CMAKE_CURRENT_SOURCE_DIR}/css/sozi.css)


ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.version
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/version sozi.version
)

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.js
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minifier ${minifier} sozi.js ${sozi_js}
)

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.css
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minifier ${minifier} sozi.css ${sozi_css}
)

SET(sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.version
                      ${CMAKE_CURRENT_BINARY_DIR}/sozi.js 
                      ${CMAKE_CURRENT_BINARY_DIR}/sozi.css)

### if build extra ###

SET(sozi_extras_addvideo_js  ${CMAKE_CURRENT_SOURCE_DIR}/js/sozi_extras_addvideo.js) 

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi_extras_addvideo.js
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/minifier ${minifier} sozi_extras_addvideo.js ${sozi_extras_addvideo_js}
)
LIST(APPEND sozi_player_files ${CMAKE_CURRENT_BINARY_DIR}/sozi_extras_addvideo.js)


ADD_CUSTOM_TARGET(sozi_player ALL DEPENDS ${sozi_player_files})

INSTALL(FILES ${sozi_player_files}
              DESTINATION share/sozi)

################################################################################
#  Build sozi player headers
################################################################################

ADD_CUSTOM_COMMAND(
  OUTPUT    sozi.h
  DEPENDS   ${sozi_player_files}
  COMMAND   ${CMAKE_CURRENT_SOURCE_DIR}/tools/header sozi.h ${sozi_player_files}
)

ADD_CUSTOM_TARGET(sozi_header ALL DEPENDS sozi.h)

SET(sozi_header_files ${CMAKE_CURRENT_BINARY_DIR}/sozi.h)

INSTALL(FILES ${sozi_header_files}
              DESTINATION include)




