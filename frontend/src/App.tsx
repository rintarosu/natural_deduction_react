import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🌟 初期証明状態の定義 (リセット用)
const INITIAL_PROOF_STATE = {
    // 目標は初期段階ではnull
    goal: null, 
    // 初期ステップは、P->Q と P の2行のみ
    currentSteps: [
        // 1行目 (ID: 1): P → Q
        { id: 1, formula: { type: 'BINARY', connective: 'IMPLIES', left: { type: 'ATOM', name: 'P' }, right: { type: 'ATOM', name: 'Q' } }, rule: 'ASSUME', justification: [], depth: 0 },
        // 2行目 (ID: 2): P
        { id: 2, formula: { type: 'ATOM', name: 'P' }, rule: 'ASSUME', justification: [], depth: 0 },
    ],
    nextId: 3
};

// Helper function to format the AST into a readable string for the UI
const formatFormula = (formula: any): string => {
    if (!formula) return 'Error';
    switch (formula.type) {
        case 'ATOM':
            return formula.name;
        case 'NOT':
            return `¬${formatFormula(formula.formula)}`;
        case 'BINARY':
            const left = formatFormula(formula.left);
            const right = formatFormula(formula.right);
            let connective = '';
            switch (formula.connective) {
                case 'AND': connective = ' ∧ '; break; 
                case 'OR': connective = ' ∨ '; break; 
                case 'IMPLIES': connective = ' → '; break; 
            }
            return `(${left}${connective}${right})`;
        default:
            return 'Invalid Formula';
    }
};

function App() {
    // --- 状態定義 ---
    const [proofState, setProofState] = useState<any>(INITIAL_PROOF_STATE);
    const [selectedSteps, setSelectedSteps] = useState<number[]>([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    // 前提入力フォームの状態
    const [inputFormula, setInputFormula] = useState('');
    const [parsedAst, setParsedAst] = useState<any>(null); 
    const [parseError, setParseError] = useState('');

    // DI規則用 Q 入力フォームの状態
    const [addQInput, setAddQInput] = useState(''); 
    const [parsedAddQAst, setParsedAddQAst] = useState<any>(null); 
    const [addQParseError, setAddQParseError] = useState(''); 

    // 目標設定用の状態
    const [goalInput, setGoalInput] = useState('');
    const [parsedGoalAst, setParsedGoalAst] = useState<any>(null); 
    const [goalParseError, setGoalParseError] = useState('');

    // --- ロジック関数 ---

    // 🌟 論理記号をフォームに追加するヘルパー関数
    const handleSymbolClick = (symbol: string, inputTarget: 'PREMISE' | 'GOAL' | 'ADD_Q') => {
        const valueToInsert = symbol;
        
        if (inputTarget === 'PREMISE') {
            setInputFormula(prev => prev + valueToInsert);
            setParsedAst(null);
            setParseError('');
        } else if (inputTarget === 'GOAL') {
            setGoalInput(prev => prev + valueToInsert);
            setParsedGoalAst(null);
            setGoalParseError('');
        } else if (inputTarget === 'ADD_Q') {
            setAddQInput(prev => prev + valueToInsert);
            setParsedAddQAst(null);
            setAddQParseError('');
        }
    };
    
    // 🌟 行がクリックされたときの処理 (選択/解除)
    const handleStepClick = (id: number) => {
        if (isLoading) return; 
        setSelectedSteps(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // 🌟 証明リセット関数
    const handleResetProof = () => {
        setProofState({
            ...INITIAL_PROOF_STATE,
            goal: proofState.goal // 目標はリセットせずに保持する
        });
        
        setSelectedSteps([]);
        setInputFormula('');
        setParsedAst(null);
        setParseError('');
        setAddQInput('');
        setParsedAddQAst(null);
        setAddQParseError('');
        setGoalInput('');
        setParsedGoalAst(null);
        setGoalParseError('');

        alert('証明がリセットされ、初期の前提に戻りました。');
    };

    // 🌟 論理式をASTに変換する API 呼び出し関数 (前提入力用)
    const handleParseFormula = async () => {
        setParsedAst(null); 
        setParseError('');
        if (!inputFormula) { setParseError('論理式を入力してください。'); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/api/parse`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formulaString: inputFormula }),
            });
            const data = await response.json();
            if (response.ok && data.success) { setParsedAst(data.formulaAst); } 
            else { setParseError(data.message || '解析に失敗しました。'); }
        } catch (error) { setParseError('サーバーとの通信エラー。'); console.error(error); }
    };

    // 🌟 ADD規則用のQを解析する関数
    const handleParseAddQ = async () => {
        setParsedAddQAst(null);
        setAddQParseError('');
        if (!addQInput) { setAddQParseError('追加したい論理式Qを入力してください。'); return; }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/parse`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formulaString: addQInput }),
            });
            const data = await response.json();

            if (response.ok && data.success) { setParsedAddQAst(data.formulaAst); } 
            else { setAddQParseError(data.message || 'Qの解析に失敗しました。'); }
        } catch (error) { setAddQParseError('サーバーとの通信エラー。'); console.error(error); }
    };
    
    // 🌟 構文解析されたASTを証明の前提として追加する関数
    const handleAddPremise = () => {
        if (!parsedAst) return;
        const newPremise = {
            id: proofState.nextId,
            formula: parsedAst,
            rule: 'ASSUME',
            justification: [],
            depth: 0,
        };
        setProofState({
            ...proofState,
            currentSteps: [...proofState.currentSteps, newPremise],
            nextId: proofState.nextId + 1,
        });
        setInputFormula('');
        setParsedAst(null);
    };

    // 🌟 目標の論理式をASTに変換する関数
    const handleParseGoal = async () => {
        setParsedGoalAst(null); 
        setGoalParseError('');
        if (!goalInput) { setGoalParseError('目標を入力してください。'); return; }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/parse`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formulaString: goalInput }),
            });
            const data = await response.json();

            if (response.ok && data.success) { setParsedGoalAst(data.formulaAst); } 
            else { setGoalParseError(data.message || '目標の解析に失敗しました。'); }
        } catch (error) { setGoalParseError('サーバーとの通信エラー。'); console.error(error); }
    };

    // 🌟 解析されたASTを証明の目標として設定する関数
    const handleSetGoal = () => {
        if (!parsedGoalAst) return;
        setProofState({ ...proofState, goal: parsedGoalAst });
        setGoalInput('');
        setParsedGoalAst(null);
    };

    // 🌟 規則適用API呼び出しの共通ロジック
    const callApplyRuleAPI = async (ruleName: string, stepIds: number[], newFormulaAst?: any) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/apply-rule`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: proofState, rule: ruleName, selectedStepIds: stepIds, newFormulaAst: newFormulaAst }),
            });
            const data = await response.json();

            if (response.ok && data.success) { 
                setProofState(data.newState);
                setSelectedSteps([]); 
            } else {
                console.error(`規則適用エラー (${ruleName}): ` + (data.message || '不明なエラー'));
                alert(`規則適用に失敗しました (${ruleName}): ` + (data.message || '不明なエラー'));
            }
        } catch (error) {
            alert('サーバーとの通信に失敗しました。バックエンドが起動しているか確認してください。');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // 🌟 MPロジック
    const handleApplyMP = () => { if (selectedSteps.length !== 2) { return; } callApplyRuleAPI('MP', selectedSteps); };

    // 🌟 CIロジック
    const handleApplyCI = () => { if (selectedSteps.length !== 2) { return; } callApplyRuleAPI('CI', selectedSteps); };

    // 🌟 CEロジック
    const handleApplyCE = (side: 'LEFT' | 'RIGHT') => { if (selectedSteps.length !== 1) { return; } callApplyRuleAPI(side === 'LEFT' ? 'CE_LEFT' : 'CE_RIGHT', selectedSteps); };

    // 🌟 DNロジック
    const handleApplyDN = () => { if (selectedSteps.length !== 1) { return; } callApplyRuleAPI('DN', selectedSteps); };

    // 🌟 選言三段論法 (DS) のロジックを呼び出す関数
    const handleApplyDS = () => {
    if (selectedSteps.length !== 2) {
        alert('DSを適用するには、前提を2つ選択してください。');
        return;
    }
    callApplyRuleAPI('DS', selectedSteps); // DS規則を送信
    };


    // 🌟 DIロジック
    const handleApplyDI = (side: 'LEFT' | 'RIGHT') => {
        if (selectedSteps.length !== 1 || !parsedAddQAst) { return; }
        callApplyRuleAPI(side === 'LEFT' ? 'DI_LEFT' : 'DI_RIGHT', selectedSteps, parsedAddQAst);
        setAddQInput(''); 
        setParsedAddQAst(null);
    };
    
    // 目標達成チェック
    const isGoalAchieved = proofState.currentSteps.some((step: any) => 
        proofState.goal && JSON.stringify(step.formula) === JSON.stringify(proofState.goal)
    );

    // --- UI (JSX) ---

    return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
            <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px', color: '#1f2937' }}>論理証明ゲーム</h1>
            
            {/* 🌟🌟 目標設定フォーム 🌟🌟 */}
            <h3 style={{ marginTop: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>目標論理式の設定</h3>
            <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '10px' }}>
                記号を直接入力するか、下のボタンをクリックしてください。
            </p>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                {['P', 'Q', 'R', '(', ')', '¬', '∧', '∨', '→'].map(symbol => (
                    <button key={`goal-${symbol}`} onClick={() => handleSymbolClick(symbol, 'GOAL')}
                        style={{ padding: '8px 12px', fontSize: '1.1em', backgroundColor: '#e6f6ff', border: '1px solid #91d5ff', borderRadius: '4px', cursor: 'pointer' }}>
                        {symbol}
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input type="text" value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="例: Q" style={{ flexGrow: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <button onClick={handleParseGoal} disabled={!goalInput}
                    style={{ padding: '10px 15px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>目標を解析</button>
            </div>
            
            {goalParseError && (<p style={{ color: 'red', marginTop: '10px' }}>エラー: {goalParseError}</p>)}

            {parsedGoalAst && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                    <p><strong>目標解析成功！</strong></p>
                    <p>ASTプレビュー: <span style={{ fontWeight: 'bold' }}>{formatFormula(parsedGoalAst)}</span></p>
                    <button onClick={handleSetGoal}
                        style={{ marginTop: '10px', padding: '8px 15px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        この式を目標に設定
                    </button>
                </div>
            )}
            
            {/* 🌟 リセットボタンの配置 🌟 */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                <button onClick={handleResetProof}
                    style={{ padding: '10px 20px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '6px' }}>
                    証明をリセット (Reset)
                </button>
            </div>
            
            <h2 style={{ color: isGoalAchieved ? 'green' : '#ff4500', marginBottom: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                目標: {proofState.goal ? formatFormula(proofState.goal) : '目標未設定'} {isGoalAchieved ? ' (達成!)' : ''}
            </h2>

            {/* 🌟 証明ステップの表示 */}
            <h3>現在の証明 ({proofState.currentSteps.length} ステップ)</h3>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}>
                {proofState.currentSteps.map((step: any) => (
                    <div key={step.id} onClick={() => handleStepClick(step.id)}
                        style={{ cursor: 'pointer', padding: '10px', borderRadius: '6px', marginBottom: '6px', transition: 'background-color 0.2s, box-shadow 0.2s',
                            backgroundColor: selectedSteps.includes(step.id) ? '#e6f7ff' : 'white', border: selectedSteps.includes(step.id) ? '1px solid #91d5ff' : '1px solid #f0f0f0' }}>
                        <strong style={{ minWidth: '30px', display: 'inline-block', color: '#1890ff' }}>{step.id}.</strong> 
                        <span style={{ fontWeight: '600', fontSize: '1.1em' }}>{formatFormula(step.formula)}</span>
                        <span style={{ float: 'right', color: '#8c8c8c', fontSize: '0.85em' }}>
                            [規則: {step.rule} / 根拠: {step.justification.join(', ') || '-'}]
                        </span>
                    </div>
                ))}
            </div>

            {/* --- 新しい前提の入力 --- */}
            <h3 style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>新しい前提の入力</h3>
            <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '10px' }}>記号を直接入力するか、下のボタンをクリックしてください。</p>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                {['P', 'Q', 'R', '(', ')', '¬', '∧', '∨', '→'].map(symbol => (
                    <button key={`premise-${symbol}`} onClick={() => handleSymbolClick(symbol, 'PREMISE')} 
                        style={{ padding: '8px 12px', fontSize: '1.1em', backgroundColor: '#e6f6ff', border: '1px solid #91d5ff', borderRadius: '4px', cursor: 'pointer' }}>
                        {symbol}
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={inputFormula} onChange={(e) => setInputFormula(e.target.value)}
                    placeholder="例: P /\ (Q -> R)" style={{ flexGrow: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <button onClick={handleParseFormula} disabled={!inputFormula}
                    style={{ padding: '10px 15px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>解析</button>
            </div>
            {parseError && (<p style={{ color: 'red', marginTop: '10px' }}>エラー: {parseError}</p>)}
            {parsedAst && (
                <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                    <p><strong>解析成功！</strong></p>
                    <p>ASTプレビュー: <span style={{ fontWeight: 'bold' }}>{formatFormula(parsedAst)}</span></p>
                    <button onClick={handleAddPremise}
                        style={{ marginTop: '10px', padding: '8px 15px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        証明に追加 (ASSUME)
                    </button>
                </div>
            )}
            
            {/* 🌟🌟 選言導入 (DI) 設定セクション 🌟🌟 */}
            <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #c2e0ff', borderRadius: '6px', backgroundColor: '#f0f8ff' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1890ff' }}>選言導入 (DI) 設定 (P ∨ Q の Q を入力)</h4>
                {/* Q入力ボタン */}
                <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                    {['P', 'Q', 'R', '(', ')', '¬', '∧', '∨', '→'].map(symbol => (
                        <button key={`addq-${symbol}`} onClick={() => handleSymbolClick(symbol, 'ADD_Q')} 
                            style={{ padding: '8px 12px', fontSize: '1.1em', backgroundColor: '#e6f6ff', border: '1px solid #91d5ff', borderRadius: '4px', cursor: 'pointer' }}>
                            {symbol}
                        </button>
                    ))}
                </div>
                {/* Q入力フィールドと解析ボタン */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" value={addQInput} onChange={(e) => setAddQInput(e.target.value)} 
                        placeholder="追加したい Q (例: R /\ S)" style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #91d5ff' }} />
                    <button onClick={handleParseAddQ} disabled={!addQInput}
                        style={{ padding: '8px 15px', backgroundColor: '#40a9ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Qを解析</button>
                </div>
                {addQParseError && <p style={{ color: 'red', fontSize: '0.85em', margin: '5px 0' }}>エラー: {addQParseError}</p>}
                {parsedAddQAst && <p style={{ color: 'green', fontSize: '0.85em', margin: '5px 0' }}>Q解析OK: {formatFormula(parsedAddQAst)}</p>}
            </div>


            {/* --- 規則適用ボタン --- */}
            <h3 style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>規則の適用</h3>
            <p style={{ fontSize: '0.9em', color: '#555' }}>選択中の行ID: {selectedSteps.join(', ') || 'なし'}</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* MPボタン */}
                <button onClick={handleApplyMP} disabled={selectedSteps.length !== 2 || isLoading || isGoalAchieved}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 2 || isLoading || isGoalAchieved) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : 'MP (2行)'}
                </button>
                
                {/* CIボタン */}
                <button onClick={handleApplyCI} disabled={selectedSteps.length !== 2 || isLoading || isGoalAchieved}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#13c2c2', color: 'white', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 2 || isLoading || isGoalAchieved) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : '連言導入 (CI) - 2行'}
                </button>

                {/* CEボタン (左) */}
                <button onClick={() => handleApplyCE('LEFT')} disabled={selectedSteps.length !== 1 || isLoading || isGoalAchieved}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#fa8c16', color: 'white', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 1 || isLoading || isGoalAchieved) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : 'CE - 左 (1行)'}
                </button>

                {/* CEボタン (右) */}
                <button onClick={() => handleApplyCE('RIGHT')} disabled={selectedSteps.length !== 1 || isLoading || isGoalAchieved}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#fa8c16', color: 'white', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 1 || isLoading || isGoalAchieved) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : 'CE - 右 (1行)'}
                </button>

                {/* DIボタン (左) */}
                <button onClick={() => handleApplyDI('LEFT')} disabled={selectedSteps.length !== 1 || isLoading || isGoalAchieved || !parsedAddQAst}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#fadb14', color: '#333', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 1 || isLoading || isGoalAchieved || !parsedAddQAst) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : 'DI - 左 (1行+Q)'}
                </button>
                
                {/* DIボタン (右) */}
                <button onClick={() => handleApplyDI('RIGHT')} disabled={selectedSteps.length !== 1 || isLoading || isGoalAchieved || !parsedAddQAst}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#fadb14', color: '#333', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 1 || isLoading || isGoalAchieved || !parsedAddQAst) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : 'DI - 右 (1行+Q)'}
                </button>

                {/* 🌟 DSボタンの追加 */}
                <button 
                onClick={handleApplyDS} 
                disabled={selectedSteps.length !== 2 || isLoading || isGoalAchieved}
                style={{ 
            padding: '12px 25px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            backgroundColor: '#00b0ff', // 青
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            opacity: (selectedSteps.length !== 2 || isLoading || isGoalAchieved) ? 0.6 : 1
        }}
    >
        {isLoading ? '処理中...' : '選言除去 (DS) - 2行'}
    </button>
                
                {/* DNボタン */}
                <button onClick={handleApplyDN} disabled={selectedSteps.length !== 1 || isLoading || isGoalAchieved}
                    style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '6px', opacity: (selectedSteps.length !== 1 || isLoading || isGoalAchieved) ? 0.6 : 1 }}>
                    {isLoading ? '処理中...' : 'DN (1行)'}
                </button>
            </div>
            
            {/* 💡 目標達成メッセージ */}
            {isGoalAchieved && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d', borderRadius: '4px', fontWeight: 'bold' }}>
                    ✅ 証明が完了しました！素晴らしい！
                </div>
            )}
        </div>
    );
}

export default App;
