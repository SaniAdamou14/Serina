"""
Locate and import the compiled serina_py extension module for the test
suite, wherever CMake happened to put it, and work around Windows' DLL
search-path changes.

Since Python 3.8, Windows no longer searches PATH when loading an
extension module's dependent DLLs (only the module's own directory and
directories registered via os.add_dll_directory()). A MinGW-built
serina_py.pyd depends on libstdc++-6.dll / libgcc_s_seh-1.dll /
libwinpthread-1.dll, which live next to the compiler, not next to the
.pyd — so a plain `import serina_py` fails with a bare
"DLL load failed" that gives no hint about which DLL is missing.
"""

import os
import sys
from pathlib import Path
from typing import Optional

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Anywhere CMake (MinGW single-config or MSVC multi-config) might have
# placed the built extension module.
_SEARCH_GLOBS = [
    "build/serina_py*.pyd",
    "build/serina_py*.so",
    "build/Release/serina_py*.pyd",
    "build/Debug/serina_py*.pyd",
    "build/*/serina_py*.pyd",
    "python/serina_py*.pyd",
    "serina_py*.pyd",
]

# Common locations for the MinGW runtime DLLs a MinGW-built .pyd needs.
_MINGW_DLL_DIRS = [
    r"C:\msys64\mingw64\bin",
    r"C:\mingw64\bin",
]


def _find_module_dir() -> Optional[Path]:
    for pattern in _SEARCH_GLOBS:
        matches = sorted(PROJECT_ROOT.glob(pattern))
        if matches:
            return matches[0].parent
    return None


def _register_dll_directories() -> None:
    if not hasattr(os, "add_dll_directory"):
        return  # Not Windows / Python < 3.8.
    for dll_dir in _MINGW_DLL_DIRS:
        if os.path.isdir(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except OSError:
                pass


@pytest.fixture(scope="session")
def serina_py():
    """The compiled serina_py module, or a skip if it isn't built."""
    module_dir = _find_module_dir()
    if module_dir is None:
        pytest.skip(
            "serina_py extension module not built. Run:\n"
            "  cmake -S . -B build -DBUILD_PYTHON_MODULE=ON\n"
            "  cmake --build build"
        )

    sys.path.insert(0, str(module_dir))
    _register_dll_directories()

    try:
        import serina_py as module
    except ImportError as exc:
        pytest.skip(f"serina_py found at {module_dir} but failed to import: {exc}")

    return module
