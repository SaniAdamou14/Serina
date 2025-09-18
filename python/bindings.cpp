#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "Serina/SimulationAPI.hpp"
#include "Serina/Genome.hpp"
#include "Serina/Species.hpp"
#include "Serina/World.hpp"
#include "Serina/PhysicsEngine.hpp"

namespace py = pybind11;

PYBIND11_MODULE(serina_py, m) {
    // TraitType enum
    py::enum_<Serina::TraitType>(m, "TraitType")
        .value("SIZE", Serina::TraitType::SIZE)
        .value("SPEED", Serina::TraitType::SPEED)
        .value("ENERGY_EFFICIENCY", Serina::TraitType::ENERGY_EFFICIENCY)
        .value("REPRODUCTION_RATE", Serina::TraitType::REPRODUCTION_RATE)
        .value("AGGRESSION", Serina::TraitType::AGGRESSION)
        .value("INTELLIGENCE", Serina::TraitType::INTELLIGENCE)
        .value("LONGEVITY", Serina::TraitType::LONGEVITY)
        .value("RESISTANCE", Serina::TraitType::RESISTANCE);

    // GeneticTrait struct
    py::class_<Serina::GeneticTrait>(m, "GeneticTrait")
        .def(py::init<>())
        .def(py::init<Serina::TraitType, double, double>(),
             py::arg("type"), py::arg("value"), py::arg("dominance") = 0.5)
        .def_readwrite("type", &Serina::GeneticTrait::type)
        .def_readwrite("value", &Serina::GeneticTrait::value)
        .def_readwrite("dominance", &Serina::GeneticTrait::dominance);

    // Genome class
    py::class_<Serina::Genome>(m, "Genome")
        .def(py::init<>())
        .def(py::init<const std::vector<Serina::GeneticTrait>&>())
        .def("mutate", &Serina::Genome::mutate, 
             py::arg("mutationRate"), py::arg("mutationStrength") = 0.1)
        .def("crossover", &Serina::Genome::crossover)
        .def("getTrait", &Serina::Genome::getTrait)
        .def("setTrait", &Serina::Genome::setTrait,
             py::arg("type"), py::arg("value"), py::arg("dominance") = 0.5)
        .def("getTraits", &Serina::Genome::getTraits,
             py::return_value_policy::reference_internal)
        .def("calculateFitness", &Serina::Genome::calculateFitness)
        .def("toJson", &Serina::Genome::toJson)
        .def_static("generateRandom", &Serina::Genome::generateRandom);

    // Species class
    py::class_<Serina::Species>(m, "Species")
        .def(py::init<const std::string&, const Serina::Genome&>())
        .def("expressPhenotypeFromGenome", &Serina::Species::expressPhenotypeFromGenome)
        .def("applyGeneticConstraints", &Serina::Species::applyGeneticConstraints)
        .def("getMetabolicRate", &Serina::Species::getMetabolicRate)
        .def("getReproductionThreshold", &Serina::Species::getReproductionThreshold)
        .def("canReproduce", &Serina::Species::canReproduce)
        .def("updatePhysiology", &Serina::Species::updatePhysiology)
        .def("mutate", &Serina::Species::mutate)
        .def("reproduce", &Serina::Species::reproduce)
        .def("survives", &Serina::Species::survives)
        .def("getName", &Serina::Species::getName,
             py::return_value_policy::reference_internal)
        .def("getEnergy", &Serina::Species::getEnergy)
        .def("setEnergy", &Serina::Species::setEnergy)
        .def("getTrait", &Serina::Species::getTrait)
        .def("toJson", &Serina::Species::toJson);

    // TerrainType enum
    py::enum_<Serina::TerrainType>(m, "TerrainType")
        .value("LAND", Serina::TerrainType::LAND)
        .value("WATER", Serina::TerrainType::WATER)
        .value("MOUNTAIN", Serina::TerrainType::MOUNTAIN)
        .value("FOREST", Serina::TerrainType::FOREST)
        .value("DESERT", Serina::TerrainType::DESERT);

    // ClimateZone enum
    py::enum_<Serina::ClimateZone>(m, "ClimateZone")
        .value("TROPICAL", Serina::ClimateZone::TROPICAL)
        .value("TEMPERATE", Serina::ClimateZone::TEMPERATE)
        .value("ARCTIC", Serina::ClimateZone::ARCTIC)
        .value("DESERT", Serina::ClimateZone::DESERT)
        .value("OCEANIC", Serina::ClimateZone::OCEANIC);

    // Cell struct
    py::class_<Serina::Cell>(m, "Cell")
        .def(py::init<>())
        .def_readwrite("resources", &Serina::Cell::resources)
        .def_readwrite("terrain", &Serina::Cell::terrain)
        .def_readwrite("climate", &Serina::Cell::climate)
        .def_readwrite("temperature", &Serina::Cell::temperature)
        .def_readwrite("humidity", &Serina::Cell::humidity)
        .def_readwrite("elevation", &Serina::Cell::elevation);

    // WorldBounds struct
    py::class_<Serina::WorldBounds>(m, "WorldBounds")
        .def(py::init<double, double, double, double>(),
             py::arg("minX") = 0, py::arg("maxX") = 100,
             py::arg("minY") = 0, py::arg("maxY") = 100)
        .def_readwrite("minX", &Serina::WorldBounds::minX)
        .def_readwrite("maxX", &Serina::WorldBounds::maxX)
        .def_readwrite("minY", &Serina::WorldBounds::minY)
        .def_readwrite("maxY", &Serina::WorldBounds::maxY);

    // Entity struct
    py::class_<Serina::Entity>(m, "Entity")
        .def(py::init<double, double, double, double, int>(),
             py::arg("x") = 0, py::arg("y") = 0, py::arg("size") = 1.0,
             py::arg("mass") = 1.0, py::arg("id") = 0)
        .def_readwrite("x", &Serina::Entity::x)
        .def_readwrite("y", &Serina::Entity::y)
        .def_readwrite("vx", &Serina::Entity::vx)
        .def_readwrite("vy", &Serina::Entity::vy)
        .def_readwrite("size", &Serina::Entity::size)
        .def_readwrite("mass", &Serina::Entity::mass)
        .def_readwrite("speciesId", &Serina::Entity::speciesId)
        .def_readwrite("alive", &Serina::Entity::alive);

    // PhysicsEngine class
    py::class_<Serina::PhysicsEngine>(m, "PhysicsEngine")
        .def(py::init<double, const Serina::WorldBounds&>(),
             py::arg("gravity"), py::arg("bounds") = Serina::WorldBounds())
        .def("update", &Serina::PhysicsEngine::update)
        .def("applyGravity", &Serina::PhysicsEngine::applyGravity)
        .def("updatePosition", &Serina::PhysicsEngine::updatePosition)
        .def("handleBoundaries", &Serina::PhysicsEngine::handleBoundaries)
        .def("checkCollision", &Serina::PhysicsEngine::checkCollision)
        .def("resolveCollision", &Serina::PhysicsEngine::resolveCollision)
        .def("applyForce", &Serina::PhysicsEngine::applyForce)
        .def("applyDrag", &Serina::PhysicsEngine::applyDrag,
             py::arg("entity"), py::arg("dragCoeff") = 0.01)
        .def("setGravity", &Serina::PhysicsEngine::setGravity)
        .def("getGravity", &Serina::PhysicsEngine::getGravity)
        .def("setBounds", &Serina::PhysicsEngine::setBounds)
        .def("getBounds", &Serina::PhysicsEngine::getBounds,
             py::return_value_policy::reference_internal);

    // World class
    py::class_<Serina::World>(m, "World")
        .def(py::init<int, int>())
        .def("update", &Serina::World::update)
        .def("addResource", &Serina::World::addResource)
        .def("getResource", &Serina::World::getResource)
        .def("getWidth", &Serina::World::getWidth)
        .def("getHeight", &Serina::World::getHeight);

    // SimulationAPI class (existing)
    py::class_<Serina::SimulationAPI>(m, "SimulationAPI")
        .def(py::init<int, int>(), py::arg("worldWidth"), py::arg("worldHeight"))
        .def("initialize", &Serina::SimulationAPI::initialize)
        .def("step", &Serina::SimulationAPI::step)
        .def("start", &Serina::SimulationAPI::start)
        .def("pause", &Serina::SimulationAPI::pause)
        .def("setSpeed", &Serina::SimulationAPI::setSpeed, py::arg("speed"))
        .def("getPopulationData", &Serina::SimulationAPI::getPopulationData)
        .def("getWorldState", &Serina::SimulationAPI::getWorldState);
}