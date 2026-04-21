import React from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
    content: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content }) => {
    return (
        <div className="relative group inline-flex items-center ml-1 cursor-help align-middle">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            
            {/* Tooltip Popup */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[240px] p-2.5 bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100] whitespace-normal text-left leading-relaxed font-normal">
                {content}
                {/* Triangle Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
        </div>
    );
};
