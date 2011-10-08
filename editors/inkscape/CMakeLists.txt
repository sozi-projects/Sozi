################################################################################
#
#  The inkscape home or prefix option
#
################################################################################

SET(inkscape_path "$ENV{HOME}/.config/inkscape" CACHE PATH "Path to inkscape extensions dir (${CMAKE_INSTALL_PREFIX}/share/inkscape for global install)")

################################################################################
### The sozi.py output file contains the sozi inkscape integration
################################################################################

ADD_CUSTOM_COMMAND(
   OUTPUT    sozi.py
   COMMAND   sed -e 's/{{SOZI_VERSION}}/$(VERSION)/g' ${CMAKE_CURRENT_SOURCE_DIR}/sozi.py > sozi.py
)

ADD_CUSTOM_COMMAND(
   OUTPUT    sozi_extras_addvideo.py
   COMMAND   sed -e 's/{{SOZI_VERSION}}/$(VERSION)/g' ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_addvideo.py > sozi_extras_addvideo.py
)

SET(sozi_inkscape_files ${CMAKE_CURRENT_SOURCE_DIR}/sozi.inx
                        ${CMAKE_CURRENT_BINARY_DIR}/sozi.py 
                        ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_addvideo.inx
                        ${CMAKE_CURRENT_BINARY_DIR}/sozi_extras_addvideo.py)

################################################################################
### The player core target
################################################################################

#MESSAGE(WARNING "sozi_inkscape_files=${sozi_inkscape_files} sozi_player_files=${sozi_player_files}")

ADD_CUSTOM_TARGET(sozi_inkscape ALL DEPENDS ${sozi_inkscape_files} ${sozi_player_files})

INSTALL(FILES ${sozi_inkscape_files}
              ${sozi_player_files} 
              DESTINATION ${inkscape_path}/extensions)
