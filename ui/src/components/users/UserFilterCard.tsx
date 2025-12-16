import React from "react";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Search } from "lucide-react";

interface UserFilterCardProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isActiveFilter: boolean | null;
    onIsActiveFilterChange: (isActive: boolean | null) => void;
    isLoading?: boolean;
}

export const UserFilterCard: React.FC<UserFilterCardProps> = ({
    searchQuery,
    onSearchChange,
    isActiveFilter,
    onIsActiveFilterChange,
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
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onValueChange={onSearchChange}
                    isDisabled={isLoading}
                    startContent={<Search className="h-5 w-5 text-slate-400" />}
                    isClearable
                />
            </div>

            <div className="w-full sm:w-48">
                <Select
                    placeholder="Filter by status"
                    aria-label="Filter by status"
                    selectedKeys={isActiveFilter === null ? [] : [isActiveFilter.toString()]}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        if (selected === "all") {
                            onIsActiveFilterChange(null);
                        } else if (selected === "true") {
                            onIsActiveFilterChange(true);
                        } else if (selected === "false") {
                            onIsActiveFilterChange(false);
                        }
                    }}
                    isDisabled={isLoading}
                    classNames={{
                        trigger: "!w-full !text-left",
                        label: "!w-full !text-left",
                        base: "!w-full !text-left",
                    }}
                >
                    <SelectItem key="all">All Users</SelectItem>
                    <SelectItem key="true">Active Only</SelectItem>
                    <SelectItem key="false">Inactive Only</SelectItem>
                </Select>
            </div>
        </div>
    );
};
