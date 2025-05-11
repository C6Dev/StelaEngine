#pragma once
#include <string>
#include <fstream>
#include <sstream>
#include <unordered_map>
#include <any>
#include <type_traits>

namespace Stela {
namespace Config {

class ConfigManager {
public:
    static ConfigManager& GetInstance() {
        static ConfigManager instance;
        return instance;
    }

    // Load all config values from file
    bool LoadConfig() {
        std::ifstream file("StelaEngine.ini");
        if (!file.is_open()) {
            return false;
        }

        std::string line;
        while (std::getline(file, line)) {
            size_t pos = line.find('=');
            if (pos != std::string::npos) {
                std::string key = line.substr(0, pos);
                std::string value = line.substr(pos + 1);
                configValues[key] = value;
            }
        }
        return true;
    }

    // Save all config values to file
    bool SaveConfig() {
        std::ofstream file("StelaEngine.ini");
        if (!file.is_open()) {
            return false;
        }

        for (const auto& [key, value] : configValues) {
            file << key << "=" << value << "\n";
        }
        return true;
    }

    // Generic getter for any type
    template<typename T>
    T GetValue(const std::string& key, T defaultValue = T()) const {
        auto it = configValues.find(key);
        if (it == configValues.end()) {
            return defaultValue;
        }

        if constexpr (std::is_same_v<T, bool>) {
            return it->second == "1";
        }
        else if constexpr (std::is_integral_v<T>) {
            return static_cast<T>(std::stoll(it->second));
        }
        else if constexpr (std::is_floating_point_v<T>) {
            return static_cast<T>(std::stod(it->second));
        }
        else if constexpr (std::is_same_v<T, std::string>) {
            return it->second;
        }
        return defaultValue;
    }

    // Generic setter for any type
    template<typename T>
    void SetValue(const std::string& key, const T& value) {
        if constexpr (std::is_same_v<T, bool>) {
            configValues[key] = value ? "1" : "0";
        }
        else if constexpr (std::is_arithmetic_v<T>) {
            configValues[key] = std::to_string(value);
        }
        else if constexpr (std::is_same_v<T, std::string>) {
            configValues[key] = value;
        }
        SaveConfig();
    }

    // Delete a config value
    void DeleteValue(const std::string& key) {
        configValues.erase(key);
        SaveConfig();
    }

    // Check if a config value exists
    bool HasValue(const std::string& key) const {
        return configValues.find(key) != configValues.end();
    }

    // Clear all config values
    void ClearAll() {
        configValues.clear();
        SaveConfig();
    }

private:
    ConfigManager() = default;
    std::unordered_map<std::string, std::string> configValues;
};

} // namespace Config
} // namespace Stela 