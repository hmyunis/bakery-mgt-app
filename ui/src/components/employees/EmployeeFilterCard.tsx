import React from "react";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";

interface EmployeeFilterCardProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isLoading?: boolean;
}

export const EmployeeFilterCard: React.FC<EmployeeFilterCardProps> = ({
    searchQuery,
    onSearchChange,
    isLoading,
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
                    placeholder="Search by name, position or phone..."
                    value={searchQuery}
                    onValueChange={onSearchChange}
                    startContent={<Search className="h-5 w-5 text-slate-400" />}
                    isClearable
                    isDisabled={isLoading}
                />
            </div>
        </div>
    );
};

export const MemoEmployeeFilterCard = React.memo(EmployeeFilterCard);
