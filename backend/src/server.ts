import express from 'express';
import cors from 'cors'; // corsをインポート
// 🌟 engine.ts と types.ts をインポート
import { applyRule } from './logics/engine.js'; 
import { tokenize, parse } from './logics/parser.js'; 
import type { ProofState, RuleName ,Formula} from './logics/types.js'; 



// サーバーを起動するポート番号
const PORT = 3000;
const app = express();

// 固定で許可したいURL（ローカル開発用など）
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://natural-deduction-react.vercel.app' // 本番URL
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. originがない場合（サーバー同士の通信やPostmanなど）は許可
    if (!origin) return callback(null, true);

    // 2. 固定リストに含まれているかチェック
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // 3. ★ここが重要★ VercelのプレビューURL（.vercel.appで終わるもの）を動的に許可
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // それ以外はブロック
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));
// JSON形式のリクエストボディを解析するための設定
app.use(express.json());

// CORS（クロスオリジンリソース共有）設定
// 異なるポート（フロントエンド: 5173, バックエンド: 3000）間での通信を許可
app.use((req, res, next) => {
  // 開発中のフロントエンドのURLを指定
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); 
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 動作確認用のルート（APIエンドポイント）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running on port ' + PORT });
});

// 🌟 推論規則適用API (POST) の追加
app.post('/api/apply-rule', (req, res) => {
  try {
    // Reactから送られてくるボディ (req.body) から必要なデータを取り出す
    const { state, rule, selectedStepIds, newFormulaAst } = req.body;

    // TypeScriptの型にキャスト（ここでは簡易的に any を使っていますが、
    // ProofStateの構造は厳密なので、applyRuleが厳しくチェックします）
    const currentState = state as ProofState;
    const ruleName = rule as RuleName;
    const stepIds = selectedStepIds as number[];

    // 🌟 applyRule に新しい引数 newFormulaAst を追加して渡す
const newState = applyRule(currentState, ruleName, stepIds, newFormulaAst as Formula); 

    // 2. 成功した場合、新しい状態をReactに返す
    res.json({ success: true, newState: newState });

  } catch (error) {
    console.error("Rule Application Error:", error);
    // 3. 規則適用失敗の場合（例: 前提がMPの形式ではない）、エラーメッセージをReactに返す
    if (error instanceof Error) {
        res.status(400).json({ success: false, message: error.message });
    } else {
        res.status(500).json({ success: false, message: "An unknown server error occurred." });
    }
  }
});


// 🌟 構文解析API (POST) の追加
app.post('/api/parse', (req, res) => {
    try {
        const { formulaString } = req.body; // Reactから入力文字列を受け取る

        if (!formulaString) {
            return res.status(400).json({ success: false, message: "論理式が入力されていません。" });
        }

        // 1. 字句解析
        const tokens = tokenize(formulaString);
        
        // 2. 構文解析 (ASTへの変換)
        const formulaAst = parse(tokens); 

        // 成功した場合、ASTをReactに返す
        res.json({ success: true, formulaAst: formulaAst });

    } catch (error) {
        console.error("Parsing Error:", error);
        // 字句解析や構文解析に失敗した場合、ユーザーにエラーメッセージを返す
        if (error instanceof Error) {
            res.status(400).json({ success: false, message: `解析エラー: ${error.message}` });
        } else {
            res.status(500).json({ success: false, message: "不明なサーバーエラーが発生しました。" });
        }
    }
});


// サーバーを起動
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});

