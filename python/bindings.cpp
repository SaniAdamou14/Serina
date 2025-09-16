#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "Serina/SimulationAPI.hpp"

namespace py = pybind11;

PYBIND11_MODULE(serina_py, m) {
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