################################################################################
### Default component name for installation
################################################################################

set(CMAKE_INSTALL_DEFAULT_COMPONENT_NAME inkscape_integration)

################################################################################
### The inkscape editor sozi version
################################################################################

configure_file(sozi/version.py sozi/version.py)

################################################################################
### The inkscape editor sozi extension
################################################################################

# warning : you will need to touch this CMakeLists.txt if you
# add/remove files from source tree.
file(GLOB sozi_inkscape_files "*.py" "*.inx")
file(GLOB sozi_inkscape_dir "sozi/*.*")

add_custom_target(sozi_inkscape ALL DEPENDS ${sozi_inkscape_files} ${sozi_inkscape_dir} ${sozi_player_files} ${sozi_doc_files})

install(FILES ${sozi_inkscape_files}
              DESTINATION share/inkscape/extensions)

install(FILES ${sozi_inkscape_dir}
              ${sozi_player_files}
              ${sozi_doc_files}
              DESTINATION share/inkscape/extensions/sozi)

################################################################################
### The inkscape editor sozi translation
################################################################################

find_program(XGETTEXT xgettext)
if(XGETTEXT)
  file(GLOB sozi_inkscape_pot_src "*.py" "sozi/*.py" "sozi/ui.glade")
  set(sozi_inkscape_pot "sozi.pot")
  add_custom_command(
    OUTPUT ${sozi_inkscape_pot} 
    DEPENDS ${sozi_inkscape_pot_src}
    COMMAND ${XGETTEXT} 
            --package-name=Sozi 
            --package-version=${SOZI_VERSION}
            --output-dir=${CMAKE_CURRENT_BINARY_DIR}/sozi/lang
            --output=${sozi_inkscape_pot}
            ${sozi_inkscape_pot_src}
  )
  add_custom_target(pot ALL DEPENDS ${sozi_inkscape_pot})
endif()

find_package(Gettext)
if(GETTEXT_FOUND)
  file(GLOB_RECURSE sozi_inkscape_po_src "sozi.po")
  foreach(file ${sozi_inkscape_po_src})
    get_filename_component(subdir ${file} PATH)
    add_subdirectory(${subdir})
  endforeach()
endif()

