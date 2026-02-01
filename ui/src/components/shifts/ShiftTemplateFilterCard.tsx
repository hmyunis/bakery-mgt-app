import React from "react";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";

interface ShiftTemplateFilterCardProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export const ShiftTemplateFilterCard: React.FC<ShiftTemplateFilterCardProps> = ({
    searchQuery,
    onSearchChange,
}) => {
    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <div
                className={`
          w-full sm:w-64 lg:w-72 
          focus-within:sm:w-96 
          transition-[width] duration-300 ease-in-out
        `}
            >
                <Input
                    placeholder="Search shift templates..."
                    value={searchQuery}
                    onValueChange={onSearchChange}
                    startContent={<Search className="h-5 w-5 text-slate-400" />}
                    isClearable
                />
            </div>
        </div>
    );
};

export const MemoShiftTemplateFilterCard = React.memo(ShiftTemplateFilterCard);
