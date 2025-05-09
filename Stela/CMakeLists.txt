# Stela subdirectory CMake configuration

# Define source files
set(STELA_SOURCES
    src/Main.cpp
    src/API/Input/SInput.cpp
    src/API/Render/SRender.cpp
    src/API/Window/SWindow.cpp
    src/glad.c
)

# Define header files for IDE integration
set(STELA_HEADERS
    src/API/Input/SInput.hpp
    src/API/Render/SRender.hpp
    src/API/Window/SWindow.hpp
    src/API/Terminal/ANSI/ANSIcolorCode.hpp
    Includes/GLFW/glfw3.h
    Includes/GLFW/glfw3native.h
    Includes/glad/glad.h
    Includes/KHR/khrplatform.h
)

# Define shader files
set(STELA_SHADERS
    src/Shaders/FragmentShader.frag
    src/Shaders/VertexShader.vert
)

# Add source files to the parent target
target_sources(${PROJECT_NAME} PRIVATE ${STELA_SOURCES} ${STELA_HEADERS} ${STELA_SHADERS})

# Set properties for shader files to ensure they appear in IDEs
set_source_files_properties(${STELA_SHADERS} PROPERTIES HEADER_FILE_ONLY TRUE)

# Create source groups for better organization in IDEs
source_group("Source Files" FILES ${STELA_SOURCES})
source_group("Header Files" FILES ${STELA_HEADERS})
source_group("Shader Files" FILES ${STELA_SHADERS})