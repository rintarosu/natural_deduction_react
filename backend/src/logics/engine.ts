import type { Formula, ProofState, ProofStep, RuleName } from './types.js';

/**
 * 2つのASTが構造的に同一であるかをチェックする（ディープ比較）
 * 厳密ではないが、現在の実装を最も簡単にする方法。
 * @param f1 Formula 1
 * @param f2 Formula 2
 * @returns 同一であれば true
 */
function isFormulaEqual(f1: Formula, f2: Formula): boolean {
    return JSON.stringify(f1) === JSON.stringify(f2);
}

/**
 * ユーザーの選択に基づいて、推論を実行する関数
 * @param state 現在の証明状態
 * @param rule ユーザーが選択した規則
 * @param selectedStepIds 規則を適用する対象の行（ID）
 * @returns 適用後の新しい証明状態
 */
export function applyRule(
  state: ProofState,
  rule: RuleName,
  selectedStepIds: number[],
  newFormulaAst?: Formula
): ProofState {
    
    // --- 規則: モーダスポネンス (MP) の適用 ---
    if (rule === 'MP') {
        if (selectedStepIds.length !== 2) {
            throw new Error(`MP (Modus Ponens) requires exactly two premises.`);
        }

        const premises = selectedStepIds
            .map(id => state.currentSteps.find(step => step.id === id))
            .filter((step): step is ProofStep => !!step);
        
        if (premises.length !== 2) {
            throw new Error("One or both selected steps were not found.");
        }

        const [p1, p2] = premises;

        // 🌟 処理 1: p1が含意 (A -> B) の場合
        if (p1.formula.type === 'BINARY' && p1.formula.connective === 'IMPLIES') {
            const implication = p1.formula; // TypeScriptはここで implication が BINARY であると推論する
            const antecedent = p2.formula; 
    
            if (isFormulaEqual(implication.left, antecedent)) {
                // 結論 B を導出 (implication.right)
                const newFormula = implication.right;
                
                const newStep: ProofStep = {
                    id: state.nextId,
                    formula: newFormula,
                    rule: rule,
                    justification: selectedStepIds,
                    depth: Math.max(p1.depth, p2.depth), 
                };

                return {
                    ...state,
                    currentSteps: [...state.currentSteps, newStep],
                    nextId: state.nextId + 1,
                };
            }
        } 
        
        // 🌟 処理 2: p2が含意 (A -> B) の場合
        if (p2.formula.type === 'BINARY' && p2.formula.connective === 'IMPLIES') {
            const implication = p2.formula;
            const antecedent = p1.formula;
    
            if (isFormulaEqual(implication.left, antecedent)) {
                // 結論 B を導出 (implication.right)
                const newFormula = implication.right;
                
                const newStep: ProofStep = {
                    id: state.nextId,
                    formula: newFormula,
                    rule: rule,
                    justification: selectedStepIds,
                    depth: Math.max(p1.depth, p2.depth), 
                };

                return {
                    ...state,
                    currentSteps: [...state.currentSteps, newStep],
                    nextId: state.nextId + 1,
                };
            }
        }
        
        // 規則が適用できない場合
        throw new Error('MP: The selected premises do not match the form (A -> B) and A.');
    }

    else if (rule === 'CI') {
        if (selectedStepIds.length !== 2) {
            throw new Error(`CI (Conjunction Introduction) requires exactly two premises.`);
        }

        const premises = selectedStepIds
            .map(id => state.currentSteps.find(step => step.id === id))
            .filter((step): step is ProofStep => !!step);
        
        const [premiseA, premiseB] = premises;
        
        // 結論 A /\ B を導出 (前提の順序に関係なく A /\ B を作る)
        const newFormula: Formula = {
            type: 'BINARY',
            connective: 'AND',
            left: premiseA.formula,
            right: premiseB.formula,
        };
        
        // 新しいステップを生成
        const newStep: ProofStep = {
            id: state.nextId,
            formula: newFormula,
            rule: rule,
            justification: selectedStepIds,
            depth: Math.max(premiseA.depth, premiseB.depth),
        };
        
        return {
            ...state,
            currentSteps: [...state.currentSteps, newStep],
            nextId: state.nextId + 1,
        };
    }
    
    // --- 規則: 連言の除去 (CE_LEFT / CE_RIGHT) の適用 ---
    else if (rule === 'CE_LEFT' || rule === 'CE_RIGHT') {
        if (selectedStepIds.length !== 1) {
            throw new Error(`Conjunction Elimination requires exactly one premise.`);
        }

        const premise = state.currentSteps.find(step => step.id === selectedStepIds[0]);
        
        if (!premise) {
            throw new Error("Selected step was not found.");
        }
        
        // 前提が BINARY型 かつ AND結合子かチェック (A /\ B の形式か？)
        if (premise.formula.type === 'BINARY' && premise.formula.connective === 'AND') {
            
            const newFormula: Formula = rule === 'CE_LEFT' 
                ? premise.formula.left  // 左側 (A) を導出
                : premise.formula.right; // 右側 (B) を導出

            const newStep: ProofStep = {
                id: state.nextId,
                formula: newFormula,
                rule: rule,
                justification: selectedStepIds,
                depth: premise.depth,
            };
            
            return {
                ...state,
                currentSteps: [...state.currentSteps, newStep],
                nextId: state.nextId + 1,
            };
        }

        throw new Error('CE: The selected premise must be a Conjunction (A /\\ B).');
    }

    // --- 規則: 二重否定の除去 (DN) の適用 ---
    else if (rule === 'DN') {
        if (selectedStepIds.length !== 1) {
            throw new Error(`DN (Double Negation) requires exactly one premise.`);
        }

        const premise = state.currentSteps.find(step => step.id === selectedStepIds[0]);
        
        if (!premise) {
            throw new Error("Selected step was not found.");
        }
        
        // 前提が 'NOT' かつ、そのformulaも 'NOT' かチェック (¬¬A の形式か？)
        if (premise.formula.type === 'NOT' && premise.formula.formula.type === 'NOT') {
            
            // 結論 A を導出 (内側のNOTが持つ formula を取り出す)
            const newFormula: Formula = premise.formula.formula.formula;

            const newStep: ProofStep = {
                id: state.nextId,
                formula: newFormula,
                rule: rule,
                justification: selectedStepIds,
                depth: premise.depth,
            };
            
            return {
                ...state,
                currentSteps: [...state.currentSteps, newStep],
                nextId: state.nextId + 1,
            };
        }

        throw new Error('DN: The selected premise must be a Double Negation (¬¬A).');
    }
    // --- 規則: 選言の導入 (DI_LEFT / DI_RIGHT) の適用 ---
    else if (rule === 'DI_LEFT' || rule === 'DI_RIGHT') {
        
        if (selectedStepIds.length !== 1) {
            throw new Error(`DI requires exactly one premise (P).`);
        }
        
        // 🌟 newFormulaAst が引数として渡されているかをチェック
        if (!newFormulaAst) { 
             throw new Error(`DI requires a secondary formula (Q) to be provided.`);
        }
        
        const premise = state.currentSteps.find(step => step.id === selectedStepIds[0]);
        
        if (!premise) {
            throw new Error("Selected step was not found.");
        }
        
        // 結論の論理式 (P ∨ Q または Q ∨ P) を決定
        const newFormula: Formula = {
            type: 'BINARY',
            connective: 'OR',
            // 🌟 規則名に応じて左右を切り替える
            // DI_LEFT なら left: P, right: Q
            left: rule === 'DI_LEFT' ? premise.formula : newFormulaAst, 
            // DI_LEFT なら right: Q, DI_RIGHT なら P
            right: rule === 'DI_LEFT' ? newFormulaAst : premise.formula, 
        };
        
        // 新しいステップを生成
        const newStep: ProofStep = {
            id: state.nextId,
            formula: newFormula,
            rule: rule, // DI_LEFT または DI_RIGHT
            justification: selectedStepIds,
            depth: premise.depth,
        };
        
        return {
            ...state,
            currentSteps: [...state.currentSteps, newStep],
            nextId: state.nextId + 1,
        };
    } 

    // --- 規則: 選言三段論法 (DS) の適用 ---
    else if (rule === 'DS') {
        if (selectedStepIds.length !== 2) {
            throw new Error(`DS (Disjunctive Syllogism) requires exactly two premises.`);
        }

        const premises = selectedStepIds
            .map(id => state.currentSteps.find(step => step.id === id))
            .filter((step): step is ProofStep => !!step);
        
        if (premises.length !== 2) {
             throw new Error("One or both selected steps were not found.");
        }

        const [p1, p2] = premises;

        let disjunctionFormulaCandidate: Formula | undefined; // A ∨ B のAST候補
        let negationFormulaCandidate: Formula | undefined;    // ¬X のAST候補
        
        // 1. 選言と否定の前提を特定する
        if (p1.formula.type === 'BINARY' && p1.formula.connective === 'OR') {
            disjunctionFormulaCandidate = p1.formula;
            negationFormulaCandidate = p2.formula;
        } else if (p2.formula.type === 'BINARY' && p2.formula.connective === 'OR') {
            disjunctionFormulaCandidate = p2.formula;
            negationFormulaCandidate = p1.formula;
        }

        // 2. 核心の型ガードとロジックの実行
        if (disjunctionFormulaCandidate 
            && negationFormulaCandidate 
            && disjunctionFormulaCandidate.type === 'BINARY' // 冗長だが安全のため
            && negationFormulaCandidate.type === 'NOT') {
            
            // 🌟 最終手段: 型を安全に確定させる (disjunction は確実に BINARY 型!)
            //    これにより、.left や .right にアクセス可能になる
            const disjunction = disjunctionFormulaCandidate as { type: 'BINARY', connective: 'OR', left: Formula, right: Formula };
            const negation = negationFormulaCandidate;
            
            const negatedFormula = negation.formula; // 否定されている中身 (X)
            let conclusion: Formula | null = null; 
            
            // ケース 1: 否定前提が ¬A (選言の左側) と一致する場合
            if (isFormulaEqual(disjunction.left, negatedFormula)) {
                conclusion = disjunction.right; // 結論は B
            } 
            // ケース 2: 否定前提が ¬B (選言の右側) と一致する場合
            else if (isFormulaEqual(disjunction.right, negatedFormula)) {
                conclusion = disjunction.left; // 結論は A
            }
            
            if (conclusion) {
                const newStep: ProofStep = {
                    id: state.nextId,
                    formula: conclusion,
                    rule: rule,
                    justification: selectedStepIds,
                    depth: Math.max(p1.depth, p2.depth),
                };
                
                return {
                    ...state,
                    currentSteps: [...state.currentSteps, newStep],
                    nextId: state.nextId + 1,
                };
            }
        }
        
        // 規則が適用できない場合
        throw new Error('DS: Premises must be (A ∨ B) and (¬A or ¬B).');
    }// --- 🌟 追加: 含意の導入 (II) ---
    else if (rule === 'II') {
        if (selectedStepIds.length !== 2) {
            throw new Error(`II (Implication Introduction) requires exactly two steps: the Assumption and the Conclusion.`);
        }

        // 選択された2つのステップを取得
        const stepA = state.currentSteps.find(s => s.id === selectedStepIds[0]);
        const stepB = state.currentSteps.find(s => s.id === selectedStepIds[1]);

        if (!stepA || !stepB) {
            throw new Error("Selected steps not found.");
        }

        // どちらが「仮定(Assumption)」で、どちらが「結論(Conclusion)」か判定する
        // ユーザーがクリックした順序に依存しないように、ロジックで判定するのが親切です。
        
        let assumptionStep: ProofStep | null = null;
        let conclusionStep: ProofStep | null = null;

        // 判定ロジック:
        // 基本的に、仮定となる行は `rule: 'ASSUME'` であるはずです。
        // もし両方とも ASSUME だったり、どちらも違ったりする場合は、
        // 簡易的に「IDが小さい方（先に書かれた方）を仮定」とするか、
        // あるいはフロントエンドから「どちらが仮定か」を明示的に送る必要があります。
        
        // ここでは「rule === 'ASSUME' である方を仮定とする」という安全策を取ります。
        if (stepA.rule === 'ASSUME' && stepB.rule !== 'ASSUME') {
            assumptionStep = stepA;
            conclusionStep = stepB;
        } else if (stepB.rule === 'ASSUME' && stepA.rule !== 'ASSUME') {
            assumptionStep = stepB;
            conclusionStep = stepA;
        } else {
            // 両方ASSUME、あるいは両方派生形の場合は、IDが若い方を仮定とみなす（一般的な証明の流れ）
            if (stepA.id < stepB.id) {
                assumptionStep = stepA;
                conclusionStep = stepB;
            } else {
                assumptionStep = stepB;
                conclusionStep = stepA;
            }
        }
        
        // 念の為チェック
        if (!assumptionStep || !conclusionStep) throw new Error("Could not determine assumption and conclusion.");

        // 新しい論理式 P -> Q を作成
        const newFormula: Formula = {
            type: 'BINARY',
            connective: 'IMPLIES',
            left: assumptionStep.formula,  // P
            right: conclusionStep.formula  // Q
        };

        // 新しいステップを作成
        const newStep: ProofStep = {
            id: state.nextId,
            formula: newFormula,
            rule: 'II', // Implication Introduction
            justification: [assumptionStep.id, conclusionStep.id],
            depth: 0, // 解除されたのでdepthは0に戻る（あるいは前のdepth-1）
            isDischarged: false 
        };

        // 🌟 重要な処理: 仮定として使った行を「Discharged」状態に更新する
        // React/Redux的な不変性を保つため、mapで新しい配列を作ります
        const updatedSteps = state.currentSteps.map(step => {
            if (step.id === assumptionStep!.id) {
                return { ...step, isDischarged: true }; // フラグを立てる
            }
            return step;
        });

        return {
            ...state,
            currentSteps: [...updatedSteps, newStep], // 更新されたリスト + 新しい行
            nextId: state.nextId + 1,
        };
    }






    throw new Error(`Rule ${rule} is not yet implemented.`);
}