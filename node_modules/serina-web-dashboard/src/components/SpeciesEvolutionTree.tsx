import { useSimulation } from '@services/SimulationContext';
import { useState, useEffect, useRef } from 'react';

interface TreeNode {
  id: string;
  name: string;
  parent?: string;
  children: TreeNode[];
  generation: number;
  population: number;
  extinct: boolean;
  traits: any;
}

export function SpeciesEvolutionTree() {
  const { simulationData } = useSimulation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (simulationData?.species) {
      generateEvolutionTree();
    }
  }, [simulationData]);

  const generateEvolutionTree = () => {
    if (!simulationData?.species) return;

    // Créer l'arbre phylogénétique basé sur les 5 espèces fondatrices de Serina
    const rootSpecies = [
      {
        id: 'canary_root',
        name: 'Canari ancestral',
        generation: 0,
        population: 100,
        extinct: false,
        traits: { flight: 1.0, intelligence: 0.6, size: 0.3 }
      },
      {
        id: 'fish_root',
        name: 'Poissons tropicaux',
        generation: 0,
        population: 200,
        extinct: false,
        traits: { aquatic: 1.0, speed: 0.7, size: 0.2 }
      },
      {
        id: 'cricket_root',
        name: 'Grillons',
        generation: 0,
        population: 1000,
        extinct: false,
        traits: { reproduction: 0.9, size: 0.1, adaptation: 0.8 }
      },
      {
        id: 'ant_root',
        name: 'Fourmis de feu',
        generation: 0,
        population: 5000,
        extinct: false,
        traits: { social: 1.0, organization: 0.9, size: 0.05 }
      },
      {
        id: 'snail_root',
        name: 'Escargots géants',
        generation: 0,
        population: 50,
        extinct: false,
        traits: { shell: 1.0, size: 0.8, longevity: 0.9 }
      }
    ];

    // Ajouter les espèces évoluées actuelles comme descendants
    const evolutionTree: TreeNode[] = rootSpecies.map(root => ({
      ...root,
      children: []
    }));

    // Associer les espèces actuelles aux lignées ancestrales
    simulationData.species.forEach(species => {
      const parentId = getParentLineage(species.name);
      const parent = evolutionTree.find(p => p.id === parentId);
      
      if (parent) {
        parent.children.push({
          id: species.id,
          name: species.name,
          generation: species.generationSpan,
          population: species.populationCount,
          extinct: species.extinctionRisk > 0.8,
          traits: species.averageTrait,
          children: []
        });
      }
    });

    setTreeData(evolutionTree);
    drawTree(evolutionTree);
  };

  const getParentLineage = (speciesName: string): string => {
    const name = speciesName.toLowerCase();
    if (name.includes('canaria') || name.includes('bird') || name.includes('oiseau')) return 'canary_root';
    if (name.includes('fish') || name.includes('poisson') || name.includes('xiphophorus') || name.includes('poecilia')) return 'fish_root';
    if (name.includes('cricket') || name.includes('gryllus') || name.includes('grillon')) return 'cricket_root';
    if (name.includes('ant') || name.includes('solenopsis') || name.includes('fourmi')) return 'ant_root';
    if (name.includes('snail') || name.includes('achatina') || name.includes('escargot')) return 'snail_root';
    return 'canary_root'; // Par défaut, lignée aviaire
  };

  const drawTree = (tree: TreeNode[]) => {
    const svg = svgRef.current;
    if (!svg) return;

    // Nettoyer le SVG
    svg.innerHTML = '';

    const width = 800;
    const height = 600;
    const levelHeight = 120;
    const nodeRadius = 25;

    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());

    // Dessiner chaque lignée
    tree.forEach((root, index) => {
      const rootX = (width / tree.length) * (index + 0.5);
      const rootY = 80;

      // Dessiner le nœud racine
      drawNode(svg, root, rootX, rootY, true);

      // Dessiner les descendants
      root.children.forEach((child, childIndex) => {
        const childX = rootX + (childIndex - (root.children.length - 1) / 2) * 100;
        const childY = rootY + levelHeight;

        // Ligne de connexion
        drawConnection(svg, rootX, rootY + nodeRadius, childX, childY - nodeRadius);
        
        // Nœud enfant
        drawNode(svg, child, childX, childY, false);
      });
    });
  };

  const drawNode = (svg: SVGSVGElement, node: TreeNode, x: number, y: number, isRoot: boolean) => {
    // Groupe pour le nœud
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'tree-node');
    group.style.cursor = 'pointer';

    // Cercle du nœud
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', isRoot ? '30' : '25');
    circle.setAttribute('fill', node.extinct ? '#ef4444' : isRoot ? '#3b82f6' : '#10b981');
    circle.setAttribute('stroke', '#1f2937');
    circle.setAttribute('stroke-width', '2');

    // Texte du nom (simplifié)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + 40).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('fill', '#1f2937');
    text.textContent = node.name.split(' ')[0]; // Premier mot seulement

    // Population (si pas racine)
    if (!isRoot) {
      const popText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      popText.setAttribute('x', x.toString());
      popText.setAttribute('y', (y + 52).toString());
      popText.setAttribute('text-anchor', 'middle');
      popText.setAttribute('font-size', '8');
      popText.setAttribute('font-family', 'Arial');
      popText.setAttribute('fill', '#6b7280');
      popText.textContent = `Pop: ${node.population.toLocaleString()}`;
      group.appendChild(popText);
    }

    // Événement de clic
    group.addEventListener('click', () => setSelectedNode(node));

    group.appendChild(circle);
    group.appendChild(text);
    svg.appendChild(group);
  };

  const drawConnection = (svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', '#6b7280');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  };

  const getEvolutionaryStory = (species: TreeNode): string => {
    const stories = {
      'canary_root': 'Les canaris, seuls oiseaux de Serina, ont évolué pour occuper toutes les niches écologiques aviaires.',
      'fish_root': 'Poissons tropicaux diversifiés dans les eaux douces et salées de Serina.',
      'cricket_root': 'Grillons adaptés aux environnements terrestres, base de nombreuses chaînes alimentaires.',
      'ant_root': 'Fourmis de feu développant des sociétés complexes et colonisant tous les habitats.',
      'snail_root': 'Escargots géants évoluant vers des formes terrestres et aquatiques variées.'
    };

    const ancestralStory = stories[species.id as keyof typeof stories];
    if (ancestralStory) return ancestralStory;

    const parentId = getParentLineage(species.name);
    const baseStory = stories[parentId as keyof typeof stories] || 'Espèce évoluée unique de Serina.';
    
    return `${baseStory} Cette lignée a développé des adaptations spécialisées pour sa niche écologique.`;
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">🌳 Arbre Évolutif de Serina</h3>
        <div className="text-sm text-gray-600">
          Génération actuelle: {simulationData?.generation || 0}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <svg
            ref={svgRef}
            className="border border-gray-300 rounded-lg w-full"
            style={{ maxHeight: '500px' }}
          ></svg>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🧬 Lignées Fondatrices</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Espèces ancestrales</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Descendants actuels</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Espèces éteintes</span>
              </div>
            </div>
          </div>

          {selectedNode && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">
                📊 {selectedNode.name}
              </h4>
              <div className="space-y-1 text-sm text-amber-700">
                <div><strong>Génération:</strong> {selectedNode.generation}</div>
                <div><strong>Population:</strong> {selectedNode.population.toLocaleString()}</div>
                <div><strong>Statut:</strong> {selectedNode.extinct ? '💀 Éteinte' : '✅ Active'}</div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                {getEvolutionaryStory(selectedNode)}
              </p>
            </div>
          )}

          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">📈 Statistiques Évolutives</h4>
            <div className="space-y-1 text-sm text-green-700">
              <div>Lignées actives: {treeData.filter(t => t.children.length > 0).length}</div>
              <div>Espèces totales: {treeData.reduce((sum, t) => sum + t.children.length, 0)}</div>
              <div>Espèces éteintes: {treeData.reduce((sum, t) => sum + t.children.filter(c => c.extinct).length, 0)}</div>
              <div>Diversité génétique: {simulationData?.evolutionStats?.geneticDiversity?.toFixed(3) || 'N/A'}</div>
              <div>Mutations totales: {simulationData?.evolutionStats?.totalMutations?.toLocaleString() || 'N/A'}</div>
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">⚡ Pressions Sélectives</h4>
            <div className="space-y-1 text-sm text-amber-700">
              <div>Prédation: {((simulationData?.worldState?.environment?.predationPressure || 0) * 100).toFixed(0)}%</div>
              <div>Maladies: {((simulationData?.worldState?.environment?.diseaseLoad || 0) * 100).toFixed(0)}%</div>
              <div>Ressources: {((simulationData?.worldState?.environment?.resourceAbundance || 0) * 100).toFixed(0)}%</div>
              <div>Température: {simulationData?.worldState?.environment?.temperature?.toFixed(1) || 'N/A'}°C</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h5 className="font-semibold text-purple-800 mb-2">🌍 L'Histoire Évolutive de Serina</h5>
        <p className="text-sm text-purple-700">
          Il y a des millions d'années, cinq espèces terrestres ont été introduites sur Serina : 
          des canaris, des poissons tropicaux (guppys et porte-épées), des grillons, des fourmis de feu, 
          et des escargots géants d'Afrique. Ces lignées fondatrices ont évolué pour remplir 
          tous les rôles écologiques d'un écosystème complet, créant un monde unique où les oiseaux 
          règnent en maîtres et où chaque niche a été colonisée par leurs descendants spécialisés.
        </p>
      </div>
    </div>
  );
}