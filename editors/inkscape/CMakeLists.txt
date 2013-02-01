################################################################################
### Default component name for installation
################################################################################

set(CMAKE_INSTALL_DEFAULT_COMPONENT_NAME inkscape_integration)

################################################################################
### The inkscape editor sozi version
################################################################################

# Fill version.py with the value of variable SOZI_VERSION.
# See CMakeLists.txt at the root of the source tree.
configure_file(sozi/version.py sozi/version.py)

################################################################################
### The inkscape editor sozi extension
################################################################################

# Warning: you will need to touch this CMakeLists.txt
# if you add/remove files from source tree.
file(GLOB sozi_inkscape_files "*.py" "*.inx")
file(GLOB sozi_inkscape_dir "sozi/*.*")

add_custom_target(sozi_inkscape ALL DEPENDS ${sozi_inkscape_files}
                                            ${sozi_inkscape_dir}
                                            ${sozi_player_files}
                                            ${sozi_doc_files})

set(inkscape_extensions_dir "share/inkscape/extensions")

install(FILES ${sozi_inkscape_files}
        DESTINATION ${inkscape_extensions_dir})

install(FILES ${sozi_inkscape_dir}
              ${sozi_player_files}
              ${sozi_doc_files}
        DESTINATION ${inkscape_extensions_dir}/sozi)

################################################################################
### The inkscape editor sozi translation
################################################################################

# Use xgettext to generate a template file from the translatable
# messages in the source files.
find_program(XGETTEXT xgettext)
if(XGETTEXT)
  # Collect all source files with translatable messages.
  file(GLOB sozi_inkscape_pot_src "*.py" "sozi/*.py" "sozi/ui.glade")
  
  # Set a custom command to generate the template file "sozi.pot"
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
  add_custom_target(sozi_inkscape_pot ALL DEPENDS ${sozi_inkscape_pot})
endif()

# Use gettext to generate an mo file for each translation file.
find_package(Gettext)
if(GETTEXT_FOUND)
  # Collect all po files in the inkscape extension tree
  file(GLOB_RECURSE sozi_inkscape_po_src "sozi.po")
  
  # For each file in directory sozi/lang/xy/sozi.po,
  # process the CMake script in sozi/lang/xy/
  foreach(file ${sozi_inkscape_po_src})
    get_filename_component(subdir ${file} PATH)
    add_subdirectory(${subdir})
  endforeach()
endif()

