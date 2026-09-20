import { useSimulation } from '@services/SimulationContext';
import { useState, useEffect, useRef } from 'react';
import { GitBranch, Dna, BarChart3, TrendingUp, Zap, AlertTriangle, CheckCircle2, Globe2 } from 'lucide-react';
import { LineageStatus, SpeciationEventInfo } from '../types';

/** Population en dessous de laquelle une lignée est affichée comme
 * critique -- un fait directement observé (le compte réel d'individus
 * vivants), pas un score de risque calculé : UnifiedWorldSimulator ne
 * modélise pas encore de risque d'extinction (voir CONTRIBUTING.md). */
const CRITICAL_POPULATION_THRESHOLD = 5;

interface TreeNode {
  name: string;
  population: number;
  fitness: number;
  extinct: boolean;
  isRoot: boolean;
  /** Distance génétique réelle mesurée au moment de la scission (absente pour une racine fondatrice). */
  splitGeneration?: number;
  splitDistance?: number;
  children: TreeNode[];
}

const FOUNDER_STORIES: Record<string, string> = {
  'Serinus canaria': 'Les canaris, seuls oiseaux de Serina, ont évolué pour occuper toutes les niches écologiques aviaires.',
  'Xiphophorus hellerii': 'Porte-épées et guppys, diversifiés dans les eaux douces et salées de Serina.',
  'Gryllus seriensis': 'Grillons adaptés aux environnements terrestres, base de nombreuses chaînes alimentaires.',
  'Solenopsis invicta': 'Fourmis de feu développant des sociétés complexes et colonisant tous les habitats.',
  'Achatina fulica': 'Escargots géants évoluant vers des formes terrestres et aquatiques variées.'
};

/**
 * Construit le vrai arbre phylogénétique depuis l'historique réel des
 * spéciations (`speciationEvents` : parentSpecies -> newSpecies, avec la
 * génération et la distance génétique mesurée à la scission) au lieu de
 * deviner la filiation par correspondance de préfixe de nom. Les racines
 * sont les espèces qui n'apparaissent jamais comme `newSpecies` -- les
 * cinq fondatrices, sans les coder en dur.
 */
function buildRealTree(lineages: LineageStatus[], events: SpeciationEventInfo[]): TreeNode[] {
  const byName = new Map<string, LineageStatus>(lineages.map((l) => [l.speciesName, l]));
  const childrenOf = new Map<string, SpeciationEventInfo[]>();
  const hasParent = new Set<string>();

  events.forEach((event) => {
    if (!childrenOf.has(event.parentSpecies)) childrenOf.set(event.parentSpecies, []);
    childrenOf.get(event.parentSpecies)!.push(event);
    hasParent.add(event.newSpecies);
  });

  const toNode = (name: string, splitEvent?: SpeciationEventInfo): TreeNode => {
    const lineage = byName.get(name);
    const children = (childrenOf.get(name) ?? []).map((event) => toNode(event.newSpecies, event));
    return {
      name,
      population: lineage?.population ?? 0,
      fitness: lineage?.averageFitness ?? 0,
      extinct: lineage ? lineage.population <= CRITICAL_POPULATION_THRESHOLD : true,
      isRoot: !splitEvent,
      splitGeneration: splitEvent?.generation,
      splitDistance: splitEvent?.geneticDistanceAtSplit,
      children
    };
  };

  // Racines : toute espèce vivante ou ayant existé (apparaît côté parent ou
  // encore vivante) qui n'a jamais été le résultat d'une scission.
  const allKnownNames = new Set<string>([...byName.keys(), ...events.map((e) => e.parentSpecies)]);
  const roots = Array.from(allKnownNames).filter((name) => !hasParent.has(name));
  return roots.map((name) => toNode(name));
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function countCritical(node: TreeNode): number {
  const self = node.isRoot ? 0 : node.extinct ? 1 : 0;
  return node.children.reduce((sum, child) => sum + countCritical(child), self);
}

export function SpeciesEvolutionTree() {
  const { simulationData } = useSimulation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!simulationData?.status.lineages || !simulationData.lineages.speciationEvents) return;
    const tree = buildRealTree(simulationData.status.lineages, simulationData.lineages.speciationEvents);
    setTreeData(tree);
    drawTree(tree);

    // Redessine si le conteneur change de taille (redimensionnement de
    // fenêtre, repli du rail latéral...) -- évite un arbre figé à la largeur
    // du tout premier rendu.
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => drawTree(tree));
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationData]);

  const drawTree = (tree: TreeNode[]) => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.innerHTML = '';

    // Largeur proportionnelle au nombre de feuilles de chaque racine, pour
    // que des arbres réellement plus ramifiés prennent plus de place --
    // mais jamais moins que la largeur réelle disponible à l'écran, pour
    // qu'un petit arbre remplisse quand même tout l'espace plutôt que de
    // laisser une bande vide. Rendu à l'échelle 1:1 (largeur/hauteur SVG en
    // pixels, pas en pourcentage) dans un conteneur défilant horizontalement
    // -- jamais de redimensionnement implicite qui écraserait ou couperait
    // les nœuds (bug réel signalé : arbre trop étroit, dépasse par moments).
    const availableWidth = containerRef.current?.clientWidth ?? 800;
    const leafCounts = tree.map((root) => Math.max(1, countDescendants(root)));
    const totalLeaves = leafCounts.reduce((a, b) => a + b, 0) || 1;
    const width = Math.max(availableWidth - 4, totalLeaves * 65);
    const levelHeight = 100;
    const nodeRadius = 18;

    // Profondeur maximale réelle, pour dimensionner la hauteur du SVG plutôt
    // que de couper un arbre à plusieurs niveaux de spéciations imbriquées.
    const depthOf = (node: TreeNode): number =>
      node.children.length ? 1 + Math.max(...node.children.map(depthOf)) : 0;
    const maxDepth = Math.max(0, ...tree.map(depthOf));
    const height = 100 + (maxDepth + 1) * levelHeight;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));

    let cursor = 0;
    const layout = (node: TreeNode, depth: number): number => {
      const leaves = Math.max(1, countDescendants(node) || 1);
      const slotWidth = (leaves / totalLeaves) * width;
      const x = cursor + slotWidth / 2;
      cursor += slotWidth;
      const y = 60 + depth * levelHeight;

      node.children.forEach((child) => {
        const childX = layout(child, depth + 1);
        drawConnection(svg, x, y + nodeRadius, childX, y + levelHeight - nodeRadius);
      });

      drawNode(svg, node, x, y, nodeRadius);
      return x;
    };

    tree.forEach((root) => layout(root, 0));
  };

  const drawNode = (svg: SVGSVGElement, node: TreeNode, x: number, y: number, nodeRadius: number) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'pointer';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', (node.isRoot ? nodeRadius * 1.2 : nodeRadius).toString());
    circle.setAttribute('fill', node.extinct ? '#f87171' : node.isRoot ? '#38bdf8' : '#34d399');
    circle.setAttribute('stroke', '#0f172a');
    circle.setAttribute('stroke-width', '2');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + nodeRadius + 14).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('fill', '#e2e8f0');
    text.textContent = node.name.split(' ')[0];

    group.appendChild(circle);
    group.appendChild(text);

    if (!node.isRoot) {
      const popText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      popText.setAttribute('x', x.toString());
      popText.setAttribute('y', (y + nodeRadius + 26).toString());
      popText.setAttribute('text-anchor', 'middle');
      popText.setAttribute('font-size', '8');
      popText.setAttribute('font-family', 'Arial');
      popText.setAttribute('fill', '#94a3b8');
      popText.textContent = `Pop: ${node.population.toLocaleString()}`;
      group.appendChild(popText);
    }

    group.addEventListener('click', () => setSelectedNode(node));
    svg.appendChild(group);
  };

  const drawConnection = (svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', '#475569');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  };

  const getEvolutionaryStory = (node: TreeNode): string => {
    if (node.isRoot) return FOUNDER_STORIES[node.name] ?? 'Lignée fondatrice de Serina.';
    return `Scission réelle observée à la génération ${node.splitGeneration} ` +
      `(distance génétique mesurée : ${node.splitDistance?.toFixed(3)}). ` +
      `Cette lignée a développé des adaptations spécialisées pour sa niche écologique.`;
  };

  const status = simulationData?.status;
  const regions = simulationData?.regions.regions ?? [];
  const avgPredationPressure = regions.length
    ? regions.reduce((sum, r) => sum + r.predationPressure, 0) / regions.length
    : 0;
  const avgTemperature = regions.length
    ? regions.reduce((sum, r) => sum + r.temperature, 0) / regions.length
    : 0;

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2"><GitBranch className="w-5 h-5" /> Arbre Évolutif de Serina</h3>
        <div className="text-sm text-slate-400">
          Génération actuelle : {status?.generation ?? 0}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-slate-700 rounded-lg bg-slate-950 overflow-x-auto" ref={containerRef}>
          <svg ref={svgRef} style={{ maxHeight: '500px', display: 'block' }}></svg>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-950 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-200 mb-2 flex items-center gap-1.5"><Dna className="w-4 h-4" /> Lignées Fondatrices</h4>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-sky-400 rounded-full"></div>
                <span>Espèces ancestrales</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-emerald-400 rounded-full"></div>
                <span>Descendants actuels</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                <span>Espèces en danger critique</span>
              </div>
            </div>
          </div>

          {selectedNode && (
            <div className="bg-amber-950 p-3 rounded-lg border border-amber-800">
              <h4 className="font-semibold text-amber-200 mb-2 flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> {selectedNode.name}</h4>
              <div className="space-y-1 text-sm text-amber-300">
                {!selectedNode.isRoot && (
                  <>
                    <div><strong>Population :</strong> {selectedNode.population.toLocaleString()}</div>
                    <div><strong>Fitness :</strong> {(selectedNode.fitness * 100).toFixed(0)}%</div>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <strong>Statut :</strong>
                  {selectedNode.extinct
                    ? <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Population critique (≤ {CRITICAL_POPULATION_THRESHOLD})</span>
                    : <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>}
                </div>
              </div>
              <p className="text-xs text-amber-400 mt-2">{getEvolutionaryStory(selectedNode)}</p>
            </div>
          )}

          <div className="ecosystem-stat">
            <h4 className="font-semibold text-ecosystem-200 mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Statistiques Évolutives</h4>
            <div className="space-y-1 text-sm text-ecosystem-300">
              <div>Lignées fondatrices : {treeData.length}</div>
              <div>Espèces issues de spéciation : {treeData.reduce((sum, t) => sum + countDescendants(t), 0)}</div>
              <div>Espèces en population critique : {treeData.reduce((sum, t) => sum + countCritical(t), 0)}</div>
              <div>Diversité génétique moyenne : {status && status.lineages.length
                ? (status.lineages.reduce((sum, l) => sum + l.geneticDiversity, 0) / status.lineages.length).toFixed(2)
                : 'N/A'}</div>
              <div>Spéciations totales : {status?.speciationEventCount ?? 'N/A'}</div>
            </div>
          </div>

          <div className="bg-amber-950 p-3 rounded-lg">
            <h4 className="font-semibold text-amber-200 mb-2 flex items-center gap-1.5"><Zap className="w-4 h-4" /> Pressions Sélectives (moyenne sur toutes les régions)</h4>
            <div className="space-y-1 text-sm text-amber-300">
              <div>Prédation : {(avgPredationPressure * 100).toFixed(0)}%</div>
              <div>Température : {avgTemperature.toFixed(1)}°C</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-genetic-950 border border-genetic-800 rounded-lg">
        <h5 className="font-semibold text-genetic-200 mb-2 flex items-center gap-1.5"><Globe2 className="w-4 h-4" /> L'Histoire Évolutive de Serina</h5>
        <p className="text-sm text-genetic-300">
          Il y a des millions d'années, cinq espèces terrestres ont été introduites sur Serina :
          des canaris, des poissons tropicaux (guppys et porte-épées), des grillons, des fourmis de feu,
          et des escargots géants d'Afrique. Ces lignées fondatrices ont évolué pour remplir
          tous les rôles écologiques d'un écosystème complet. Chaque branche de l'arbre ci-dessus
          correspond à un événement de spéciation réellement survenu pendant cette simulation, pas
          à une histoire écrite à l'avance.
        </p>
      </div>
    </div>
  );
}
