################################################################################
### The sozi.py output file contains the sozi inkscape integration
################################################################################

file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/sozi)

ADD_CUSTOM_COMMAND(
   OUTPUT    sozi/version.py
   DEPENDS   ${CMAKE_CURRENT_SOURCE_DIR}/sozi/version.py
   COMMAND   sed -e 's/{{SOZI_VERSION}}/${SOZI_VERSION}/g' ${CMAKE_CURRENT_SOURCE_DIR}/sozi/version.py > sozi/version.py
)

SET(sozi_inkscape_files ${CMAKE_CURRENT_SOURCE_DIR}/sozi.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi.py
                        
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi_extras_media.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi_extras_media.py
                        
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi_extras_upgrade.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi_extras_upgrade.py
                        
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi_extras_link.inx
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi_extras_link.py
                        
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/icon.png
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/__init__.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/actions.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/document.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/fields.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/media_upgrade.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/ui.py
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/ui.glade
                        ${CMAKE_CURRENT_SOURCE_DIR}/sozi/upgrade.py
                        
                        ${CMAKE_CURRENT_BINARY_DIR}/sozi/version.py)


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

