import { useState } from 'react';
// 型のみのインポートを使用
import type { ReactNode, CSSProperties, FC } from 'react';

// 型定義
interface TooltipProps {
    children: ReactNode;
    content: string;
}

// コンポーネント定義
const Tooltip: FC<TooltipProps> = ({ children, content }) => {
    const [isHovered, setIsHovered] = useState(false);

    const tooltipStyle: CSSProperties = {
        position: 'relative',
        display: 'inline-block',
    };

    const popupStyle: CSSProperties = {
        visibility: isHovered ? 'visible' : 'hidden',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s',
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%) translateY(-8px)',
        padding: '6px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        fontSize: '12px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 1000,
    };

    return (
        <div 
            style={tooltipStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={popupStyle}>
                {content}
            </div>
            {children}
        </div>
    );
};

// ★ここ重要！他のファイルで使えるようにエクスポートする
export default Tooltip;