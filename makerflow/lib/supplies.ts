import type { SupplyMovementType } from "./types";

// Categorias mais comuns pra insumos de acabamento/producao — sugestoes pro
// combobox de categoria, que continua editavel pra qualquer outra categoria.
export const SUPPLY_CATEGORY_SUGGESTIONS = [
  "Embalagem",
  "Acabamento",
  "Adesivos e Fixação",
  "Limpeza e Manutenção",
  "Eletrônicos e Acessórios",
  "Apresentação e Marketing",
] as const;

export const SUPPLY_MOVEMENT_TYPE_LABELS: Record<SupplyMovementType, string> = {
  purchase: "Compra",
  sale_consumption: "Consumo em venda",
  manual_adjustment: "Ajuste manual",
};
