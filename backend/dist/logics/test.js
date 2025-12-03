import { tokenize, parse } from './parser.js'; // parse もインポート
function runTest() {
    try {
        // テストしたい論理式を入力
        const testInput = "P /\\ (Q \\/ ~R) -> S";
        // 1. 字句解析
        const tokens = tokenize(testInput);
        console.log("--- Tokenizer Result ---");
        // トークンが正しく分解されているか確認
        console.log("Tokens:", JSON.stringify(tokens, null, 2));
        // 2. 構文解析
        const ast = parse(tokens);
        console.log("\n--- Parser Result (AST) ---");
        // 🌟 最終目標: 論理式が木構造として出力されるか確認 🌟
        console.log("AST:", JSON.stringify(ast, null, 2));
        console.log("----------------------------");
    }
    catch (e) {
        if (e instanceof Error) {
            console.error("\nTest Error:", e.message);
        }
    }
}
// ファイルを実行したときに runTest 関数が呼び出される
runTest();
