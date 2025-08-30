export const PLAYER_STYLES = [
  '右シェーク裏×裏型',
  '右シェーク裏×表型',
  '右シェーク裏×異質型',
  '左シェーク裏×裏型',
  '左シェーク裏×表型',
  '左シェーク裏×異質型',
  '右カットマン',
  '左カットマン',
  '右ペン攻撃型',
  '左ペン攻撃型',
] as const;

export type PlayerStyle = typeof PLAYER_STYLES[number];
