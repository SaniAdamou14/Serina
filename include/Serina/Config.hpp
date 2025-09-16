#pragma once

#include <string>

namespace Serina
{

    class Config
    {
    public:
        static Config &instance();

        // TODO: Load from JSON file
        void load(const std::string &filename);

        int getWorldWidth() const { return worldWidth_; }
        int getWorldHeight() const { return worldHeight_; }
        double getMutationRate() const { return mutationRate_; }

    private:
        Config();
        int worldWidth_ = 100;
        int worldHeight_ = 100;
        double mutationRate_ = 0.01;
    };

} // namespace Serina