import { useMemo, useRef, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Select,
    SelectItem,
    Switch,
} from "@heroui/react";
import {
    Landmark,
    User,
    Hash,
    DollarSign,
    CreditCard,
    Upload,
    StickyNote,
    Camera,
} from "lucide-react";
import { getImageBaseUrl } from "../../lib/apiClient";
import type { BankAccount, CreateBankAccountData } from "../../types/treasury";
import type { PaymentMethod } from "../../types/payment";

interface BankAccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    account?: BankAccount | null;
    paymentMethods: PaymentMethod[];
    onSave: (payload: CreateBankAccountData) => Promise<void>;
}

const createEmptyAccount = (): CreateBankAccountData => ({
    name: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    balance: 0,
    notes: "",
    isActive: true,
    linkedPaymentMethodIds: [],
});

function BankAccountFormContent({
    account,
    onClose,
    paymentMethods,
    onSave,
}: {
    account?: BankAccount | null;
    onClose: () => void;
    paymentMethods: PaymentMethod[];
    onSave: (payload: CreateBankAccountData) => Promise<void>;
}) {
    const isEdit = !!account;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<CreateBankAccountData>(() =>
        account
            ? {
                  name: account.name,
                  bankName: account.bankName,
                  accountHolder: account.accountHolder,
                  accountNumber: account.accountNumber,
                  balance: account.balance,
                  notes: account.notes || "",
                  isActive: account.isActive,
                  linkedPaymentMethodIds: account.linkedPaymentMethodIds ?? [],
              }
            : createEmptyAccount()
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(() => {
        if (!account?.logo) return null;
        return account.logo.startsWith("http")
            ? account.logo
            : `${getImageBaseUrl()}${account.logo}`;
    });
    const [logoRemoved, setLogoRemoved] = useState(false);

    const paymentSelectedKeys = useMemo(
        () => new Set(formData.linkedPaymentMethodIds.map((id) => id.toString())),
        [formData.linkedPaymentMethodIds]
    );

    const handleInputChange = (
        field: keyof CreateBankAccountData,
        value: string | number | boolean | number[]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validateForm = (): boolean => {
        const nextErrors: Record<string, string> = {};
        if (!formData.name.trim()) nextErrors.name = "Required";
        if (!formData.bankName.trim()) nextErrors.bankName = "Required";
        if (!formData.accountHolder.trim()) nextErrors.accountHolder = "Required";
        if (!formData.accountNumber.trim()) nextErrors.accountNumber = "Required";
        if (Number.isNaN(Number(formData.balance))) nextErrors.balance = "Invalid number";

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleLogoChange = (file?: File | null) => {
        if (!file) return;
        setLogoFile(file);
        setLogoRemoved(false);
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setLogoRemoved(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        try {
            setIsSubmitting(true);
            await onSave({
                ...formData,
                balance: Number(formData.balance) || 0,
                logo: logoRemoved ? null : logoFile || undefined,
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <ModalHeader className="flex justify-between items-center pr-10">
                <span className="text-lg font-semibold">
                    {isEdit ? "Edit Bank Account" : "Add Bank Account"}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-default-500 font-normal">Status:</span>
                    <Switch
                        size="sm"
                        color="success"
                        isSelected={formData.isActive}
                        onValueChange={(value) => handleInputChange("isActive", value)}
                        aria-label="Active status"
                    />
                </div>
            </ModalHeader>

            <ModalBody className="gap-6">
                {/* Section 1: Identity (Logo & Bank Name) */}
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    {/* Custom Logo Upload UX */}
                    <div className="flex flex-col items-center gap-2 sm:items-center">
                        <div className="relative group cursor-pointer">
                            <div
                                className={`
                w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors
                ${errors.bankName ? "border-danger bg-danger-50" : "border-default-300 hover:border-primary hover:bg-default-100"}
              `}
                            >
                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="Logo"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Landmark className="w-8 h-8 text-default-400" />
                                )}

                                {/* Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            {/* Hidden Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleLogoChange(e.target.files?.[0])}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                startContent={<Upload className="w-4 h-4" />}
                                onPress={() => fileInputRef.current?.click()}
                            >
                                {logoPreview ? "Change" : "Upload"}
                            </Button>
                            {logoPreview ? (
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="danger"
                                    onPress={handleRemoveLogo}
                                >
                                    Remove
                                </Button>
                            ) : null}
                        </div>
                        <span className="text-[10px] text-default-400 uppercase font-medium tracking-wide">
                            Logo
                        </span>
                    </div>

                    {/* Identity Inputs */}
                    <div className="w-full sm:flex-1 space-y-3">
                        <Input
                            autoFocus
                            label="Bank Name"
                            placeholder="e.g. Commercial Bank of Ethiopia"
                            value={formData.bankName}
                            onValueChange={(val) => handleInputChange("bankName", val)}
                            isInvalid={!!errors.bankName}
                            errorMessage={errors.bankName}
                            startContent={<Landmark className="text-default-400 w-4 h-4" />}
                            variant="bordered"
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                inputWrapper: "bg-default-50",
                            }}
                        />
                        <Input
                            label="Account Nickname"
                            placeholder="e.g. Main Operating Account"
                            value={formData.name}
                            onValueChange={(val) => handleInputChange("name", val)}
                            isInvalid={!!errors.name}
                            errorMessage={errors.name}
                            description="A friendly name to identify this account internally."
                            variant="bordered"
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                inputWrapper:
                                    "!placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                            }}
                        />
                    </div>
                </div>

                {/* Section 2: Account Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Account Holder"
                        placeholder="e.g. The Bakery LLC"
                        value={formData.accountHolder}
                        onValueChange={(val) => handleInputChange("accountHolder", val)}
                        isInvalid={!!errors.accountHolder}
                        errorMessage={errors.accountHolder}
                        startContent={<User className="text-default-400 w-4 h-4" />}
                        variant="flat"
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Input
                        label="Account Number"
                        placeholder="1000..."
                        value={formData.accountNumber}
                        onValueChange={(val) => handleInputChange("accountNumber", val)}
                        isInvalid={!!errors.accountNumber}
                        errorMessage={errors.accountNumber}
                        startContent={<Hash className="text-default-400 w-4 h-4" />}
                        variant="flat"
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Input
                        type="number"
                        label="Opening Balance"
                        placeholder="0.00"
                        value={formData.balance.toString()}
                        onValueChange={(val) => handleInputChange("balance", val)}
                        isInvalid={!!errors.balance}
                        errorMessage={errors.balance}
                        startContent={<DollarSign className="text-default-400 w-4 h-4" />}
                        variant="flat"
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Select
                        label="Linked Payment Methods"
                        placeholder="Select methods"
                        selectedKeys={paymentSelectedKeys}
                        selectionMode="multiple"
                        startContent={<CreditCard className="text-default-400 w-4 h-4" />}
                        variant="flat"
                        classNames={{
                            base: "!w-full !text-left",
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                        onSelectionChange={(keys) => {
                            if (keys === "all") return;
                            const nextIds = Array.from(keys).map((key) => Number(key));
                            handleInputChange("linkedPaymentMethodIds", nextIds);
                        }}
                    >
                        {paymentMethods.map((method) => (
                            <SelectItem key={method.id.toString()} textValue={method.name}>
                                {method.name}
                            </SelectItem>
                        ))}
                    </Select>
                </div>

                {/* Section 3: Notes */}
                <Textarea
                    label="Internal Notes"
                    placeholder="Any additional details regarding this account..."
                    value={formData.notes || ""}
                    onValueChange={(val) => handleInputChange("notes", val)}
                    minRows={2}
                    variant="faded"
                    startContent={<StickyNote className="text-default-400 mt-1 w-4 h-4" />}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                    }}
                />
            </ModalBody>

            <ModalFooter className="bg-default-50/50">
                <Button variant="light" color="danger" onPress={onClose}>
                    Cancel
                </Button>
                <Button
                    color="primary"
                    onPress={handleSubmit}
                    startContent={isEdit ? undefined : <Upload className="w-4 h-4" />}
                    isLoading={isSubmitting}
                >
                    {isEdit ? "Save Changes" : "Create Account"}
                </Button>
            </ModalFooter>
        </>
    );
}

export function BankAccountFormModal({
    isOpen,
    onClose,
    account,
    paymentMethods,
    onSave,
}: BankAccountFormModalProps) {
    const formKey = account ? `edit-${account.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                {(onCloseModal) => (
                    <BankAccountFormContent
                        key={formKey}
                        account={account}
                        onClose={onCloseModal}
                        paymentMethods={paymentMethods}
                        onSave={onSave}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
