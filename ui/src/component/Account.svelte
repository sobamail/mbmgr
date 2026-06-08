<script lang="ts">
    import { encode } from "@msgpack/msgpack";
    import { ResponseCompact } from "../lib/Response";

    let { account, name, homepage, roles, admin } = $props();

    type UserInfoPutResponse = {
        result: string;
    };

    export async function saveUserInfo() {
        let buffer;
        try {
            const response = await fetch("/api/v2/object", {
                method: "POST",
                headers: { "Content-Type": "application/msgpack" },
                body: encode({
                    namespace: "https://sobamail.com/module/mailboxmanager/v1",
                    name: "UserInfoPut",
                    content: {
                        name,
                        homepage,
                    },
                }) as BodyInit,
            });

            buffer = await response.arrayBuffer();
        } catch (error) {
            console.error("Failed to put user info:", error);
        }

        if (buffer) {
            const object = new ResponseCompact(buffer);
            console.log(JSON.stringify(object));

            if (object.content) {
                const content = object.content as UserInfoPutResponse;
                console.log(`Put result: ${JSON.stringify(content)}`);
            }
        }
    }
</script>

<div class="card-content">
    <h2>Account Settings</h2>

    <div class="form-section">
        <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>Email Address</label>
            <div class="email-display">
                <img class="mail-icon" src="/mail.svg" alt="mail icon" />
                <span>{account}</span>
            </div>
            <p class="help-text">
                This is your primary Account
                {#if admin}
                    <br /><span
                        >Your account administrator is: <a href="mailto:{admin}"
                            >{admin}</a
                        ></span
                    >
                {/if}
            </p>
        </div>

        <div class="form-group">
            <label for="name">Display Name:</label>
            <input
                type="text"
                id="name"
                bind:value={name}
                placeholder="Enter your display name"
            />
        </div>

        <div class="form-group">
            <label for="url">Homepage:</label>
            <input
                type="url"
                id="url"
                bind:value={homepage}
                placeholder="https://example.com/"
            />
        </div>

        {#if roles && roles.length > 0}
            <div class="form-group">
                <label for="url">Roles:</label>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Domain</th>
                            <th>User</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each roles as role}
                            <tr>
                                <td>{role.name}</td>
                                <td>{roles.domain ? role.domain : "*"}</td>
                                <td>{roles.user ? role.user : "*"}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>
