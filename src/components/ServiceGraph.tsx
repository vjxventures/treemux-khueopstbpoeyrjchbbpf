"use client";

import { cn } from "@/lib/utils";

interface ServiceNode {
  name: string;
  isAffected: boolean;
  isPrimary: boolean;
}

export function ServiceGraph({
  services,
  primaryService,
}: {
  services: string[];
  primaryService: string;
}) {
  const nodes: ServiceNode[] = services.map((name) => ({
    name,
    isAffected: true,
    isPrimary: name === primaryService,
  }));

  // Layout nodes in a circle
  const centerX = 140;
  const centerY = 90;
  const radius = 65;

  const positions = nodes.map((_, i) => {
    const angle = (i * 2 * Math.PI) / nodes.length - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-destructive" />
        Service Topology
      </h3>
      <div className="bg-surface-0 border border-border rounded-lg p-3 overflow-hidden">
        <svg viewBox="0 0 280 180" className="w-full h-auto">
          {/* Connection lines */}
          {positions.map((pos, i) =>
            positions.map((pos2, j) => {
              if (j <= i) return null;
              return (
                <line
                  key={`line-${i}-${j}`}
                  x1={pos.x}
                  y1={pos.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke="rgba(255, 51, 85, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })
          )}

          {/* Center hub */}
          <circle
            cx={centerX}
            cy={centerY}
            r="8"
            fill="rgba(255, 51, 85, 0.1)"
            stroke="rgba(255, 51, 85, 0.3)"
            strokeWidth="1"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill="#ff3355"
            className="status-pulse"
          />

          {/* Service nodes */}
          {nodes.map((node, i) => {
            const pos = positions[i];
            return (
              <g key={node.name}>
                {/* Connection to center */}
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={centerX}
                  y2={centerY}
                  stroke={node.isPrimary ? "rgba(255, 51, 85, 0.4)" : "rgba(255, 51, 85, 0.15)"}
                  strokeWidth={node.isPrimary ? "1.5" : "1"}
                />

                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={node.isPrimary ? "18" : "14"}
                  fill={node.isPrimary ? "rgba(255, 51, 85, 0.15)" : "rgba(255, 51, 85, 0.05)"}
                  stroke={node.isPrimary ? "#ff3355" : "rgba(255, 51, 85, 0.3)"}
                  strokeWidth={node.isPrimary ? "1.5" : "1"}
                />

                {/* Pulse ring for primary */}
                {node.isPrimary && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="18"
                    fill="none"
                    stroke="#ff3355"
                    strokeWidth="1"
                    opacity="0.4"
                    className="pulse-ring"
                  />
                )}

                {/* Inner dot */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="3"
                  fill={node.isPrimary ? "#ff3355" : "rgba(255, 51, 85, 0.6)"}
                  className={cn(node.isPrimary && "status-pulse")}
                />

                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + (node.isPrimary ? 28 : 24)}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: "7px", fontFamily: "var(--font-mono)" }}
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
