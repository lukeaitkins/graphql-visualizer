import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useMemo } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const Graph = ({ data, onSelect }) => {
  const fgRef = useRef();

  const NODE_R = 8;

  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  const updateHighlight = () => {
    setHighlightNodes(highlightNodes);
    setHighlightLinks(highlightLinks);
  };

  const handleNodeHover = (node) => {
    highlightNodes.clear();
    highlightLinks.clear();
    if (node) {
      highlightNodes.add(node);
      (node.neighbors || []).forEach((neighbor) =>
        highlightNodes.add(neighbor)
      );
      (node.links || []).forEach((link) => highlightLinks.add(link));
    }

    setHoverNode(node || null);
    updateHighlight();
  };

  const handleLinkHover = (link) => {
    highlightNodes.clear();
    highlightLinks.clear();

    if (link) {
      highlightLinks.add(link);
      highlightNodes.add(link.source);
      highlightNodes.add(link.target);
    }

    updateHighlight();
  };

  const paintRing = useCallback(
    ({ id, isRoot, x, y }, ctx) => {
      if (isRoot) {
        ctx.strokeStyle = "green";
        ctx.strokeRect(x - 14, y - 5, 28, 10);
        if (hoverNode && id === hoverNode.id) {
          ctx.fillStyle = "orange";
          ctx.fillRect(x - 14, y - 5, 28, 10);
        }
      } else {
        ctx.strokeStyle = "grey";
        ctx.beginPath();
        ctx.ellipse(x, y, 14, 5, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = "#eee";
        if (hoverNode && id === hoverNode.id) {
          ctx.fillStyle = "orange";
        }
        ctx.fill();
      }
      ctx.fillStyle = "#333";
      ctx.font = "5px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(id, x, y);
    },
    [hoverNode]
  );

  const fullData = useMemo(() => {
    if (!data.nodes) return data;

    data.links.forEach((link) => {
      const a = data.nodes.find((n) => n.id === link.source);
      const b = data.nodes.find((n) => n.id === link.target);
      if (!a || !b) return console.log(link, data.nodes);
      !a.neighbors && (a.neighbors = []);
      !b.neighbors && (b.neighbors = []);
      a.neighbors.push(b);
      b.neighbors.push(a);

      !a.links && (a.links = []);
      !b.links && (b.links = []);
      a.links.push(link);
      b.links.push(link);
    });

    return data;
  }, [data]);

  return (
    <div className="graph-holder">
      <ForceGraph2D
        ref={fgRef}
        graphData={fullData || genRandomTree(20)}
        onNodeClick={onSelect}
        nodeLabel="id"
        linkDirectionalArrowLength={3.5}
        nodeRelSize={10}
        linkDirectionalArrowRelPos={8}
        cooldownTicks={100}
        onEngineStop={() =>
          fgRef.current.zoomToFit && fgRef.current.zoomToFit(400)
        }
        nodeRelSize={NODE_R}
        linkWidth={(link) => (highlightLinks.has(link) ? 5 : 1)}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={(link) =>
          highlightLinks.has(link) ? 4 : 0
        }
        nodeCanvasObject={paintRing}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        onNodeDragEnd={(node) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        width={800}
      />
    </div>
  );
};

export default Graph;
