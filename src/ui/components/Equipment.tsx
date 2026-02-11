import type { McpServerInfo } from "../../engine/types.js";

interface EquipmentProps {
  servers: McpServerInfo[];
}

export function Equipment({ servers }: EquipmentProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Equipment (MCP Servers)</h2>
      {servers.length === 0 ? (
        <p className="text-gray-500">No MCP servers detected</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {servers.map((server) => (
            <div
              key={`${server.name}-${server.scope}`}
              className="bg-gray-800 px-3 py-1.5 rounded-lg text-sm"
            >
              <span>{server.name}</span>
              <span className="ml-2 text-xs text-gray-500">
                {server.scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
