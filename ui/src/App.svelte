<script lang="ts">
    import Account from "./component/Account.svelte";
    import Limits from "./component/Limits.svelte";
    import { onMount } from "svelte";
    import { encode } from "@msgpack/msgpack";
    import { ResponseCompact } from "./lib/Response";

    type Alias = {
        name: string;
        homepage: string;
    };

    type Domain = {
        name: string;
    };

    type UserRole = {
        name: string;
        domain: string | null;
        user: string | null;
    };

    type UserInfoGetResponse = {
        admin: null | string;
        account: string;
        aliases: Alias[];
        domains: Domain[];
        roles: UserRole[];
    };

    let activeMenu: "sender" | "limits" | "domains" = $state("sender");
    let sender: Account | null = $state(null);
    let limits: Limits | null = $state(null);
    let navCollapsed: boolean = $state(false);

    // properties coming from UserInfoGet
    let account: string = $state("");
    let name: string = $state("");
    let homepage: string = $state("");
    let admin: string = $state("");
    let domains: Domain[] = $state([]);
    let roles: UserRole[] = $state([]);

    async function fetchUserInfo() {
        let buffer;
        try {
            const response = await fetch("/api/v2/object", {
                method: "POST",
                headers: { "Content-Type": "application/msgpack" },
                body: encode({
                    namespace: "https://sobamail.com/module/mailboxmanager/v1",
                    name: "UserInfoGet",
                    content: [0],
                }) as BodyInit,
            });

            buffer = await response.arrayBuffer();
        } catch (error) {
            console.error("Failed to fetch user info:", error);
        }

        if (!buffer) {
            return;
        }

        const object = new ResponseCompact(buffer);
        if (!object.content) {
            return;
        }

        const content = object.content as UserInfoGetResponse;

        // account
        account = content.account;

        // admin
        if (content.admin) {
            admin = content.admin;
        }

        // aliases
        for (const [k, v] of Object.entries(content.aliases || {})) {
            if (k != account) {
                continue;
            }

            if (v && v.name) {
                name = v.name;
            }

            if (v && v.homepage) {
                homepage = v.homepage;
            }
        }

        // roles
        if (content.roles && content.roles.length > 0) {
            roles = content.roles;
        }

        // domains
        domains = content.domains;
    }

    onMount(async () => {
        await fetchUserInfo();
    });

    function handleSave() {
        if (sender && activeMenu == "sender") {
            sender.saveUserInfo();
        }
        if (limits && activeMenu == "limits") {
            limits.saveLimits();
        }
    }

    onMount(() => {
        if (window && window.localStorage) {
            {
                const v = window.localStorage.getItem("navCollapsed");
                if (v !== null) {
                    navCollapsed = v !== "0";
                }
            }
            {
                const v = window.localStorage.getItem("activeMenu");
                if (v === "sender" || v === "limits" || v === "domains") {
                    activeMenu = v;
                }
            }
        }
    });

    $effect(() => {
        if (window && window.localStorage) {
            window.localStorage.setItem(
                "navCollapsed",
                navCollapsed ? "1" : "0",
            );
        }
    });

    $effect(() => {
        if (window && window.localStorage) {
            window.localStorage.setItem("activeMenu", activeMenu);
        }
    });
</script>

<div class="app-container">
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <h1>Settings</h1>
        </div>
    </div>

    <div class="main-content">
        <div class="content-wrapper">
            <!-- Left Sidebar Menu -->
            <div class="sidebar" class:collapsed={navCollapsed}>
                <nav>
                    <!-- collapse button in the margin between nav and content -->
                    <button
                        class="nav-toggle"
                        onclick={() => (navCollapsed = !navCollapsed)}
                        aria-label="Toggle icon text"
                        title="Toggle icon text"
                    >
                        {#if navCollapsed}
                            <span class="arrow">▶</span>
                        {:else}
                            <span class="arrow">◀</span>
                        {/if}
                    </button>

                    <button
                        class="nav-item"
                        class:active={activeMenu === "sender"}
                        onclick={() => (activeMenu = "sender")}
                    >
                        <svg
                            class="nav-icon"
                            height="480"
                            viewBox="0 0 127 127"
                            width="480"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            ><linearGradient
                                id="a"
                                gradientUnits="userSpaceOnUse"
                                x1="63.72385"
                                x2="63.874599"
                                y1="64.059652"
                                y2="127.446232"
                                ><stop offset="0" stop-color="#e1faff" /><stop
                                    offset=".69760984"
                                    stop-color="#e1faff"
                                /><stop
                                    offset="1"
                                    stop-color="#e1faff"
                                    stop-opacity="0"
                                /></linearGradient
                            ><circle
                                cx="63.5"
                                cy="38.100002"
                                r="25.4"
                                style="fill:#e1faff;fill-rule:evenodd;stroke:currentColor;stroke-width:12.7;stroke-linecap:round;stroke-linejoin:bevel"
                            /><circle
                                cx="63.873089"
                                cy="114.83726"
                                fill="url(#a)"
                                fill-rule="evenodd"
                                opacity=".821317"
                                r="45.508335"
                            /><path
                                d="m12.760174 114.14918a50.80397 50.722179 0 0 1 50.803971-50.72218 50.80397 50.722179 0 0 1 50.803965 50.72218"
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="bevel"
                                stroke-width="12.7"
                            /></svg
                        >
                        <span class="nav-text"> Account </span>
                        {#if activeMenu === "sender"}
                            <img
                                class="chevron"
                                src="/arrow.svg"
                                alt="selected"
                            />
                        {/if}
                    </button>

                    <button
                        class="nav-item"
                        class:active={activeMenu === "limits"}
                        onclick={() => (activeMenu = "limits")}
                    >
                        <svg
                            class="nav-icon"
                            fill="none"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            ><g
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                ><ellipse cx="12" cy="5" rx="9" ry="3" /><path
                                    d="m21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
                                /><path
                                    d="m3 5v14c0 1.66 4 3 9 3s9-1.34 9-3v-14"
                                /></g
                            ></svg
                        >
                        <span class="nav-text"> Mailbox Limits </span>
                        {#if activeMenu === "limits"}
                            <img
                                class="chevron"
                                src="arrow.svg"
                                alt="selected"
                            />
                        {/if}
                    </button>

                    {#if domains.length > 0}
                        <button
                            class="nav-item"
                            class:active={activeMenu === "domains"}
                            onclick={() => (activeMenu = "domains")}
                        >
                            <svg
                                class="nav-icon"
                                height="240"
                                viewBox="0 0 240 240"
                                width="240"
                                xmlns="http://www.w3.org/2000/svg"
                                ><g
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-dashoffset="2.63132"
                                    stroke-miterlimit="2"
                                    stroke-width="20"
                                    ><path
                                        d="m94.693285 215.89124c-28-66.25-20.616633-137.448729 1.633367-192.198729"
                                    /><path
                                        d="m30 80c39.05 28.05 114.25 41.25 180 0"
                                    /><circle
                                        cx="120.00001"
                                        cy="120"
                                        r="99.174393"
                                    /><path
                                        d="m23.029268 136.79028c60.446182 41.37512 153.770582 42.15996 195.073012-6.24709"
                                    /><path
                                        d="m144.07351 215.89124c28-66.25 20.61663-137.448729-1.63337-192.198729"
                                    /></g
                                ></svg
                            >

                            <span class="nav-text">Domains</span>
                            {#if activeMenu === "domains"}
                                <img
                                    class="chevron"
                                    src="arrow.svg"
                                    alt="selected"
                                />
                            {/if}
                        </button>
                    {/if}
                </nav>
            </div>

            <!-- Main Content Area -->
            <div class="content-area">
                <div class="card">
                    {#if activeMenu === "sender"}
                        <Account
                            bind:this={sender}
                            {account}
                            {name}
                            {homepage}
                            {admin}
                        />
                    {:else if activeMenu === "domains"}
                        <!-- <Domains bind:this={domains}> -->
                    {:else}
                        <Limits bind:this={limits} />
                    {/if}

                    <!-- Footer with Save Button -->
                    <div class="card-footer">
                        <button class="form-button" onclick={handleSave}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .card {
        max-width: 32rem;
    }

    .nav-icon {
        width: 1.25rem;
        height: 1.25rem;
    }

    :root {
        font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
        line-height: 1.5;
        font-weight: 400;

        color: rgba(255, 255, 255, 0.87);
        background-color: #242424;

        font-synthesis: none;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    button:focus,
    button:focus-visible {
        outline: 4px auto -webkit-focus-ring-color;
    }

    @media (prefers-color-scheme: light) {
        :root {
            color: #213547;
            background-color: #ffffff;
        }

        button {
            background-color: #f9f9f9;
        }
    }

    :global(body) {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Oxygen", "Ubuntu", "Cantarell", sans-serif;
    }

    :global(#root),
    :global(#app) {
        width: 100%;
        height: 100%;
    }

    .app-container {
        min-height: 100vh;
        background-color: #f9fafb;
        width: 100%;
    }

    .header {
        background-color: white;
        border-bottom: 1px solid #e5e7eb;
    }

    .header-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.5rem 1.5rem;
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #111827;
    }

    .main-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.5rem;
    }

    .content-wrapper {
        display: flex;
        position: relative;
        gap: 1.5rem;
    }

    .sidebar {
        --sidebar-width: 16rem;
        width: var(--sidebar-width);
        flex-shrink: 0;
        transition: width 0.18s ease;
    }

    .sidebar.collapsed {
        --sidebar-width: 3.25rem;
    }

    .sidebar.collapsed .nav-text {
        display: none;
    }

    .sidebar.collapsed .nav-item {
        justify-content: center;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }

    .sidebar.collapsed .chevron {
        display: none;
    }

    nav {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        transform: translateY(-1rem);
    }

    .nav-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 0.5rem;
        border: 1px solid transparent;
        background: none;
        cursor: pointer;
        transition: all 0.2s;
        color: #374151;
    }

    .nav-text {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .nav-item:hover {
        background-color: #f3f4f6;
    }

    .nav-item.active {
        background-color: #eff6ff;
        color: #1d4ed8;
        border-color: #bfdbfe;
    }

    .chevron {
        width: 1rem;
        height: 1rem;
        margin-left: auto;
    }

    .nav-toggle {
        display: flex;
        width: 3.25rem;
        height: 1.25rem;
        padding: 1rem;
        border: transparent;
        background: transparent;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        align-self: start;
        font-size: 0.85rem;
    }

    .nav-toggle .arrow {
        display: inline-block;
        line-height: 1;
    }

    .content-area {
        flex: 1;
        margin-top: -1rem;
    }

    .card {
        background-color: white;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        width: 100%;
    }

    .card-footer {
        border-top: 1px solid #e5e7eb;
        padding: 1rem 2rem;
        background-color: #f9fafb;
        border-radius: 0 0 0.5rem 0.5rem;
    }

    .form-button {
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 0.5rem;
        border: 1px solid transparent;
        background: none;
        cursor: pointer;
        transition: all 0.2s;
        background-color: #eff6ff;
        color: #1d4ed8;
        border-color: #bfdbfe;
    }

    .form-button:hover {
        background-color: #f3f4f6;
    }

    .form-button:disabled {
        color: #555;
        background-color: #ddd;
    }

    @media (prefers-color-scheme: light) {
        :root {
            color: #213547;
            background-color: #ffffff;
        }
    }
</style>
