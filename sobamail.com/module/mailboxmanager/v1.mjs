
export const namespace = "https://sobamail.com/module/mailboxmanager/v1";

import "soba://computer/R2";

import {
    Message,
    NotFoundError,
} from "https://sobamail.com/module/base/v1?sha224=7VxiNiRp9EhKFTmiYDW3d_Cu-1_TVdnQdEWBjw";

export const QSTR_GET_FOLDERS = `WITH RECURSIVE` +
        ` l as (SELECT value as v FROM attr WHERE key='locale')` +
        `,fnames AS (` +
        ` SELECT f.uuid FROM folders f` +
        ` JOIN folder_attr fs ON fs.folder=f.uuid` +
        ` WHERE key='name' AND lower(value,(SELECT v FROM l))=lower(?,(SELECT v FROM l))` +
        ` UNION` +
        ` SELECT f.uuid FROM folders f` +
        ` JOIN folder_attr fs ON fs.folder=f.uuid` +
        ` JOIN fnames fn ON fs.folder=fn.uuid` +
        ` WHERE key='parent' AND lower(value,(SELECT v FROM l))=lower(?,(SELECT v FROM l))` +
        `)` +
        ` SELECT uuid from fnames`;

// Internal object not to be produced by user code
export class MessageTask {
    static KEY = `{${namespace}}${this.name}`;
};

export class InitializeFolders {
    static KEY = `{${namespace}}${this.name}`;

    constructor({schema = null}) { this.schema = schema; }

    asText(locale) {
        return `Let MailboxManager know about local folders with schema version: ${
                this.instanceId}`;
    }

    toString() { return `InitializeFolders("${this.schema}")`; }
}

export class InitializeMessages {
    static KEY = `{${namespace}}${this.name}`;

    constructor({schema = null}) { this.schema = schema; }

    asText(locale) {
        return `Let MailboxManager know about local messages with schema version: ${
                this.instanceId}`;
    }

    toString() { return `InitializeMessages("${this.schema}")`; }
}

export class SetAttr {
    static KEY = `{${namespace}}${this.name}`;

    constructor({key = null, value = null}) {
        this.key = key;
        this.value = value;
    }

    process() { return soba.data.insert("attr", {key : this.key, value : this.value}); }

    asText(locale) { return `Set ${this.key}=${this.value}`; }

    toString() { return `SetAttr("${this.key}", "${this.value}")`; }
}

export class UnsetAttr {
    static KEY = `{${namespace}}${this.name}`;

    constructor({key = null}) { this.key = key; }

    process() {
        let parent = soba.data.find("state", {key : this.key}).hash;
        return soba.data.delete("state", parent);
    }

    asText(locale) { return `Unset ${this.key}`; }

    toString() { return `UnsetAttr("${this.key}")`; }
}

export class CreateFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, name = null}) {
        this.uuid = uuid;
        this.name = name;
    }

    process() {
        const split_col = this.name.split(":");
        if (split_col.length !== 2) {
            throw new Error(`Invalid folder name '${this.name}'`);
        }

        const user_name = split_col[0];
        if (! soba.type.userName.isValid(user_name)) {
            throw new Error(`Invalid user name in folder name '${this.name}'`);
        }

        let fuuid_parent = null;

        const fnames = split_col[1].split("/");
        for (let i = 0, l = fnames.length - 1; i < l; ++i) {
            const fname = fnames[i];

            if (! soba.type.folderName.isValid(fname)) {
                throw new Error(`Invalid folder name fragment '${fname}' in '${this.name}'`);
            }

            const rows = soba.db.exec(QSTR_GET_FOLDERS, fname, fuuid_parent).data;
            if (rows.length < 1) {
                throw new NotFoundError({id : fname, type : fname});
            }

            fuuid_parent = rows[0][0];
        }

        const fuuid = this.uuid;
        const folder = soba.data.insert("folders", {uuid : this.uuid, mirror : 0});

        if (fuuid_parent) {
            soba.data.find("folders", {uuid : fuuid_parent, mirror : 0});
            soba.data.insert("folder_attr",
                    {folder : fuuid, key : "parent", value : fuuid_parent, mirror : 0});
        }
        else {
            soba.data.insert(
                    "folder_attr", {folder : fuuid, key : "parent", value : null, mirror : 0});
        }

        soba.data.insert("folder_attr", {
            folder : fuuid,
            key : "name",
            value : split_col[1].split("/").at(-1),
            mirror : 0,
        });

        return folder;
    }

    asText(locale) { return `Create folder uuid '${this.uuid}' name '${this.name}'`; }

    toString() { return `CreateFolder("${this.uuid}", "${this.name}")`; }
}

export class InsertFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, mirror = false}) {
        this.uuid = uuid;
        this.mirror = mirror;
    }

    process() { return soba.data.insert("folders", {uuid : this.uuid, mirror : this.mirror}); }

    asText(locale) { return `Insert folder uuid '${this.uuid}' name '${this.name}'`; }

    toString() { return `InsertFolder("${this.uuid}", "${this.name}")`; }
}

export class DeleteFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null} = {}) { this.uuid = uuid; }

    process() {
        /* clang-format off */
        const rows = soba.db.exec(
            `WITH RECURSIVE children as (`
            + ` SELECT 0 as l,key,folder FROM folder_attr WHERE key='parent' and value=?`
            + ` UNION`
            + ` SELECT c.l+1 as l,fs.key,fs.folder FROM folder_attr fs`
            + ` JOIN children c ON fs.value=c.folder WHERE fs.key=c.key`
            + `)`
            + `SELECT folder FROM children ORDER BY l DESC`,
            this.uuid)
            .data;
        /* clang-format on */

        for (let i = 0, l = rows.length; i < l; ++i) {
            const fuuid = rows[i][0];
            let parent = soba.data.find("folders", {uuid : fuuid}).hash;
            soba.data.delete("folders", parent);
        }

        let parent = soba.data.find("folders", {uuid : this.uuid}).hash;
        return soba.data.delete("folders", parent);
    }

    asText(locale) { return `Delete folder '${this.uuid}' and all its children`; }

    toString() { return `DeleteFolder("${this.uuid}")`; }
}

export class SetAttrFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, key = null, value = null, mirror = false}) {
        this.folder = folder;
        this.key = key;
        this.value = value;
        this.mirror = mirror;
    }

    process() {
        if (! this.key) {
            throw new Error("empty key");
        }

        if (this.key === "name" && this.value.includes(":")) {
            throw new Error(`Invalid folder name: ${this.value}`);
        }

        if (this.key === "name" && this.value === this.folder) {
            throw new Error(`Heuristic: Probably invalid folder name: ${this.value}`);
        }

        soba.data.find("folders", {uuid : this.folder});
        return soba.data.insert("folder_attr", {
            folder : this.folder,
            key : this.key,
            value : this.value,
            mirror : this.mirror,
        });
    }

    asText(locale) {
        return `Set state for folder ${this.folder} key '${this.key}' value '${this.value}'`;
    }

    toString() { return `SetAttrFolder(${this.folder}, '${this.key}', '${this.value}')`; }
}

export class UnsetAttrFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, key = null, mirror = false}) {
        this.folder = folder;
        this.key = key;
        this.mirror = mirror;
    }

    process() {
        if (! this.key) {
            throw new Error("empty key");
        }

        let parent = soba.data.find("folder_attr", {folder : this.folder, key : this.key}).hash;
        return soba.data.delete("folder_attr", parent);
    }

    asText(locale) { return `Unset state for folder ${this.folder} key '${this.key}'`; }

    toString() { return `UnsetAttrFolder(${this.folder}, ${this.key})`; }
}

export class AddMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.mirror = mirror;
    }

    process() { return soba.data.insert("messages", this); }

    asText(locale) { return `Add message ${this.message} to folder '${this.folder}'`; }

    toString() { return `AddMessage("${this.folder}", "${this.message}")`; }
}

export class RemoveMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.mirror = mirror;
    }

    process() {
        let parent =
                soba.data.find("messages", {folder : this.folder, message : this.message}).hash;
        return soba.data.delete("messages", parent);
    }

    asText(locale) { return `Remove message ${this.message} from folder '${this.folder}'`; }

    toString() { return `RemoveMessage("${this.folder}", "${this.message}")`; }
}

export class SetAttrMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, key = null, value = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.key = key;
        this.value = value;
        this.mirror = mirror;
    }

    asText(locale) {
        return `Set state in folder ${this.folder} for message ${this.message} key '${
                this.key}' value '${this.value}'`;
    }

    toString() {
        return `SetAttrMessage(${this.folder}, ${this.message}, ${this.key}, ${this.value})`;
    }

    process() {
        if (! this.key) { // https://stackoverflow.com/a/154068
            throw new Error("empty key");
        }

        return soba.data.insert("message_attr", this);
    };
}

export class UnsetAttrMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, key = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.key = key;
        this.mirror = mirror;
    }

    asText(locale) {
        return `Unset state in folder ${this.folder} for message ${this.message} key '${this.key}'`;
    }

    toString() { return `UnsetAttrMessage(${this.folder}, ${this.message}, ${this.key})`; }

    process() {
        if (! this.key) {
            throw new Error("empty key");
        }

        let parent = soba.data
                             .find("message_attr", {
                                 folder : this.folder,
                                 message : this.message,
                                 key : this.key,
                             })
                             .hash;
        return soba.data.delete("message_attr", parent);
    }
}

export class GrantAccess {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null, address = null}) {
        this.message = message;
        this.address = address;
    }

    process() {
        return soba.data.insert("access", {message : this.message, address : this.address});
    }

    asText(locale) { return `Grant access to message ${this.message} to address ${this.address}`; }

    toString() { return `GrantAccess("${this.message}", "${this.address}")`; }
}

export class RevokeAccess {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null, address = null}) {
        this.message = message;
        this.address = address;
    }

    process() {
        let parent =
                soba.data.find("access", {message : this.message, address : this.address}).hash;
        return soba.data.delete("access", parent);
    }

    asText(locale) {
        return `Revoke access of address ${this.address} to message ${this.message} `;
    }

    toString() { return `RevokeAccess("${this.message}", "${this.address}")`; }
}

export class DeliverMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null} = {}) { this.message = message; }

    process() { soba.log.warning(`Ignoring DeliverMessage event for message ${this.message}`); }

    asText(locale) { return `Deliver message ${this.message}`; }

    toString() { return `DeliverMessage("${this.message}")`; }
}

export class DeliveryEvent {
    static KEY = `{${namespace}}${this.name}`;

    constructor({
        server = null,
        utctimeMs = null,
        message = null,
        destaddr = null,
        statuscode = null,
        statustext = null,
        statusdata = null,
    } = {}) {
        this.server = server;
        this.utctimeMs = utctimeMs;
        this.message = message;
        this.destaddr = destaddr;
        this.statuscode = statuscode;
        this.statustext = statustext;
        this.statusdata = statusdata;
    }

    process() { soba.log.warning(`Ignoring DeliveryEvent event: ${JSON.stringify(this)}`); }

    asText(locale) { return `Delivery event ${this.message} to address ${this.destaddr}`; }

    toString() {
        return `DeliveryEvent("${this.server}, ${this.utctimeMs}, ${this.message},` +
                ` ${this.destaddr}, ${this.statuscode}, ${this.statustext}, ${this.statusdata}, ")`;
    }
}

export class UserInfoGet {
    static KEY = `{${namespace}}${this.name}`;
    process() { soba.task.respond(new UserInfoGetResponse()); }
}

export class UserInfoGetResponse {
    static KEY = `{${namespace}}${this.name}`;
    constructor() {
        this.account = soba.app.account();
        this.aliases = this.read_aliases();
        this.domains = this.read_domains();
        this.roles = this.read_roles();
        this.admin = this.read_admin();
    }

    read_aliases() {
        const ret = soba.db.exec("select address,key,value from iden_attr order by address");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let aliases = {};
        for (const row of ret.data) {
            if (! aliases[row[0]]) {
                aliases[row[0]] = {};
            }

            aliases[row[0]][row[1]] = row[2];
        }

        return aliases;
    }

    read_domains() {
        const ret = soba.db.exec("SELECT name FROM domains ORDER BY name");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let domains = [];
        for (const row of ret.data) {
            domains.push({name : row[0]});
        }

        return domains;
    }

    read_admin() {
        const ret = soba.db.exec("SELECT value FROM attr WHERE key='admin'");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        const rows = ret.data;
        if (rows.length != 1) {
            const ret = soba.data.insert("attr", {key : "admin_get", value : true});
            if (ret.inserted) { // idempotency
                let message = new Message();
                message.from = [ {address : soba.app.account()} ];
                message.to = [ {address : "mbmgr@api.sobamail.com"} ];
                message.bodyObject = {
                    contentId : message.nextContentId(),
                    type : "application/json",
                    content : {
                        namespace : namespace,
                        name : "UserInfoAdminGet",
                        content : {},
                    },
                };

                soba.mail.send(message);
            }

            return null;
        }

        const admin = rows[0][0];
        if (! (typeof admin !== "string")) {
            return null;
        }

        // forward compat
        if (admin.startsWith("[")) {
            admin = JSON.parse(admin);
            if (admin.length === 0) {
                return null;
            }
            admin = admin[0];
        }

        return admin;
    }

    read_roles() {
        const ret = soba.db.exec("SELECT name,domain,user FROM roles");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let roles = [];
        for (const row of ret.data) {
            roles.push({name : row[0], domain : row[1], user : row[2]});
        }

        return roles;
    }
}

export class UserInfoPut {
    static KEY = `{${namespace}}${this.name}`;

    constructor({aliases = null} = {}) { this.aliases = aliases; }

    process() {
        if (! this.aliases) {
            throw new Error("Invalid request");
        }

        for (const [alias, attrs] of Object.entries(this.aliases)) {
            if (alias != soba.app.account()) {
                continue;
            }

            soba.data.insert("iden", {address : alias});
            for (const [key, val] of Object.entries(attrs)) {
                soba.data.insert("iden_attr", {address : alias, key : key, value : val});
            }
        }

        soba.task.respond(new UserInfoPutResponse({result : "OK!"}));
    }
}

export class UserInfoPutResponse {
    static KEY = `{${namespace}}${this.name}`;
}

export class AddIdentity {
    static KEY = `{${namespace}}${this.name}`;

    constructor({address = null}) { this.address = address; }

    process() { return soba.data.insert("iden", this); }
}

export class AddIdentityAttr {
    static KEY = `{${namespace}}${this.name}`;

    constructor({address = null, key = null, value = null}) {
        this.address = address;
        this.key = key;
        this.value = value;
    }

    process() { return soba.data.insert("iden_attr", this); }
}

export class LimitsGet {
    static KEY = `{${namespace}}${this.name}`;

    process() {
        const inboundRet = soba.db.exec("select value from attr where key='inbound_limit'");
        const outboundRet = soba.db.exec("select value from attr where key='outbound_limit'");

        const inbound = inboundRet.data.length > 0 ? Number(inboundRet.data[0][0]) : 32;
        const outbound = outboundRet.data.length > 0 ? Number(outboundRet.data[0][0]) : 32;

        soba.task.respond(new LimitsGetResponse({inbound, outbound}));
    }
}

export class LimitsGetResponse {
    static KEY = `{${namespace}}${this.name}`;

    constructor({inbound = null, outbound = null} = {}) {
        this.inbound = inbound;
        this.outbound = outbound;
    }
}

export class LimitsPut {
    static KEY = `{${namespace}}${this.name}`;

    constructor({inbound = null, outbound = null} = {}) {
        this.inbound = inbound;
        this.outbound = outbound;
    }

    process() {
        if (this.inbound !== undefined) {
            soba.data.insert("attr", {key : "inbound_limit", value : String(this.inbound)});
        }
        if (this.outbound !== undefined) {
            soba.data.insert("attr", {key : "outbound_limit", value : String(this.outbound)});
        }
        soba.task.respond(new LimitsPutResponse());
    }
}

export class LimitsPutResponse {
    static KEY = `{${namespace}}${this.name}`;
}

export class AddFilter {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, name = null, enabled = true, conditions = [], actions = []} = {}) {
        this.uuid = uuid;
        this.name = name;
        this.enabled = enabled;
        this.conditions = conditions;
        this.actions = actions;
    }

    process() {
        soba.data.insert("filters", {uuid : this.uuid});
        soba.data.insert("filter_attr", {filter : this.uuid, key : "name", value : this.name});
        soba.data.insert(
                "filter_attr", {filter : this.uuid, key : "enabled", value : this.enabled ? 1 : 0});

        for (const cond of this.conditions) {
            soba.data.insert("filter_cond", {
                filter : this.uuid,
                field : cond.field,
                op : cond.op,
                value : cond.value,
            });
        }

        for (const act of this.actions) {
            if (act.type === "fileinto") {
                soba.data.insert(
                        "filter_action_fileinto", {filter : this.uuid, folder : act.folder});
            }
            else if (act.type === "delete") {
                soba.data.insert("filter_action_delete", {filter : this.uuid});
            }
            else {
                throw new Error(`Unknown filter action type '${act.type}'`);
            }
        }
    }

    asText(locale) { return `Add filter '${this.name}' (${this.uuid})`; }

    toString() { return `AddFilter("${this.uuid}", "${this.name}")`; }
}

export class AddFilterAttr {
    static KEY = `{${namespace}}${this.name}`;

    constructor({filter = null, key = null, value = null} = {}) {
        this.filter = filter;
        this.key = key;
        this.value = value;
    }

    process() { return soba.data.insert("filter_attr", this); }

    asText(locale) { return `Set filter ${this.filter} attr '${this.key}'='${this.value}'`; }

    toString() { return `AddFilterAttr("${this.filter}", "${this.key}")`; }
}

export class AddFilterCond {
    static KEY = `{${namespace}}${this.name}`;

    constructor({filter = null, field = null, op = null, value = null} = {}) {
        this.filter = filter;
        this.field = field;
        this.op = op;
        this.value = value;
    }

    process() { return soba.data.insert("filter_cond", this); }

    asText(locale) {
        return `Add condition to filter ${this.filter}: ${this.field} ${this.op} ${this.value}`;
    }

    toString() { return `AddFilterCond("${this.filter}", "${this.field}", "${this.op}")`; }
}

export class AddFilterActionFileinto {
    static KEY = `{${namespace}}${this.name}`;

    constructor({filter = null, folder = null} = {}) {
        this.filter = filter;
        this.folder = folder;
    }

    process() { return soba.data.insert("filter_action_fileinto", this); }

    asText(locale) {
        return `Add fileinto action to filter ${this.filter}: folder '${this.folder}'`;
    }

    toString() { return `AddFilterActionFileinto("${this.filter}", "${this.folder}")`; }
}

export class AddFilterActionDelete {
    static KEY = `{${namespace}}${this.name}`;

    constructor({filter = null} = {}) { this.filter = filter; }

    process() { return soba.data.insert("filter_action_delete", this); }

    asText(locale) { return `Add delete action to filter ${this.filter}`; }

    toString() { return `AddFilterActionDelete("${this.filter}")`; }
}

export class RemoveFilter {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null} = {}) { this.uuid = uuid; }

    process() {
        const condRet = soba.db.exec(`SELECT field FROM filter_cond WHERE filter=?`, this.uuid);
        for (const row of condRet.data) {
            const hash = soba.data.find("filter_cond", {filter : this.uuid, field : row[0]}).hash;
            soba.data.delete("filter_cond", hash);
        }

        const fileintoRet =
                soba.db.exec(`SELECT folder FROM filter_action_fileinto WHERE filter=?`, this.uuid);
        for (const row of fileintoRet.data) {
            const hash =
                    soba.data.find("filter_action_fileinto", {filter : this.uuid, folder : row[0]})
                            .hash;
            soba.data.delete("filter_action_fileinto", hash);
        }

        const deleteRet =
                soba.db.exec(`SELECT filter FROM filter_action_delete WHERE filter=?`, this.uuid);
        if (deleteRet.data.length > 0) {
            const hash = soba.data.find("filter_action_delete", {filter : this.uuid}).hash;
            soba.data.delete("filter_action_delete", hash);
        }

        const attrRet = soba.db.exec(`SELECT key FROM filter_attr WHERE filter=?`, this.uuid);
        for (const row of attrRet.data) {
            const hash = soba.data.find("filter_attr", {filter : this.uuid, key : row[0]}).hash;
            soba.data.delete("filter_attr", hash);
        }

        const filterHash = soba.data.find("filters", {uuid : this.uuid}).hash;
        return soba.data.delete("filters", filterHash);
    }

    asText(locale) { return `Remove filter '${this.uuid}'`; }

    toString() { return `RemoveFilter("${this.uuid}")`; }
}

export class AddRole {
    static KEY = `{${namespace}}${this.name}`;

    constructor({name, domain = null, user = null} = {}) {
        this.name = name;
        this.domain = domain;
        this.user = user;
    }

    process() {
        soba.data.insert("roles", this);
        soba.log.debug(`Wrote role ${JSON.stringify(this)}`);
    }
}

export class RevokeRole {
    static KEY = `{${namespace}}${this.name}`;

    constructor({name, domain, user} = {}) {
        this.name = name;
        this.domain = domain;
        this.user = user;
    }

    process() {
        const parent = soba.data.find("roles", this).hash;
        soba.data.delete(parent);
    }
}
