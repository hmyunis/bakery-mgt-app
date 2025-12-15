import { Button, Chip, Switch, Tooltip } from "@heroui/react";
import {
    Menu,
    X,
    Phone,
    Mail,
    MapPin,
    ArrowRight,
    ShoppingBag,
    Sparkles,
    Clock,
    Wheat,
    CakeSlice,
    Coffee,
    Moon,
    Sun,
    Facebook,
    Instagram,
    Send,
    Youtube,
    Twitter,
    Music2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBakerySettings } from "../hooks/useBakery";
import { useThemeInit } from "../hooks/useThemeInit";
import { useThemeColor } from "../hooks/useThemeColor";
import { useAppDispatch, useAppSelector } from "../store";
import { toggleMode } from "../store/settingsSlice";

function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingPage() {
    const navigate = useNavigate();
    const { data: bakerySettings } = useBakerySettings();
    const [mobileOpen, setMobileOpen] = useState(false);
    const dispatch = useAppDispatch();
    const { mode } = useAppSelector((s) => s.settings);

    useThemeInit();
    useThemeColor(bakerySettings?.themeColor);

    const bakeryName = bakerySettings?.name || "Bakery";

    const addressForMap = (bakerySettings?.address || bakeryName).trim();
    const mapQuery = encodeURIComponent(addressForMap);
    const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
    const mapOpenUrl = `https://www.google.com/maps?q=${mapQuery}`;

    const navLinks = [
        { id: "home", label: "Home" },
        { id: "about", label: "About" },
        { id: "services", label: "Services" },
        { id: "cta", label: "Order" },
        { id: "contact", label: "Contact" },
    ];

    const socialLinks = useMemo(() => {
        const links = [
            {
                key: "facebook",
                enabled: bakerySettings?.facebookEnabled && !!bakerySettings?.facebookUrl?.trim(),
                url: bakerySettings?.facebookUrl?.trim() || "",
                Icon: Facebook,
                label: "Facebook",
            },
            {
                key: "instagram",
                enabled: bakerySettings?.instagramEnabled && !!bakerySettings?.instagramUrl?.trim(),
                url: bakerySettings?.instagramUrl?.trim() || "",
                Icon: Instagram,
                label: "Instagram",
            },
            {
                key: "telegram",
                enabled: bakerySettings?.telegramEnabled && !!bakerySettings?.telegramUrl?.trim(),
                url: bakerySettings?.telegramUrl?.trim() || "",
                Icon: Send,
                label: "Telegram",
            },
            {
                key: "tiktok",
                enabled: bakerySettings?.tiktokEnabled && !!bakerySettings?.tiktokUrl?.trim(),
                url: bakerySettings?.tiktokUrl?.trim() || "",
                Icon: Music2,
                label: "TikTok",
            },
            {
                key: "youtube",
                enabled: bakerySettings?.youtubeEnabled && !!bakerySettings?.youtubeUrl?.trim(),
                url: bakerySettings?.youtubeUrl?.trim() || "",
                Icon: Youtube,
                label: "YouTube",
            },
            {
                key: "x",
                enabled: bakerySettings?.xEnabled && !!bakerySettings?.xUrl?.trim(),
                url: bakerySettings?.xUrl?.trim() || "",
                Icon: Twitter,
                label: "X",
            },
        ];

        return links.filter((l) => l.enabled);
    }, [bakerySettings]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMobileOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] scroll-smooth">
            {/* Navbar */}
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--panel)]/75 backdrop-blur-xl">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => scrollToSection("home")}
                        className="flex items-center gap-3 hover:opacity-90"
                    >
                        {bakerySettings?.logoUrl ? (
                            <img
                                src={bakerySettings.logoUrl}
                                alt={bakeryName}
                                className="size-10 rounded-xl object-contain bg-white/60 dark:bg-black/10"
                            />
                        ) : (
                            <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-sm">
                                <span className="text-lg">🍞</span>
                    </div>
                        )}
                        <div className="text-left leading-tight">
                            <div className="font-bold text-base sm:text-lg">{bakeryName}</div>
                            <div className="text-[11px] text-[var(--muted)]">Freshly baked, every day</div>
                    </div>
                    </button>

                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map((l) => (
                            <button
                                key={l.id}
                                type="button"
                                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)] transition cursor-pointer"
                                onClick={() => scrollToSection(l.id)}
                            >
                                {l.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                    <Tooltip content={mode === "dark" ? "Light mode" : "Dark mode"}>
                        <Switch
                            aria-label="toggle theme"
                            isSelected={mode === "dark"}
                            onValueChange={() => dispatch(toggleMode())}
                            thumbIcon={
                                mode === "dark" ? (
                                    <Moon className="size-4" />
                                ) : (
                                    <Sun className="size-4" />
                                )
                            }
                        />
                    </Tooltip>
                        <Button
                            size="sm"
                            color="primary"
                            className="bg-[var(--accent)] text-white hidden sm:flex"
                            endContent={<ArrowRight className="size-4" />}
                            onPress={() => navigate("/login")}
                        >
                            Login
                        </Button>
                        <Button
                            isIconOnly
                            variant="light"
                            className="md:hidden"
                            onPress={() => setMobileOpen((v) => !v)}
                        >
                            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </Button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="md:hidden border-t border-[var(--border)] bg-[var(--panel)]/85 backdrop-blur-xl">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col gap-2">
                            {navLinks.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    className="text-left py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        scrollToSection(l.id);
                                    }}
                                >
                                    {l.label}
                                </button>
                            ))}
                        <Button
                                size="sm"
                                color="primary"
                                className="bg-[var(--accent)] text-white justify-center"
                                endContent={<ArrowRight className="size-4" />}
                            onPress={() => navigate("/login")}
                        >
                            Login
                        </Button>
                        </div>
                    </div>
                    )}
            </header>

            {/* Hero */}
            <section id="home" className="scroll-mt-24">
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-white to-[var(--bg)] dark:from-slate-950 dark:via-slate-950 dark:to-[var(--bg)]" />
                    <div className="absolute -top-24 -right-24 size-[420px] rounded-full bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-rose-500/20 blur-3xl" />
                    <div className="absolute -bottom-32 -left-24 size-[520px] rounded-full bg-gradient-to-br from-sky-400/15 via-indigo-500/10 to-purple-500/10 blur-3xl" />

                    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            <div className="space-y-6">
                        <Chip
                            variant="flat"
                                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        >
                                    <Sparkles className="size-4 mr-1" />
                                    Freshly baked daily
                        </Chip>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
                                    Artisan breads, cakes & pastries — made with love at{" "}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
                                        {bakeryName}
                                    </span>
                                    .
                        </h1>
                                <p className="text-base sm:text-lg text-[var(--muted)] max-w-xl">
                                    From warm sourdough to celebration cakes, we bring you the comfort of
                                    fresh-baked goodness — perfect for mornings, events, and everything in between.
                        </p>

                                <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    color="primary"
                                        className="bg-[var(--accent)] text-white"
                                        startContent={<ShoppingBag className="size-4" />}
                                        onPress={() => scrollToSection("cta")}
                                    >
                                        Order / Request a Quote
                                    </Button>
                                    <Button
                                        variant="bordered"
                                        className="border-[var(--border)]"
                                        startContent={<MapPin className="size-4" />}
                                        onPress={() => scrollToSection("contact")}
                                    >
                                        Find Us
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2 text-sm text-[var(--muted)]">
                                    <div className="flex items-center gap-2">
                                        <Clock className="size-4" />
                                        <span>Daily fresh batches</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Wheat className="size-4" />
                                        <span>Premium ingredients</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Coffee className="size-4" />
                                        <span>Perfect with coffee</span>
                                    </div>
                        </div>
                    </div>

                            <div className="relative">
                                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-4 border border-amber-500/10">
                                            <div className="text-sm font-semibold">Breads</div>
                                            <div className="text-xs text-[var(--muted)] mt-1">
                                                Sourdough, baguettes, rolls
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-gradient-to-br from-rose-500/15 to-pink-500/10 p-4 border border-rose-500/10">
                                            <div className="text-sm font-semibold">Cakes</div>
                                            <div className="text-xs text-[var(--muted)] mt-1">
                                                Birthdays & weddings
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 p-4 border border-indigo-500/10">
                                            <div className="text-sm font-semibold">Pastries</div>
                                            <div className="text-xs text-[var(--muted)] mt-1">
                                                Croissants & seasonal treats
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 border border-emerald-500/10">
                                            <div className="text-sm font-semibold">Custom</div>
                                            <div className="text-xs text-[var(--muted)] mt-1">
                                                Bulk orders & catering
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 rounded-2xl bg-[var(--bg)]/60 p-4 border border-[var(--border)]">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold">Today’s highlight</div>
                                            <CakeSlice className="size-5 text-rose-500" />
                                        </div>
                                        <div className="text-sm text-[var(--muted)] mt-1">
                                            Ask for our fresh-baked specials when you visit {bakeryName}.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About */}
            <section id="about" className="scroll-mt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                        <div className="space-y-4">
                            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                About {bakeryName}
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                A neighborhood bakery with a big heart.
                            </h2>
                            <p className="text-[var(--muted)]">
                                At {bakeryName}, we bake in small batches so every loaf and pastry feels freshly made
                                for you. We focus on quality, consistency, and beautiful presentation for your family
                                table or your biggest celebration.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-4">
                                    <div className="text-lg font-bold">Fresh</div>
                                    <div className="text-xs text-[var(--muted)] mt-1">Baked daily</div>
                                </div>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-4">
                                    <div className="text-lg font-bold">Local</div>
                                    <div className="text-xs text-[var(--muted)] mt-1">Community-first</div>
                                </div>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-4">
                                    <div className="text-lg font-bold">Custom</div>
                                    <div className="text-xs text-[var(--muted)] mt-1">Made to order</div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/60 p-6">
                            <div className="text-sm font-semibold mb-3">What we believe</div>
                            <ul className="space-y-3 text-sm text-[var(--muted)]">
                                <li className="flex gap-2">
                                    <span className="mt-0.5 text-amber-500">•</span>
                                    <span>Great bread starts with great ingredients.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="mt-0.5 text-amber-500">•</span>
                                    <span>Warm hospitality matters as much as taste.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="mt-0.5 text-amber-500">•</span>
                                    <span>Beautiful cakes should taste as good as they look.</span>
                                </li>
                            </ul>
                            <div className="mt-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 p-4 border border-amber-500/10">
                                <div className="text-sm font-semibold">Visit us</div>
                                <div className="text-sm text-[var(--muted)] mt-1">
                                    Come say hi — we’ll help you pick the perfect treat.
                                </div>
                            </div>
                        </div>
                    </div>
                                </div>
            </section>

            {/* Services */}
            <section id="services" className="scroll-mt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
                    <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div className="space-y-2">
                            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                Services
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                Everything you need — from daily bread to event catering.
                            </h2>
                                </div>
                                            <Button
                            variant="bordered"
                            className="border-[var(--border)]"
                            endContent={<ArrowRight className="size-4" />}
                            onPress={() => scrollToSection("contact")}
                        >
                            Contact us
                                            </Button>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                title: "Daily Fresh Bread",
                                desc: "Sourdough, rolls, sandwich loaves and more.",
                                Icon: Wheat,
                            },
                            {
                                title: "Cakes & Events",
                                desc: "Birthdays, weddings, corporate events.",
                                Icon: CakeSlice,
                            },
                            {
                                title: "Pastries & Snacks",
                                desc: "Croissants, cookies, seasonal favorites.",
                                Icon: Sparkles,
                            },
                            {
                                title: "Bulk / Catering",
                                desc: "Large orders for offices and parties.",
                                Icon: ShoppingBag,
                            },
                        ].map(({ title, desc, Icon }) => (
                            <div
                                key={title}
                                className="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/60 p-5 hover:bg-[var(--panel)]/80 transition"
                            >
                                <div className="size-10 rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 border border-amber-500/10 flex items-center justify-center mb-3">
                                    <Icon className="size-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="font-bold">{title}</div>
                                <div className="text-sm text-[var(--muted)] mt-1">{desc}</div>
                            </div>
                                        ))}
                                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="cta" className="scroll-mt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
                    <div className="rounded-[32px] border border-[var(--border)] bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/10 p-8 sm:p-10 overflow-hidden relative">
                        <div className="absolute -top-20 -right-20 size-[260px] rounded-full bg-rose-500/20 blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 size-[260px] rounded-full bg-amber-500/20 blur-3xl" />

                        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div className="space-y-3">
                                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                    Ready to order?
                                </div>
                                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                    Let {bakeryName} bake for your next moment.
                                </h3>
                                <p className="text-[var(--muted)]">
                                    Need a custom cake, a bulk bread order, or a weekly office delivery? Reach out and
                                    we’ll get back quickly with options and pricing.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-start lg:justify-end">
                                <Button
                                    color="primary"
                                    className="bg-[var(--accent)] text-white"
                                    startContent={<Phone className="size-4" />}
                                    onPress={() => scrollToSection("contact")}
                                >
                                    Contact details
                                </Button>
                                <Button
                                    variant="bordered"
                                    className="border-[var(--border)]"
                                    startContent={<Mail className="size-4" />}
                                    onPress={() => {
                                        if (bakerySettings?.email?.trim()) {
                                            window.location.href = `mailto:${bakerySettings.email}`;
                                        } else {
                                            scrollToSection("contact");
                                        }
                                    }}
                                >
                                    Email us
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact + Map */}
            <section id="contact" className="scroll-mt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                Contact
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                Visit {bakeryName} or reach out anytime.
                            </h2>
                            <p className="text-[var(--muted)]">
                                We’d love to hear from you. Call, email, or visit our location.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/60 p-5">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Phone className="size-4 text-amber-600 dark:text-amber-400" />
                                        Phone
                                    </div>
                                    <div className="text-sm text-[var(--muted)] mt-2">
                                        {bakerySettings?.phoneNumber?.trim() || "—"}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/60 p-5">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Mail className="size-4 text-amber-600 dark:text-amber-400" />
                                        Email
                                    </div>
                                    <div className="text-sm text-[var(--muted)] mt-2">
                                        {bakerySettings?.email?.trim() || "—"}
                                    </div>
                                </div>
                                <div className="sm:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--panel)]/60 p-5">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <MapPin className="size-4 text-amber-600 dark:text-amber-400" />
                                        Address
                                    </div>
                                    <div className="text-sm text-[var(--muted)] mt-2">
                                        {bakerySettings?.address?.trim() || "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[var(--border)] overflow-hidden bg-[var(--panel)]/60">
                            <div className="p-4 flex items-center justify-between gap-3">
                                <div className="font-semibold">Map</div>
                                <Button
                                    size="sm"
                                    variant="bordered"
                                    className="border-[var(--border)]"
                                    onPress={() => window.open(mapOpenUrl, "_blank", "noreferrer")}
                                >
                                    Open in Google Maps
                                </Button>
                            </div>
                            <div className="aspect-[16/11] w-full">
                                <iframe
                                    title={`${bakeryName} map`}
                                    src={mapEmbedUrl}
                                    className="w-full h-full"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[var(--border)] bg-[var(--panel)]/50">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                {bakerySettings?.logoUrl ? (
                                    <img
                                        src={bakerySettings.logoUrl}
                                        alt={bakeryName}
                                        className="size-10 rounded-xl object-contain bg-white/60 dark:bg-black/10"
                                    />
                                ) : (
                                    <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center">
                                        <span className="text-lg">🍞</span>
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold">{bakeryName}</div>
                                    <div className="text-xs text-[var(--muted)]">Freshly baked, every day</div>
                                    </div>
                                </div>
                                    <p className="text-sm text-[var(--muted)]">
                                {bakeryName} is your neighborhood bakery for artisan breads, pastries, and custom cakes.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="font-semibold">Quick links</div>
                            <div className="flex flex-col gap-2 text-sm">
                                {navLinks.map((l) => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        className="text-left text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                                        onClick={() => scrollToSection(l.id)}
                                    >
                                        {l.label}
                                    </button>
                                        ))}
                                    </div>
                                </div>

                        <div className="space-y-3">
                            <div className="font-semibold">Contact</div>
                            <div className="space-y-2 text-sm text-[var(--muted)]">
                                <div className="flex items-center gap-2">
                                    <Phone className="size-4" />
                                    <span>{bakerySettings?.phoneNumber?.trim() || "—"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="size-4" />
                                    <span>{bakerySettings?.email?.trim() || "—"}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <MapPin className="size-4 mt-0.5" />
                                    <span>{bakerySettings?.address?.trim() || "—"}</span>
                                </div>
                            </div>
                    </div>

                        <div className="space-y-3">
                            <div className="font-semibold">Social</div>
                            {socialLinks.length === 0 ? (
                                <div className="text-sm text-[var(--muted)]">
                                    No social links configured.
                            </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {socialLinks.map(({ key, url, Icon, label }) => (
                                        <a
                                            key={key}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center size-10 rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 hover:bg-[var(--bg)] transition"
                                            aria-label={label}
                                            title={label}
                                        >
                                            <Icon className="size-5 text-[var(--muted)]" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                </div>

                    <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted)]">
                        <div>
                            © {new Date().getFullYear()} {bakeryName}. All rights reserved.
                        </div>
                        <button
                            type="button"
                            className="hover:text-[var(--fg)]"
                            onClick={() => scrollToSection("home")}
                        >
                            Back to top
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}


