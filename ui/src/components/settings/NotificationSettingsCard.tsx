import React from "react";
import { Bell, BellOff, Info } from "lucide-react";
import { Card, CardBody, Switch } from "@heroui/react";
import { usePushNotifications } from "../../hooks/usePushNotifications";

export const NotificationSettingsCard: React.FC = () => {
    const {
        isSupported,
        isSubscribed,
        permission,
        isLoading,
        subscribeToPush,
        unsubscribeFromPush,
    } = usePushNotifications();

    const handleToggle = (value: boolean) => {
        if (value) {
            subscribeToPush();
        } else {
            unsubscribeFromPush();
        }
    };

    if (!isSupported) {
        return (
            <Card className="shadow-warm border border-zinc-200 dark:border-zinc-800">
                <CardBody className="p-6">
                    <div className="flex items-center gap-4 text-default-500">
                        <BellOff className="w-6 h-6" />
                        <div>
                            <h3 className="font-semibold">Push Notifications</h3>
                            <p className="text-sm">Not supported in this browser.</p>
                        </div>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="shadow-warm border border-zinc-200 dark:border-zinc-800">
            <CardBody className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2 rounded-full ${
                                isSubscribed
                                    ? "bg-primary/10 text-primary"
                                    : "bg-default-100 text-default-500"
                            }`}
                        >
                            {isSubscribed ? (
                                <Bell className="w-5 h-5" />
                            ) : (
                                <BellOff className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                Push Notifications
                            </h3>
                            <p className="text-sm text-default-500">
                                Receive updates about orders, stock, and system alerts.
                            </p>
                        </div>
                    </div>

                    <Switch
                        isSelected={isSubscribed}
                        onValueChange={handleToggle}
                        isDisabled={isLoading || permission === "denied"}
                        color="primary"
                    >
                        <span className="text-sm font-medium">
                            {isSubscribed ? "Enabled" : "Disabled"}
                        </span>
                    </Switch>
                </div>

                {permission === "denied" && (
                    <div className="bg-danger-50 text-danger-600 p-3 rounded-lg text-sm flex items-start gap-2 mb-4">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>
                            Notifications are blocked by your browser. Please reset permissions in
                            your browser settings to enable them.
                        </p>
                    </div>
                )}

                <div className="bg-default-50 dark:bg-default-100/50 rounded-lg p-4 border border-default-200">
                    <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-default-700">
                                When will I receive notifications?
                            </p>
                            <p className="text-xs text-default-500 leading-relaxed">
                                You will receive pop-up notifications on your device when important
                                events occur, including: low stock alerts, price anomalies,
                                production completions, sales, stock adjustments, purchases, new
                                user creation, user logins, and factory resets. Notifications work
                                even when the app is closed.
                            </p>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};
