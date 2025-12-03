/**
 * 論理式の文字列を受け取り、トークンの配列に変換する字句解析器
 * @param input 論理式の文字列 (例: "P -> (Q & R)")
 * @returns トークンの配列
 */
export function tokenize(input) {
    const tokens = [];
    let position = 0; // 現在、文字列のどこを見ているかを示すカーソル
    // 入力文字列の最後に、入力の終わりを示す特別なトークンを追加するため
    while (position < input.length) {
        const char = input[position];
        // 1. 空白文字のスキップ
        if (/\s/.test(char)) {
            position++;
            continue;
        }
        // 2. 結合子や括弧の処理
        // 2. 結合子や括弧の処理 (ユニコード記号に対応)
        switch (char) {
            case '(':
                tokens.push({ type: 'LEFT_PAREN', value: char });
                position++;
                continue;
            case ')':
                tokens.push({ type: 'RIGHT_PAREN', value: char });
                position++;
                continue;
            case '~':
            case '¬': // 🌟 否定記号 (~ または ¬)
                tokens.push({ type: 'NOT', value: char });
                position++;
                continue;
            case '∧': // 🌟 連言 (AND: ∧)
                tokens.push({ type: 'AND', value: char });
                position++;
                continue;
            case '∨': // 🌟 選言 (OR: ∨)
                tokens.push({ type: 'OR', value: char });
                position++;
                continue;
            // 含意 (-> または →) の処理
            case '-': // 複数文字の -> に対応
                if (input[position + 1] === '>') {
                    tokens.push({ type: 'IMPLIES', value: '->' });
                    position += 2; // 2文字分進める
                    continue;
                }
                throw new Error(`Invalid character: ${char} at position ${position}`);
            case '→': // 🌟 単一文字の含意 (→) に対応
                tokens.push({ type: 'IMPLIES', value: char });
                position++;
                continue;
        }
        // 4. 原子命題（英大文字など）の処理
        // 正規表現を使って、英大文字（P, Q, R, ...）を原子命題として扱う
        if (/[A-Z]/.test(char)) {
            let value = char;
            // 複数の文字で構成される命題（例: "P1", "Q_a"など）を許容する場合、ここでロジックを拡張する
            tokens.push({ type: 'PROPOSITION', value: value });
            position++;
            continue;
        }
        // 5. どのパターンにもマッチしない場合
        throw new Error(`Unrecognized character: ${char} at position ${position}`);
    }
    // 最後に、EOF (End Of File) トークンを追加する
    tokens.push({ type: 'EOF', value: '' });
    return tokens;
}
/**
 * トークンの配列を受け取り、論理式のAST (Formula) を構築する
 * @param tokens 字句解析器が生成したトークンの配列
 * @returns 抽象構文木 (Formula)
 */
export function parse(tokens) {
    let currentTokenIndex = 0; // 現在処理中のトークンの位置
    // トークンを進めるヘルパー関数
    const advance = () => tokens[currentTokenIndex++];
    // 現在のトークンを取得するヘルパー関数
    const peek = () => tokens[currentTokenIndex];
    // --- 構文解析の核となる関数 ---
    // 優先順位が最も低い含意 (->) を処理
    const parseImplication = () => {
        let left = parseDisjunction(); // 優先順位が一つ高い選言を先に解析
        while (peek().type === 'IMPLIES') {
            advance(); // '->' を消費
            const right = parseImplication(); // 右結合性を考慮して再帰的に処理
            // 抽象構文木ノードを作成
            left = {
                type: 'BINARY',
                connective: 'IMPLIES',
                left: left,
                right: right
            };
        }
        return left;
    };
    // 選言 (\/) を処理
    const parseDisjunction = () => {
        let left = parseConjunction(); // 優先順位が一つ高い連言を先に解析
        while (peek().type === 'OR') {
            const connective = peek().type;
            advance(); // 'OR' を消費
            const right = parseConjunction(); // 連言を解析
            left = {
                type: 'BINARY',
                connective: connective,
                left: left,
                right: right
            };
        }
        return left;
    };
    // 連言 (/\) を処理
    const parseConjunction = () => {
        let left = parseUnary(); // 優先順位が一つ高い否定/単項を先に解析
        while (peek().type === 'AND') {
            const connective = peek().type;
            advance(); // 'AND' を消費
            const right = parseUnary(); // 否定/単項を解析
            left = {
                type: 'BINARY',
                connective: connective,
                left: left,
                right: right
            };
        }
        return left;
    };
    // 否定 (~) や括弧、原子命題などの単項式を処理
    const parseUnary = () => {
        const token = peek();
        if (token.type === 'NOT') {
            advance(); // '~' を消費
            const formula = parseUnary(); // 否定は単項なので再帰
            return { type: 'NOT', formula: formula };
        }
        if (token.type === 'LEFT_PAREN') {
            advance(); // '(' を消費
            const formula = parseImplication(); // 最も低い優先順位から解析を再開
            if (peek().type !== 'RIGHT_PAREN') {
                throw new Error("Expected ')' but found " + peek().value);
            }
            advance(); // ')' を消費
            return formula;
        }
        if (token.type === 'PROPOSITION') {
            advance(); // 原子命題を消費
            return { type: 'ATOM', name: token.value };
        }
        // 予期せぬトークン
        throw new Error("Unexpected token: " + token.value);
    };
    // 全体を開始
    const formula = parseImplication();
    // 解析後、EOF (End Of File) が来ていなければエラー
    if (peek().type !== 'EOF') {
        throw new Error("Unexpected token at end: " + peek().value);
    }
    return formula;
}
