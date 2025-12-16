/**
 * 2つのASTが構造的に同一であるかをチェックする（ディープ比較）
 * 厳密ではないが、現在の実装を最も簡単にする方法。
 * @param f1 Formula 1
 * @param f2 Formula 2
 * @returns 同一であれば true
 */
function isFormulaEqual(f1, f2) {
    return JSON.stringify(f1) === JSON.stringify(f2);
}
/**
 * ユーザーの選択に基づいて、推論を実行する関数
 * @param state 現在の証明状態
 * @param rule ユーザーが選択した規則
 * @param selectedStepIds 規則を適用する対象の行（ID）
 * @returns 適用後の新しい証明状態
 */
export function applyRule(state, rule, selectedStepIds, newFormulaAst) {
    // --- 規則: モーダスポネンス (MP) の適用 ---
    if (rule === 'MP') {
        if (selectedStepIds.length !== 2) {
            throw new Error(`MP (Modus Ponens) requires exactly two premises.`);
        }
        const premises = selectedStepIds
            .map(id => state.currentSteps.find(step => step.id === id))
            .filter((step) => !!step);
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
                const newStep = {
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
                const newStep = {
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
            .filter((step) => !!step);
        const [premiseA, premiseB] = premises;
        // 結論 A /\ B を導出 (前提の順序に関係なく A /\ B を作る)
        const newFormula = {
            type: 'BINARY',
            connective: 'AND',
            left: premiseA.formula,
            right: premiseB.formula,
        };
        // 新しいステップを生成
        const newStep = {
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
            const newFormula = rule === 'CE_LEFT'
                ? premise.formula.left // 左側 (A) を導出
                : premise.formula.right; // 右側 (B) を導出
            const newStep = {
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
            const newFormula = premise.formula.formula.formula;
            const newStep = {
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
        const newFormula = {
            type: 'BINARY',
            connective: 'OR',
            // 🌟 規則名に応じて左右を切り替える
            // DI_LEFT なら left: P, right: Q
            left: rule === 'DI_LEFT' ? premise.formula : newFormulaAst,
            // DI_LEFT なら right: Q, DI_RIGHT なら P
            right: rule === 'DI_LEFT' ? newFormulaAst : premise.formula,
        };
        // 新しいステップを生成
        const newStep = {
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
            .filter((step) => !!step);
        if (premises.length !== 2) {
            throw new Error("One or both selected steps were not found.");
        }
        const [p1, p2] = premises;
        let disjunctionFormulaCandidate; // A ∨ B のAST候補
        let negationFormulaCandidate; // ¬X のAST候補
        // 1. 選言と否定の前提を特定する
        if (p1.formula.type === 'BINARY' && p1.formula.connective === 'OR') {
            disjunctionFormulaCandidate = p1.formula;
            negationFormulaCandidate = p2.formula;
        }
        else if (p2.formula.type === 'BINARY' && p2.formula.connective === 'OR') {
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
            const disjunction = disjunctionFormulaCandidate;
            const negation = negationFormulaCandidate;
            const negatedFormula = negation.formula; // 否定されている中身 (X)
            let conclusion = null;
            // ケース 1: 否定前提が ¬A (選言の左側) と一致する場合
            if (isFormulaEqual(disjunction.left, negatedFormula)) {
                conclusion = disjunction.right; // 結論は B
            }
            // ケース 2: 否定前提が ¬B (選言の右側) と一致する場合
            else if (isFormulaEqual(disjunction.right, negatedFormula)) {
                conclusion = disjunction.left; // 結論は A
            }
            if (conclusion) {
                const newStep = {
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
    }
    throw new Error(`Rule ${rule} is not yet implemented.`);
}
