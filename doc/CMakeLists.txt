set(sozi_doc_files ${CMAKE_CURRENT_SOURCE_DIR}/GPL-license.txt  
                   ${CMAKE_CURRENT_SOURCE_DIR}/MIT-license.txt  
                   ${PROJECT_SOURCE_DIR}/README)

### Ugly hack
set(sozi_doc_files ${sozi_doc_files} PARENT_SCOPE)

install(FILES ${sozi_doc_files}
        DESTINATION share/doc/sozi
        COMPONENT doc)
