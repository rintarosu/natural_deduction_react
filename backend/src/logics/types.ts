// 論理定数（原子命題）の型
export type Proposition = string; // 例: 'P', 'Q', 'R'

// 結合子（コネクティブ）の種類
export type Connective = 'NOT' | 'AND' | 'OR' | 'IMPLIES';

// 字句解析で生成されるトークン（最小単位）の種類
export type TokenType = 
  'PROPOSITION' |   // P, Q, R などの原子命題
  'IMPLIES' |       // -> (含意)
  'AND' |           // /\ (連言)
  'OR' |            // \/ (選言)
  'NOT' |           // ~ (否定)
  'LEFT_PAREN' |    // (
  'RIGHT_PAREN' |   // )
  'EOF';            // End Of File (入力の終わりを示す特別なトークン)


  // 字句解析で生成されるトークン（最小単位）の型
export type Token = {
  type: TokenType; // トークンの種類 (例: 'AND')
  value: string;   // トークンに対応する実際の文字列 (例: '/\')
};

// 抽象構文木（AST）としての論理式の型
// union型（共用体型）を使って、論理式の種類を表現します。
export type Formula = 
  | { type: 'ATOM'; name: Proposition } // 原子命題 (例: P)
  | { type: 'NOT'; formula: Formula }   // 否定 (例: ¬P)
  | { type: 'BINARY'; connective: Connective; left: Formula; right: Formula }; // 二項結合子 (例: P -> Q)

export type RuleName = 
   'MP' |
   'CI' | // 連言の導入 (Conjunction Introduction)
  'CE_LEFT' | // 連言の除去 (左)
  'CE_RIGHT' | // 連言の除去 (右) 
  'DN'  | //二重否定の除去
  'DI_LEFT'  | //選言の導入(左)
  'DI_RIGHT' | //選言の導入(右)
  'DS'       | //選言の除去(というか選言三段論法)
  'II'       |
   'ASSUME'; 

// 証明の一つのステップ（木構造のノードに対応）
export type ProofStep = {
  id: number;
  formula: Formula; // AST
  rule: RuleName; // 使用した規則
  justification: number[]; // 根拠となる行番号
  depth: number; // 条件付き証明のための深さ（今は0でOK）
  isDischarged?: boolean;
};


// 証明全体の状態
export type ProofState = {
  premises: ProofStep[]; 
  goal: Formula;
  currentSteps: ProofStep[]; 
  nextId: number;
};