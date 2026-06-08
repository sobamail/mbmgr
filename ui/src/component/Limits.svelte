<script lang="ts">
    import { onMount } from "svelte";
    import { encode } from "@msgpack/msgpack";
    import { ResponseCompact } from "../lib/Response";

    let inboundLimit: number = $state(0);
    let outboundLimit: number = $state(0);

    type LimitsGetResponseType = {
        inbound: number;
        outbound: number;
    };

    async function fetchLimits() {
        let buffer;
        try {
            const response = await fetch("/api/v2/object", {
                method: "POST",
                headers: { "Content-Type": "application/msgpack" },
                body: encode({
                    namespace: "https://sobamail.com/module/mailboxmanager/v1",
                    name: "LimitsGet",
                    content: [],
                }) as BodyInit,
            });

            buffer = await response.arrayBuffer();
        } catch (error) {
            console.error("Failed to fetch limits:", error);
        }

        if (buffer) {
            const object = new ResponseCompact(buffer);

            if (object.content) {
                const content = object.content as LimitsGetResponseType;
                inboundLimit = content.inbound;
                outboundLimit = content.outbound;
            }
        }
    }

    export async function saveLimits() {
        let buffer;
        try {
            const response = await fetch("/api/v2/object", {
                method: "POST",
                headers: { "Content-Type": "application/msgpack" },
                body: encode({
                    namespace: "https://sobamail.com/module/mailboxmanager/v1",
                    name: "LimitsPut",
                    content: {
                        inbound: inboundLimit,
                        outbound: outboundLimit,
                    },
                }) as BodyInit,
            });

            buffer = await response.arrayBuffer();
        } catch (error) {
            console.error("Failed to put limits:", error);
        }

        if (buffer) {
            const object = new ResponseCompact(buffer);
            console.log(JSON.stringify(object));
        }
    }

    onMount(async () => {
        await fetchLimits();
    });
</script>

<div class="card-content">
    <h2>Per-message Limits</h2>

    <div class="form-section">
        <div class="form-group">
            <label for="inbound">Inbound Limit</label>
            <div class="number-input-group">
                <input
                    type="number"
                    id="inbound"
                    bind:value={inboundLimit}
                    min="1"
                    step="1"
                />
                <span class="unit">MB</span>
            </div>
            <p class="help-text">Maximum size of incoming emails</p>
        </div>

        <div class="form-group">
            <label for="outbound">Outbound Limit</label>
            <div class="number-input-group">
                <input
                    type="number"
                    id="outbound"
                    bind:value={outboundLimit}
                    min="1"
                    step="1"
                />
                <span class="unit">MB</span>
            </div>
            <p class="help-text">Maximum size of outgoing emails</p>
        </div>
    </div>
</div>

<style>
</style>
