#pragma once

#include <vector>
#include <array>
#include <memory>
#include <functional>
#include <algorithm>
#include <execution>
#include <chrono>
#include <unordered_map>
#include <optional>
#include <cmath>
#include <immintrin.h>
#include <omp.h>

namespace Serina::Performance
{

    /// @brief Classe de base pour optimisations SIMD
    class SIMDOptimizer
    {
    public:
        /// @brief Addition vectorisée de deux tableaux
        static void vectorAdd(const float *a, const float *b, float *result, size_t size)
        {
            size_t simdSize = size - (size % 8);

            // Traitement SIMD par blocs de 8
            for (size_t i = 0; i < simdSize; i += 8)
            {
                __m256 va = _mm256_load_ps(&a[i]);
                __m256 vb = _mm256_load_ps(&b[i]);
                __m256 vr = _mm256_add_ps(va, vb);
                _mm256_store_ps(&result[i], vr);
            }

            // Traitement des éléments restants
            for (size_t i = simdSize; i < size; ++i)
            {
                result[i] = a[i] + b[i];
            }
        }

        /// @brief Multiplication matricielle optimisée
        static void matrixMultiply(const float *a, const float *b, float *c,
                                   size_t rowsA, size_t colsA, size_t colsB)
        {
#pragma omp parallel for
            for (size_t i = 0; i < rowsA; ++i)
            {
                for (size_t j = 0; j < colsB; ++j)
                {
                    __m256 sum = _mm256_setzero_ps();
                    size_t k = 0;

                    // Produit scalaire vectorisé
                    for (; k + 8 <= colsA; k += 8)
                    {
                        __m256 va = _mm256_load_ps(&a[i * colsA + k]);
                        __m256 vb = _mm256_load_ps(&b[k * colsB + j]);
                        sum = _mm256_fmadd_ps(va, vb, sum);
                    }

                    // Somme horizontale
                    float result[8];
                    _mm256_store_ps(result, sum);
                    float finalSum = result[0] + result[1] + result[2] + result[3] +
                                     result[4] + result[5] + result[6] + result[7];

                    // Éléments restants
                    for (; k < colsA; ++k)
                    {
                        finalSum += a[i * colsA + k] * b[k * colsB + j];
                    }

                    c[i * colsB + j] = finalSum;
                }
            }
        }

        /// @brief Calcul de distance euclidienne vectorisée
        static float euclideanDistance(const float *a, const float *b, size_t dimensions)
        {
            __m256 sum = _mm256_setzero_ps();
            size_t simdSize = dimensions - (dimensions % 8);

            for (size_t i = 0; i < simdSize; i += 8)
            {
                __m256 va = _mm256_load_ps(&a[i]);
                __m256 vb = _mm256_load_ps(&b[i]);
                __m256 diff = _mm256_sub_ps(va, vb);
                sum = _mm256_fmadd_ps(diff, diff, sum);
            }

            // Somme horizontale
            float result[8];
            _mm256_store_ps(result, sum);
            float totalSum = result[0] + result[1] + result[2] + result[3] +
                             result[4] + result[5] + result[6] + result[7];

            // Éléments restants
            for (size_t i = simdSize; i < dimensions; ++i)
            {
                float diff = a[i] - b[i];
                totalSum += diff * diff;
            }

            return std::sqrt(totalSum);
        }
    };

    /// @brief Hachage spatial optimisé pour les simulations
    template <typename T>
    class SpatialHashGrid
    {
    private:
        struct Cell
        {
            std::vector<T *> objects;

            void clear() { objects.clear(); }
            void reserve(size_t size) { objects.reserve(size); }
        };

        std::vector<Cell> grid_;
        double cellSize_;
        int gridWidth_;
        int gridHeight_;
        double worldMinX_, worldMinY_;
        double worldMaxX_, worldMaxY_;

        // Pool de mémoire pour éviter les allocations
        mutable std::vector<T *> queryResults_;

    public:
        SpatialHashGrid(double worldMinX, double worldMinY,
                        double worldMaxX, double worldMaxY,
                        double cellSize)
            : cellSize_(cellSize), worldMinX_(worldMinX), worldMinY_(worldMinY),
              worldMaxX_(worldMaxX), worldMaxY_(worldMaxY)
        {

            gridWidth_ = static_cast<int>((worldMaxX - worldMinX) / cellSize) + 1;
            gridHeight_ = static_cast<int>((worldMaxY - worldMinY) / cellSize) + 1;

            grid_.resize(gridWidth_ * gridHeight_);
            queryResults_.reserve(1000); // Pré-allocation
        }

        /// @brief Efface toutes les cellules
        void clear()
        {
#pragma omp parallel for
            for (size_t i = 0; i < grid_.size(); ++i)
            {
                grid_[i].clear();
            }
        }

        /// @brief Insère un objet dans la grille
        void insert(T *object, double x, double y)
        {
            int cellX = static_cast<int>((x - worldMinX_) / cellSize_);
            int cellY = static_cast<int>((y - worldMinY_) / cellSize_);

            if (cellX >= 0 && cellX < gridWidth_ && cellY >= 0 && cellY < gridHeight_)
            {
                int index = cellY * gridWidth_ + cellX;
                grid_[index].objects.push_back(object);
            }
        }

        /// @brief Requête dans un rayon donné
        const std::vector<T *> &queryRadius(double centerX, double centerY, double radius) const
        {
            queryResults_.clear();

            int minCellX = std::max(0, static_cast<int>((centerX - radius - worldMinX_) / cellSize_));
            int maxCellX = std::min(gridWidth_ - 1, static_cast<int>((centerX + radius - worldMinX_) / cellSize_));
            int minCellY = std::max(0, static_cast<int>((centerY - radius - worldMinY_) / cellSize_));
            int maxCellY = std::min(gridHeight_ - 1, static_cast<int>((centerY + radius - worldMinY_) / cellSize_));

            double radiusSquared = radius * radius;

            for (int y = minCellY; y <= maxCellY; ++y)
            {
                for (int x = minCellX; x <= maxCellX; ++x)
                {
                    int index = y * gridWidth_ + x;
                    const auto &cell = grid_[index];

                    for (T *object : cell.objects)
                    {
                        // Ici, on assume que T a des méthodes getX() et getY()
                        double dx = object->getX() - centerX;
                        double dy = object->getY() - centerY;

                        if (dx * dx + dy * dy <= radiusSquared)
                        {
                            queryResults_.push_back(object);
                        }
                    }
                }
            }

            return queryResults_;
        }

        /// @brief Obtient les statistiques de la grille
        struct GridStats
        {
            size_t totalObjects = 0;
            size_t activeCells = 0;
            size_t maxObjectsPerCell = 0;
            double averageObjectsPerActiveCell = 0.0;
            double loadFactor = 0.0;
        };

        GridStats getStatistics() const
        {
            GridStats stats;

            for (const auto &cell : grid_)
            {
                size_t cellSize = cell.objects.size();
                if (cellSize > 0)
                {
                    stats.activeCells++;
                    stats.totalObjects += cellSize;
                    stats.maxObjectsPerCell = std::max(stats.maxObjectsPerCell, cellSize);
                }
            }

            stats.averageObjectsPerActiveCell = stats.activeCells > 0 ? static_cast<double>(stats.totalObjects) / stats.activeCells : 0.0;
            stats.loadFactor = static_cast<double>(stats.activeCells) / grid_.size();

            return stats;
        }
    };

    /// @brief Pool de mémoire pour éviter les allocations fréquentes
    template <typename T>
    class MemoryPool
    {
    private:
        std::vector<std::unique_ptr<T>> pool_;
        std::vector<T *> available_;
        size_t poolSize_;

    public:
        explicit MemoryPool(size_t initialSize = 1000) : poolSize_(initialSize)
        {
            pool_.reserve(poolSize_);
            available_.reserve(poolSize_);

            // Pré-allocation
            for (size_t i = 0; i < poolSize_; ++i)
            {
                auto object = std::make_unique<T>();
                available_.push_back(object.get());
                pool_.push_back(std::move(object));
            }
        }

        /// @brief Acquiert un objet du pool
        T *acquire()
        {
            if (available_.empty())
            {
                // Expansion du pool si nécessaire
                size_t newSize = poolSize_ / 2;
                pool_.reserve(pool_.size() + newSize);
                available_.reserve(available_.size() + newSize);

                for (size_t i = 0; i < newSize; ++i)
                {
                    auto object = std::make_unique<T>();
                    available_.push_back(object.get());
                    pool_.push_back(std::move(object));
                }

                poolSize_ += newSize;
            }

            T *object = available_.back();
            available_.pop_back();
            return object;
        }

        /// @brief Libère un objet vers le pool
        void release(T *object)
        {
            if (object)
            {
                // Réinitialise l'objet (assume qu'il a une méthode reset())
                // object->reset();
                available_.push_back(object);
            }
        }

        /// @brief Obtient les statistiques du pool
        struct PoolStats
        {
            size_t totalObjects;
            size_t availableObjects;
            size_t usedObjects;
            double utilizationRate;
        };

        PoolStats getStatistics() const
        {
            PoolStats stats;
            stats.totalObjects = pool_.size();
            stats.availableObjects = available_.size();
            stats.usedObjects = stats.totalObjects - stats.availableObjects;
            stats.utilizationRate = static_cast<double>(stats.usedObjects) / stats.totalObjects;
            return stats;
        }
    };

    /// @brief Gestionnaire de tâches parallèles
    class ParallelTaskManager
    {
    private:
        int maxThreads_;

    public:
        ParallelTaskManager() : maxThreads_(omp_get_max_threads())
        {
            omp_set_num_threads(maxThreads_);
        }

        /// @brief Exécute une fonction sur un range en parallèle
        template <typename Func>
        void parallelFor(size_t start, size_t end, Func &&func)
        {
#pragma omp parallel for
            for (size_t i = start; i < end; ++i)
            {
                func(i);
            }
        }

        /// @brief Exécute une fonction sur un container en parallèle
        template <typename Container, typename Func>
        void parallelForEach(Container &container, Func &&func)
        {
#pragma omp parallel for
            for (size_t i = 0; i < container.size(); ++i)
            {
                func(container[i]);
            }
        }

        /// @brief Réduction parallèle
        template <typename Container, typename T, typename Func>
        T parallelReduce(const Container &container, T initial, Func &&func)
        {
            T result = initial;

#pragma omp parallel for reduction(+ : result)
            for (size_t i = 0; i < container.size(); ++i)
            {
                result += func(container[i]);
            }

            return result;
        }

        /// @brief Partitionnement adaptatif du travail
        template <typename Func>
        void adaptiveParallelFor(size_t start, size_t end, Func &&func)
        {
            size_t range = end - start;
            size_t grainSize = std::max(size_t(1), range / (maxThreads_ * 4));

#pragma omp parallel for schedule(dynamic, grainSize)
            for (size_t i = start; i < end; ++i)
            {
                func(i);
            }
        }

        int getMaxThreads() const { return maxThreads_; }
        void setMaxThreads(int threads)
        {
            maxThreads_ = std::min(threads, omp_get_max_threads());
            omp_set_num_threads(maxThreads_);
        }
    };

    /// @brief Profiler de performance léger
    class PerformanceProfiler
    {
    private:
        struct ProfileData
        {
            std::string name;
            std::chrono::high_resolution_clock::time_point startTime;
            std::chrono::duration<double> totalTime{0};
            size_t callCount = 0;
        };

        std::unordered_map<std::string, ProfileData> profiles_;
        static thread_local std::vector<std::string> callStack_;

    public:
        /// @brief Démarre le profiling d'une section
        void startProfile(const std::string &name)
        {
            auto &profile = profiles_[name];
            profile.name = name;
            profile.startTime = std::chrono::high_resolution_clock::now();
            callStack_.push_back(name);
        }

        /// @brief Termine le profiling d'une section
        void endProfile(const std::string &name)
        {
            auto now = std::chrono::high_resolution_clock::now();
            auto &profile = profiles_[name];

            profile.totalTime += now - profile.startTime;
            profile.callCount++;

            if (!callStack_.empty() && callStack_.back() == name)
            {
                callStack_.pop_back();
            }
        }

        /// @brief RAII wrapper pour profiling automatique
        class ScopedProfiler
        {
        private:
            PerformanceProfiler &profiler_;
            std::string name_;

        public:
            ScopedProfiler(PerformanceProfiler &profiler, const std::string &name)
                : profiler_(profiler), name_(name)
            {
                profiler_.startProfile(name_);
            }

            ~ScopedProfiler()
            {
                profiler_.endProfile(name_);
            }
        };

        /// @brief Obtient les résultats du profiling
        struct ProfileResult
        {
            std::string name;
            double totalTimeMs;
            double averageTimeMs;
            size_t callCount;
            double percentage;
        };

        std::vector<ProfileResult> getResults() const
        {
            std::vector<ProfileResult> results;
            double totalTimeAll = 0.0;

            // Calcule le temps total
            for (const auto &[name, data] : profiles_)
            {
                totalTimeAll += data.totalTime.count() * 1000.0;
            }

            // Génère les résultats
            for (const auto &[name, data] : profiles_)
            {
                ProfileResult result;
                result.name = name;
                result.totalTimeMs = data.totalTime.count() * 1000.0;
                result.averageTimeMs = data.callCount > 0 ? result.totalTimeMs / data.callCount : 0.0;
                result.callCount = data.callCount;
                result.percentage = totalTimeAll > 0.0 ? (result.totalTimeMs / totalTimeAll) * 100.0 : 0.0;
                results.push_back(result);
            }

            // Trie par temps total décroissant
            std::sort(results.begin(), results.end(),
                      [](const ProfileResult &a, const ProfileResult &b)
                      {
                          return a.totalTimeMs > b.totalTimeMs;
                      });

            return results;
        }

        /// @brief Réinitialise tous les profils
        void reset()
        {
            profiles_.clear();
            callStack_.clear();
        }
    };

    thread_local std::vector<std::string> PerformanceProfiler::callStack_;

/// @brief Macro pour profiling automatique
#define PROFILE_SCOPE(profiler, name) \
    Serina::Performance::PerformanceProfiler::ScopedProfiler _prof(profiler, name)

    /// @brief Cache LRU pour optimiser les accès répétitifs
    template <typename Key, typename Value>
    class LRUCache
    {
    private:
        struct Node
        {
            Key key;
            Value value;
            std::shared_ptr<Node> prev;
            std::shared_ptr<Node> next;

            Node(const Key &k, const Value &v) : key(k), value(v) {}
        };

        size_t capacity_;
        std::unordered_map<Key, std::shared_ptr<Node>> cache_;
        std::shared_ptr<Node> head_;
        std::shared_ptr<Node> tail_;

        void moveToHead(std::shared_ptr<Node> node)
        {
            removeNode(node);
            addToHead(node);
        }

        void removeNode(std::shared_ptr<Node> node)
        {
            if (node->prev)
                node->prev->next = node->next;
            if (node->next)
                node->next->prev = node->prev;
        }

        void addToHead(std::shared_ptr<Node> node)
        {
            node->prev = head_;
            node->next = head_->next;

            head_->next->prev = node;
            head_->next = node;
        }

        std::shared_ptr<Node> removeTail()
        {
            auto last = tail_->prev;
            removeNode(last);
            return last;
        }

    public:
        explicit LRUCache(size_t capacity) : capacity_(capacity)
        {
            head_ = std::make_shared<Node>(Key{}, Value{});
            tail_ = std::make_shared<Node>(Key{}, Value{});

            head_->next = tail_;
            tail_->prev = head_;
        }

        /// @brief Obtient une valeur du cache
        std::optional<Value> get(const Key &key)
        {
            auto it = cache_.find(key);
            if (it == cache_.end())
            {
                return std::nullopt;
            }

            // Déplace vers le début (récemment utilisé)
            moveToHead(it->second);
            return it->second->value;
        }

        /// @brief Insère ou met à jour une valeur
        void put(const Key &key, const Value &value)
        {
            auto it = cache_.find(key);

            if (it != cache_.end())
            {
                // Met à jour la valeur existante
                it->second->value = value;
                moveToHead(it->second);
            }
            else
            {
                // Nouvelle entrée
                auto newNode = std::make_shared<Node>(key, value);

                if (cache_.size() >= capacity_)
                {
                    // Supprime le moins récemment utilisé
                    auto tail = removeTail();
                    cache_.erase(tail->key);
                }

                cache_[key] = newNode;
                addToHead(newNode);
            }
        }

        /// @brief Efface le cache
        void clear()
        {
            cache_.clear();
            head_->next = tail_;
            tail_->prev = head_;
        }

        size_t size() const { return cache_.size(); }
        size_t capacity() const { return capacity_; }
        double hitRate() const
        {
            // Implémenter compteurs hit/miss si nécessaire
            return 0.0;
        }
    };

} // namespace Serina::Performance