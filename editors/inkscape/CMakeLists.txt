################################################################################
### The sozi.py output file contains the sozi inkscape integration
################################################################################

ADD_CUSTOM_COMMAND(
   OUTPUT    sozi_upgrade.py
   DEPENDS   ${CMAKE_CURRENT_SOURCE_DIR}/sozi_upgrade.py
   COMMAND   sed -e 's/{{SOZI_VERSION}}/${SOZI_VERSION}/g' ${CMAKE_CURRENT_SOURCE_DIR}/sozi_upgrade.py > sozi_upgrade.py
)

ADD_CUSTOM_COMMAND(
   OUTPUT    sozi_extras_addvideo_upgrade.py
   DEPENDS   ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_addvideo_upgrade.py
   COMMAND   sed -e 's/{{SOZI_VERSION}}/${SOZI_VERSION}/g' ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_addvideo_upgrade.py > sozi_extras_addvideo_upgrade.py
)

SET(sozi_inkscape_files ${CMAKE_CURRENT_SOURCE_DIR}/sozi.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi.py 
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi.py.svg
                        ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_addvideo.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_addvideo.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_upgrade.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/extras/sozi_extras_upgrade.py
                        ${CMAKE_CURRENT_BINARY_DIR}/sozi_upgrade.py
                        ${CMAKE_CURRENT_BINARY_DIR}/sozi_extras_addvideo_upgrade.py)

################################################################################
### The inkscape integration files target
################################################################################

#MESSAGE(WARNING "sozi_inkscape_files=${sozi_inkscape_files} sozi_player_files=${sozi_player_files}")

ADD_CUSTOM_TARGET(sozi_inkscape ALL DEPENDS ${sozi_inkscape_files} ${sozi_player_files})

INSTALL(FILES ${sozi_inkscape_files}
              ${sozi_player_files}
              ${sozi_doc_files}
	    DESTINATION share/inkscape/extensions
        COMPONENT inkscape_integration)

