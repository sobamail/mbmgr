
import "soba://computer/R1"

import {
    DeleteRow,
    Message,
    NotFoundError,
} from "https://sobamail.com/module/base/v1?sha224=kM34Fu3HPamGh8HASDf45dkVNbIRWpZJ2dyRjg";
/* clang-format off */
import {
    InitializeFolders,
    InitializeMessages,

    SetAttr,
    UnsetAttr,

    CreateFolder,
    InsertFolder,
    DeleteFolder,
    SetAttrFolder,
    UnsetAttrFolder,

    AddMessage,
    RemoveMessage,
    SetAttrMessage,
    UnsetAttrMessage,

    GrantAccess,
    RevokeAccess,

    MessageTask,
    DeliverMessage,
    DeliveryEvent,

    GetRules,
    AddRule,
    AddHeaderCondition,
    AddBodyCondition,
    AddFileIntoAction,
} from "https://sobamail.com/module/mailboxmanager/v1?sha224=czB5JvZ60YT1fr_zpGLhKsuG-FNaavmzpUhyyw";
/* clang-format on */

class InvalidFolderName extends Error {
    constructor(folder) { super(`Folder name '${folder}' is invalid`); }
}

class AccountMismatch extends Error {
    constructor(account) {
        super(`Unknown account '${account}'. Expected: '${soba.app.account()}'`);
    }
}

class FolderMissingParent extends Error {
    constructor(folder) { super(`Missing parent CreateFolder request for '${folder}'`); }
}

/* clang-format off */
const QSTR_GET_FOLDERS =
        `WITH RECURSIVE`
    + ` l as (SELECT value as v FROM attr WHERE key='locale')`
    + `,fnames AS (`
    + ` SELECT f.uuid FROM folders f`
    + ` JOIN folder_attr fs ON fs.folder=f.uuid`
    + ` WHERE key='name' AND lower(value,(SELECT v FROM l))=lower(?,(SELECT v FROM l))`
    + ` UNION`
    + ` SELECT f.uuid FROM folders f`
    + ` JOIN folder_attr fs ON fs.folder=f.uuid`
    + ` JOIN fnames fn ON fs.folder=fn.uuid`
    + ` WHERE key='parent' AND lower(value,(SELECT v FROM l))=lower(?,(SELECT v FROM l))`
    + `)`
    + ` SELECT uuid from fnames`;
/* clang-format on */

export default class MailboxManager {
    static id = "mailboxmanager.core.app.sobamail.com";
    static name = "Mailbox Manager";
    static version = "1.0.0.0"; // read from apps.db/instances table
    static schema = 5;
    static objects = new Map([
        [ Message.KEY, false ],
        [ MessageTask.KEY, false ],

        [ DeleteRow.KEY, false ],

        [ InitializeFolders.KEY, false ],
        [ InitializeMessages.KEY, false ],

        [ SetAttr.KEY, false ],
        [ UnsetAttr.KEY, false ],

        [ InsertFolder.KEY, false ],
        [ CreateFolder.KEY, false ],
        [ DeleteFolder.KEY, false ],
        [ SetAttrFolder.KEY, false ],
        [ UnsetAttrMessage.KEY, false ],

        [ AddMessage.KEY, false ],
        [ RemoveMessage.KEY, false ],
        [ SetAttrMessage.KEY, false ],
        [ UnsetAttrMessage.KEY, false ],

        [ GrantAccess.KEY, false ],
        [ RevokeAccess.KEY, false ],

        [ DeliverMessage.KEY, false ],
        [ DeliveryEvent.KEY, false ],

        [ GetRules.KEY, false ],
        [ AddRule.KEY, false ],
        [ AddHeaderCondition.KEY, false ],
        [ AddBodyCondition.KEY, false ],
        [ AddFileIntoAction.KEY, false ],
    ]);

    constructor() {
        soba.schema.table({
            name : "attr",
            insertEvent : SetAttr,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
            ],
        });

        /*
         * folders
         */
        soba.schema.table({
            name : "folders",
            insertEvent : InsertFolder,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "uuid",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "lww", value : true},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
        });

        soba.schema.table({
            name : "folder_attr",
            insertEvent : SetAttrFolder,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "folders", column : "uuid"},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
            checks : [
                {
                    columns : [ "folder", "key" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        /*
         * messages
         */
        soba.schema.table({
            name : "messages",
            insertEvent : AddMessage,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "folders", column : "uuid"},
                    ],
                },
                {
                    name : "message",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
            checks : [
                {
                    columns : [ "message", "folder" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        soba.schema.table({
            name : "message_attr",
            insertEvent : SetAttrMessage,
            deleteEvent : DeleteRow,
            columns : [
                // buradaki kolon sirasi message_attr'in hangi parenta baglanacagini belirliyor.
                // ilerde bunu fk graph'ini sadelestirerek kestirmeleri elimine eden bir calisma
                // yapmak gerekecek
                {
                    name : "message",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
            checks : [
                {
                    columns : [ "message", "folder", "key" ],
                    op : "lww",
                    value : true,
                },
                {
                    columns : {message : "message", folder : "folder"},
                    op : "fk",
                    table : "messages",
                },
            ],
        });

        /*
         * rules
         */
        soba.schema.table({
            name : "rules",
            insertEvent : AddRule,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "uuid",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                        {op : "lww", value : true},
                    ],
                },
                {
                    name : "label",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    name : "type",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "in", value : [ "all", "any" ]},
                    ],
                },
            ],
        });

        soba.schema.table({
            name : "rule_cond_header",
            insertEvent : AddHeaderCondition,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "rule",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "rules", column : "uuid"},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    name : "op",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {
                            op : "in",
                            value : [
                                "contains",
                                "not contains",
                                "is",
                                "is not",
                                "starts",
                                "ends",
                            ],
                        },
                    ],
                },
                {
                    name : "value",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
            ],
        });

        soba.schema.table({
            name : "rule_cond_body",
            insertEvent : AddBodyCondition,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "rule",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "rules", column : "uuid"},
                    ],
                },
                {
                    name : "op",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {
                            op : "in",
                            value : [
                                "contains",
                                "not contains",
                                "is",
                                "is not",
                                "starts",
                                "ends",
                            ],
                        },
                    ],
                },
                {
                    name : "value",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
            ],
        });

        soba.schema.table({
            name : "rule_act_fileinto",
            insertEvent : AddFileIntoAction,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "rule",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "rules", column : "uuid"},
                    ],
                },
                {
                    name : "target",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
            ],
        });
    }

    process(message, meta) {
        soba.log.debug("meta:   " + JSON.stringify(meta) + " mesg: " + JSON.stringify(message));
        soba.log.debug("objkey: " + soba.app.objectKey() + " r: " + soba.app.isReplicated());

        if (meta.location == "limbo") {
            if (meta.type == "message") {
                // This message has not been delivered yet (it's in limbo). Deliver it first
                return this.on_email(message);
            }

            throw new Error(`Request type '${meta.type}' can not be in limbo`);
        }
        else if (meta.type == "task" || meta.type == "task-replay") {
            // a task only has the content, so it's safe to just pass it to the
            // dispatch function
            this.on_structured(message);
        }
        else if (meta.type == "message" && message.dataBody !== undefined) {
            // Here it's a structured email so we need to do some digging
            // to get to the content object
            let content = message.bodyData;
            if (content === undefined) {
                throw new Error(`Unable to read message content`);
            }

            soba.log.debug("content type: " + (typeof content));

            if (content instanceof ArrayBuffer) {
                // This means the data content was read but was not parsed correctly.
                soba.log.error(`Message ${JSON.stringify(message)} contents were not recognized`);
            }
            else {
                // This means the message was deserialized successfully
                soba.log.debug("Message structure: " + JSON.stringify(content));

                if (content.name == "MessageTask"
                        && content.namespace == "https://sobamail.com/module/mailboxmanager/v1") {
                    throw new Error("MessageTask is not supposed to seep through to here");
                }

                // If it was a signed and/or encrypted message, it will be wrapped
                // in an Envelope object, so let's dig further if that's the case.
                if (content.name == "Envelope"
                        && content.namespace == "https://sobamail.com/module/base/v1") {
                    let envelope = content.content;
                    if (envelope === undefined) {
                        throw new Error(`Envelope is empty`);
                    }

                    soba.log.debug(
                            `Envelope format: ${envelope.format}, sender: ${envelope.sender}`);

                    content = envelope.content;
                }

                // Finally we have the content, let's process it
                this.on_structured(content);
            }
        }
        else {
            this.on_email(message);
        }
    }

    on_email(message) {
        let fname = `inbox`;

        const rows = this.get_folders(fname, null).data;
        if (rows.length < 1) {
            soba.log.error(`Folder "${fname}" not found`);
            throw new NotFoundError({id : fname, type : fname});
        }

        for (const row of rows) {
            soba.data.insert("messages", {folder : row[0], message : message.uuid, mirror : 0});
        }

        soba.log.info(`Message: ${message.uuid} was delivered to inbox`);
    }

    get_folders(fname, parent) { //
        return soba.db.exec(QSTR_GET_FOLDERS, fname, parent);
    }

    on_structured(message) {
        if (message.namespace === undefined) {
            throw new Error("Message has no namespace");
        }

        if (message.name === undefined) {
            throw new Error("Message has no name");
        }

        let key = `{${message.namespace}}${message.name}`;

        if (key == SetAttrMessage.KEY) {
            return this.on_set_attr_message(message.content);
        }

        if (key == UnsetAttrMessage.KEY) {
            return this.on_unset_attr_message(message.content);
        }

        if (key == AddMessage.KEY) {
            return this.on_add_message(message.content);
        }

        if (key == RemoveMessage.KEY) {
            return this.on_remove_message(message.content);
        }

        if (key == GrantAccess.KEY) {
            return this.on_grant_access(message.content);
        }

        if (key == DeliverMessage.KEY) {
            return this.on_deliver_message(message.content);
        }

        if (key == DeliveryEvent.KEY) {
            return this.on_delivery_event(message.content);
        }

        if (key == RevokeAccess.KEY) {
            return this.on_revoke_access(message.content);
        }

        if (key == SetAttrFolder.KEY) {
            return this.on_set_attr_folder(message.content);
        }

        if (key == UnsetAttrFolder.KEY) {
            return this.on_unset_attr_folder(message.content);
        }

        if (key == InsertFolder.KEY) {
            return this.on_insert_folder(message.content);
        }

        if (key == CreateFolder.KEY) {
            return this.on_create_folder(message.content);
        }

        if (key == DeleteFolder.KEY) {
            return this.on_delete_folder(message.content);
        }

        if (key == SetAttr.KEY) {
            return this.on_set_attr(message.content);
        }

        if (key == UnsetAttr.KEY) {
            return this.on_unset_attr(message.content);
        }

        if (key == InitializeFolders.KEY) {
            return this.on_init_folders_request(message.content);
        }

        if (key == InitializeMessages.KEY) {
            return this.on_init_messages_request(message.content);
        }

        if (key == GetRules.KEY) {
            return this.on_get_rules(message, meta);
        }

        throw new Error("No rw handler found for object " + key);
    }

    on_get_rules(message) {
        soba.mail.reply(new Rules([
            {
                uuid : "{12345678-abcd-dead-1234455695878}",
                label : "PostgreSQL HACKERS ML",
                conditions : [
                    {}, // etc
                ],
                actions : [
                    {}, // etc.
                ],
                // etc
            },
            // etc
        ]));
    }

    on_set_attr_message(content) {
        if (! content.key) { // https://stackoverflow.com/a/154068
            throw new Error("empty key");
        }

        soba.log.debug(`Processing SetAttrMessage event for` +
                ` folder '${content.folder}'` +
                ` message ${content.message}` +
                ` key '${content.key}'` +
                ` value '${content.value}'`);

        return soba.data.insert("message_attr", {
            folder : content.folder,
            message : content.message,
            key : content.key,
            value : content.value,
            mirror : content.mirror,
        });
    }

    on_unset_attr_message(content) {
        if (! content.key) { // https://stackoverflow.com/a/154068
            throw new Error("empty key");
        }

        soba.log.debug(`Processing UnsetAttrMessage event for folder '${content.folder}' message ${
                content.message}`);

        let parent = soba.data
                             .find("message_attr", {
                                 folder : content.folder,
                                 message : content.message,
                                 key : content.key,
                             })
                             .hash;
        return soba.data.delete("message_attr", parent);
    }

    on_set_attr_folder(content) {
        if (! content.key) {
            throw new Error("empty key");
        }

        soba.log.debug(`Processing SetAttrFolder event for folder '${content.folder}' key '${
                content.key}' value '${content.value}'`);

        if (content.key === "name" && content.value.includes(":")) {
            throw new Error(`Invalid folder name: ${content.value}`);
        }

        if (content.key === "name" && content.value === content.folder) {
            throw new Error(`Heuristic: Probably invalid folder name: ${content.value}`);
        }

        let parent = soba.data.find("folders", {uuid : content.folder}).hash;
        return soba.data.insert("folder_attr", {
            folder : content.folder,
            key : content.key,
            value : content.value,
            mirror : content.mirror
        });
    }

    on_unset_attr_folder(content) {
        if (! content.key) {
            throw new Error("empty key");
        }

        soba.log.debug(`Processing UnsetAttrFolder event for folder '${content.folder}' key ${
                content.key}`);

        let parent =
                soba.data.find("folder_attr", {folder : content.folder, key : content.key}).hash;
        return soba.data.delete("folder_attr", parent);
    }

    on_create_folder(content) {
        soba.log.debug(`Processing CreateFolder event for '${content.name}'`);

        // validate folder name
        const split_col = content.name.split(":");
        if (split_col.length !== 2) {
            throw new Error(`Invalid folder name '${content.name}'`);
        }

        // validate user name part
        const user_name = split_col[0];
        if (! soba.type.userName.isValid(user_name)) {
            throw new Error(`Invalid user name in folder name '${content.name}'`);
        }

        let fuuid_parent = null;

        // validate folder hierarchy part
        const fnames = split_col[1].split("/");
        for (let i = 0, l = fnames.length - 1; i < l; ++i) {
            const fname = fnames[i];

            if (! soba.type.folderName.isValid(fname)) {
                throw new Error(`Invalid folder name fragment '${fname}' in '${content.name}'`);
            }

            const rows = this.get_folders(fname, fuuid_parent).data;
            if (rows.length < 1) {
                soba.log.error(
                        `Folder '${user_name}:${fnames.splice(0, i + 1).join("/")}' not found`);
                throw new NotFoundError({id : fname, type : fname});
            }

            fuuid_parent = rows[0][0];
        }

        // insert folder
        const fuuid = content.uuid;
        const folder = soba.data.insert("folders", {uuid : content.uuid, mirror : 0});

        // set parent
        if (fuuid_parent) {
            // discard return value, just ensure parent folder exists
            soba.data.find("folders", {uuid : fuuid_parent, mirror : 0});
            soba.data.insert("folder_attr",
                    {folder : fuuid, key : "parent", value : fuuid_parent, mirror : 0});
        }
        else {
            soba.data.insert(
                    "folder_attr", {folder : fuuid, key : "parent", value : null, mirror : 0});
        }

        // set name
        soba.data.insert("folder_attr",
                {folder : fuuid, key : "name", value : split_col[1].split("/").at(-1), mirror : 0});

        return folder;
    }

    on_insert_folder(content) {
        soba.log.debug(`Processing InsertFolder event: '${JSON.stringify(content)}'`);
        return soba.data.insert("folders", {uuid : content.uuid, mirror : content.mirror});
    }

    on_delete_folder(content) {
        soba.log.debug(`Processing DeleteFolder event for '${content.uuid}'`);

        /* clang-format off */
        const rows = soba.db.exec(
                  `WITH RECURSIVE children as (`
                + ` SELECT 0 as l,key,folder FROM folder_attr WHERE key='parent' and value=?`
                + ` UNION`
                + ` SELECT c.l+1 as l,fs.key,fs.folder FROM folder_attr fs`
                + ` JOIN children c ON fs.value=c.folder WHERE fs.key=c.key`
                + `)`
                + `SELECT folder FROM children ORDER BY l DESC`, 
            content.uuid)
                .data;
        /* clang-format on */

        soba.log.info(`Delete folders ${JSON.stringify(rows)}`);

        for (let i = 0, l = rows.length; i < l; ++i) {
            const row = rows[i];
            const fuuid = row[0];
            let parent = soba.data.find("folders", {uuid : fuuid}).hash;
            soba.data.delete("folders", parent);
            soba.log.info(`Deleted folder ${fuuid}`);
        }

        let parent = soba.data.find("folders", {uuid : content.uuid}).hash;
        return soba.data.delete("folders", parent);
    }

    on_add_message(content) {
        soba.log.debug(`Processing AddMessage({folder: '${content.folder}', message: '${
                content.message}'})`);
        return soba.data.insert("messages", content);
    }

    on_remove_message(content) {
        soba.log.debug(`Processing RemoveMessage event for folder '${content.folder}' message ${
                content.message}`);
        let parent =
                soba.data.find("messages", {folder : content.folder, message : content.message})
                        .hash;
        return soba.data.delete("messages", parent);
    }

    on_deliver_message(content) {
        soba.log.debug(`Ignoring DeliverMessage event for message ${content.message}`);
    }

    on_delivery_event(content) {
        soba.log.info(`Ignoring DeliveryEvent event: ${JSON.stringify(content)}`);
    }

    on_grant_access(content) {
        soba.log.debug(`Processing GrantAccess event for message '${content.message}' address ${
                content.address}`);
        return soba.data.insert("access", {message : content.message, address : content.address});
    }

    on_revoke_access(content) {
        soba.log.debug(`Processing RevokeAccess event for message '${content.message}' address ${
                content.address}`);
        let parent =
                soba.data.find("access", {message : content.message, address : content.address})
                        .hash;
        return soba.data.delete("access", parent);
    }

    on_set_attr(content) {
        soba.log.debug(
                `Processing SetAttr event for key '${content.key}' value '${content.value}'`);
        return soba.data.insert("attr", {key : content.key, value : content.value});
    }

    on_unset_attr(content) {
        soba.log.debug(`Processing UnsetAttr event for key '${content.key}'`);
        let parent = soba.data.find("state", {key : content.key}).hash;
        return soba.data.delete("state", parent);
    }

    on_init_folders_request(content) {
        soba.task.emit(new InitializeFolders({schema : MailboxManager.schema}));
    }

    on_init_messages_request(content) {
        soba.task.emit(new InitializeMessages({schema : MailboxManager.schema}));
    }
}
