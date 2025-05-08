#pragma once

#include <glad/glad.h>  
#include <GLFW/glfw3.h>  

#include <fstream>  
#include <sstream>  
#include <string>  
#include <iostream>

namespace Stela {
   /**
    * @class SRender
    * @brief A wrapper class for OpenGL rendering functions to simplify graphics rendering operations
    */
   class SRender {
   public:
       /**
        * @brief Initializes OpenGL buffer objects and shaders
        * @details Creates and initializes Vertex Buffer Object (VBO), Vertex Array Object (VAO),
        *          Element Buffer Object (EBO), and shader objects
        */
       void initializeBuffers();
       
       /**
        * @brief Destructor that cleans up OpenGL resources
        * @details Deletes buffer objects and shader programs to prevent memory leaks
        */
       ~SRender();

       // ---- Buffer Management Functions ----
       
       /**
        * @brief Binds a vertex array object
        * @param VAO The vertex array object to bind
        */
       void BindVertexArray(unsigned int VAO);
       
       /**
        * @brief Binds a buffer object to the specified target
        * @param target The target to which the buffer should be bound (e.g., GL_ARRAY_BUFFER)
        * @param buffer The buffer object to bind
        */
       void BindBuffer(GLenum target, unsigned int buffer);
       
       /**
        * @brief Creates and initializes a buffer object's data store
        * @param target The target buffer object (e.g., GL_ARRAY_BUFFER)
        * @param size The size in bytes of the buffer object's data store
        * @param data A pointer to data that will be copied into the data store
        * @param usage A hint about how the data will be accessed (e.g., GL_STATIC_DRAW)
        */
       void BufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage);
       
       /**
        * @brief Alternative name for BufferData function
        * @see BufferData
        */
       void setBufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage);
       
       /**
        * @brief Specifies the location and data format of a vertex attribute
        * @param index The index of the vertex attribute
        * @param size The number of components per vertex attribute
        * @param type The data type of each component
        * @param normalized Whether fixed-point values should be normalized
        * @param stride The byte offset between consecutive vertex attributes
        * @param pointer The offset of the first component of the first vertex attribute
        */
       void setVertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void* pointer);
       
       /**
        * @brief Enables a generic vertex attribute array
        * @param index The index of the vertex attribute to enable
        */
       void EnableVertexAttribArray(GLuint index);

       // ---- Shader Management Functions ----
       
       /**
        * @brief Loads shader source code from a file
        * @param filePath Path to the shader source file
        * @return Pointer to the loaded shader source code
        */
       const GLchar* loadShaderSource(const std::string& filePath);
       
       /**
        * @brief Sets the source code for a shader object
        * @param shader The shader object handle
        * @param source Pointer to the shader source code
        */
       void setShaderSource(GLuint shader, const GLchar* const* source);
       
       /**
        * @brief Compiles a shader object
        * @param shader The shader object to compile
        */
       void CompileShader(GLuint shader);
       
       /**
        * @brief Creates a program object, attaches shaders, and links them
        * @param vertexShader The vertex shader to attach
        * @param fragmentShader The fragment shader to attach
        * @return The created program object
        */
       unsigned int createAndLinkProgram(GLuint vertexShader, GLuint fragmentShader);
       
       /**
        * @brief Installs a program object as part of the current rendering state
        * @param shaderProgram The program object to use
        */
       void UseProgram(unsigned int shaderProgram);
       
       /**
        * @brief Deletes a program object
        * @param shaderProgram The program object to delete
        */
       void DeleteProgram(unsigned int shaderProgram);

       // ---- Drawing Functions ----
       
       /**
        * @brief Renders primitives from array data
        * @param mode The type of primitive to render (e.g., GL_TRIANGLES)
        * @param count The number of elements to render
        * @param type The type of the values in indices (e.g., GL_UNSIGNED_INT)
        * @param indices A pointer to the location where the indices are stored
        */
       void DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices);
       
       /**
        * @brief Sets the polygon rasterization mode
        * @param face The face for which to set the polygon mode (e.g., GL_FRONT_AND_BACK)
        * @param mode The polygon mode to use (e.g., GL_FILL, GL_LINE)
        */
       void PolygonMode(GLenum face, GLenum mode);

       // ---- OpenGL Buffer Objects ----
       
       /**
        * @brief Vertex Buffer Object handle
        * @details Stores vertex data in GPU memory
        */
       unsigned int VBO;
       
       /**
        * @brief Vertex Array Object handle
        * @details Stores vertex attribute configurations and associated VBOs
        */
       unsigned int VAO;
       
       /**
        * @brief Element Buffer Object handle
        * @details Stores indices for indexed rendering
        */
       unsigned int EBO;
       
       // ---- Shader Objects ----
       
       /**
        * @brief Vertex shader handle
        * @details Processes individual vertices
        */
       unsigned int vertexShader;
       
       /**
        * @brief Fragment shader handle
        * @details Processes fragments (pixels) and determines their color
        */
       unsigned int FragmentShader;
   private:
       /**
        * @brief Stores the loaded shader source code
        * @details Used by loadShaderSource to maintain the string data lifetime
        */
       std::string shaderSource;
   };
} // namespace Stela