#include "SRender.hpp"  
#include <API/Terminal/ANSI/ANSIcolorCode.hpp>  

namespace Stela {  
    // ---- Initialization and Cleanup ----

    /**
     * @brief Initializes OpenGL buffer objects and shaders
     * @details Creates and initializes VBO, VAO, EBO, and shader objects
     */
    void SRender::initializeBuffers() {
        // Create and bind Vertex Buffer Object
        glGenBuffers(1, &VBO);
        glBindBuffer(GL_ARRAY_BUFFER, VBO);

        // Create Vertex Array Object
        glGenVertexArrays(1, &VAO);

        // Create Element Buffer Object
        glGenBuffers(1, &EBO);

        // Create shader objects
        vertexShader = glCreateShader(GL_VERTEX_SHADER);
        FragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    }

    /**
     * @brief Destructor that cleans up OpenGL resources
     * @details Deletes buffer objects and shader programs to prevent memory leaks
     */
    SRender::~SRender() {
        glDeleteBuffers(1, &VBO);
        glDeleteVertexArrays(1, &VAO);
        glDeleteBuffers(1, &EBO);
        glDeleteShader(vertexShader);
        glDeleteShader(FragmentShader);
    }

    // ---- Buffer Management Functions ----

    /**
     * @brief Binds a vertex array object
     * @param VAO The vertex array object to bind
     */
    void SRender::BindVertexArray(unsigned int VAO) {
        glBindVertexArray(VAO);
    }

    /**
     * @brief Binds a buffer object to the specified target
     * @param target The target to which the buffer should be bound
     * @param buffer The buffer object to bind
     */
    void SRender::BindBuffer(GLenum target, unsigned int buffer) {
        glBindBuffer(target, buffer);
    }

    /**
     * @brief Creates and initializes a buffer object's data store
     * @param target The target buffer object
     * @param size The size in bytes of the buffer object's data store
     * @param data A pointer to data that will be copied into the data store
     * @param usage A hint about how the data will be accessed
     */
    void SRender::BufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage) {
        glBufferData(target, size, data, usage);
    }

    /**
     * @brief Alternative name for BufferData function
     * @see BufferData
     */
    void SRender::setBufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage) {
        glBufferData(target, size, data, usage);
    }

    /**
     * @brief Specifies the location and data format of a vertex attribute
     * @details Also enables the vertex attribute array
     */
    void SRender::setVertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void* pointer) {
        glVertexAttribPointer(index, size, type, normalized, stride, pointer);
        glEnableVertexAttribArray(index);
    }

    /**
     * @brief Enables a generic vertex attribute array
     * @param index The index of the vertex attribute to enable
     */
    void SRender::EnableVertexAttribArray(GLuint index) {
        glEnableVertexAttribArray(index);
    }

    // ---- Shader Management Functions ----

    /**
     * @brief Loads shader source code from a file
     * @param filePath Path to the shader source file
     * @return Pointer to the loaded shader source code
     */
    const GLchar* SRender::loadShaderSource(const std::string& filePath) {
        std::ifstream file(filePath);
        if (!file.is_open()) {
            std::cerr << RED << "Could not open shader file: " << filePath << std::endl;
            shaderSource = ""; // Return an empty shader source
            return shaderSource.c_str();
        }
        std::stringstream buffer;
        buffer << file.rdbuf();
        shaderSource = buffer.str(); // Store the source in the member variable
        return shaderSource.c_str(); // Return a pointer to the internal string data
    }

    /**
     * @brief Sets the source code for a shader object
     * @param shader The shader object handle
     * @param source Pointer to the shader source code
     */
    void SRender::setShaderSource(GLuint shader, const GLchar* const* source) {
        glShaderSource(shader, 1, source, NULL);
    }

    /**
     * @brief Compiles a shader object
     * @param shader The shader object to compile
     */
    void SRender::CompileShader(GLuint shader) {
        glCompileShader(shader);
        int success;
        char infoLog[512];
        glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
        if (!success) {
            glGetShaderInfoLog(shader, 512, NULL, infoLog);
            std::cerr << RED << "ERROR::SHADER::COMPILATION_FAILED: " << shader << "\n" << infoLog << std::endl;
        }
        else {
            std::cout << GREEN << "SUCCESS::SHADER::COMPILATION_SUCCESS: " << shader << "\n";
        }
    }

    /**
     * @brief Creates a program object, attaches shaders, and links them
     * @param vertexShader The vertex shader to attach
     * @param fragmentShader The fragment shader to attach
     * @return The created program object
     */
    unsigned int SRender::createAndLinkProgram(GLuint vertexShader, GLuint fragmentShader) {
        unsigned int shaderProgram = glCreateProgram();
        glAttachShader(shaderProgram, vertexShader);
        glAttachShader(shaderProgram, fragmentShader);
        glLinkProgram(shaderProgram);

        // Check for linking errors
        int success;
        char infoLog[512];
        glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
        if (!success) {
            glGetProgramInfoLog(shaderProgram, 512, NULL, infoLog);
            std::cerr << RED << "ERROR::SHADER::PROGRAM::LINKING_FAILED: " << shaderProgram << "\n" << infoLog << std::endl;
        }
        else {
            std::cout << GREEN << "SUCCESS::SHADER::PROGRAM::LINKING_SUCCESS: " << shaderProgram << "\n";
        }

        return shaderProgram;
    }

    /**
     * @brief Installs a program object as part of the current rendering state
     * @param shaderProgram The program object to use
     */
    void SRender::UseProgram(unsigned int shaderProgram) {
        glUseProgram(shaderProgram);
    }

    /**
     * @brief Deletes a program object
     * @param shaderProgram The program object to delete
     */
    void SRender::DeleteProgram(unsigned int shaderProgram) {  
       glDeleteProgram(shaderProgram);  
       std::cout << GREEN << "SUCCESS::SHADER::PROGRAM::DELETE_SUCCESS: " << shaderProgram << "\n";  
    }

    // ---- Drawing Functions ----

    /**
     * @brief Renders primitives from array data
     * @param mode The type of primitive to render
     * @param count The number of elements to render
     * @param type The type of the values in indices
     * @param indices A pointer to the location where the indices are stored
     */
    void SRender::DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices) {
        glDrawElements(mode, count, type, indices);
    }

    /**
     * @brief Sets the polygon rasterization mode
     * @param face The face for which to set the polygon mode
     * @param mode The polygon mode to use
     */
    void SRender::PolygonMode(GLenum face, GLenum mode) {
        glPolygonMode(face, mode);
    }

} // namespace Stela