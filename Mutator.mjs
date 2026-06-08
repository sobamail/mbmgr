
import "soba://computer/R2";

import {
    DeleteRow,
    Message,
} from "https://sobamail.com/module/base/v1?sha224=7VxiNiRp9EhKFTmiYDW3d_Cu-1_TVdnQdEWBjw";
import {
    Filter
} from "https://sobamail.com/module/mailboxmanager/filter/v1?sha224=4TP8-wBx8JPUO5edspBpgc4RNWNjvxNpxtdzRw";
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

    AddIdentity,
    AddIdentityAttr,

    AddFilter,
    AddFilterAttr,
    AddFilterCond,
    AddFilterActionFileinto,
    AddFilterActionDelete,
    RemoveFilter,

    GrantAccess,
    RevokeAccess,

    MessageTask,
    DeliverMessage,
    DeliveryEvent,

    UserInfoGet,
    UserInfoPut,

    LimitsGet,
    LimitsPut,

    AddRole,
    RevokeRole,

    QSTR_GET_FOLDERS,
} from "https://sobamail.com/module/mailboxmanager/v1?sha224=8ENSTcPHYyb8YR2AmfV-F69eRDPs-Xrnd4-Jiw";
/* clang-format on */

const NS_BASE = "https://sobamail.com/module/base/v1";
const NS_MBMGR = "https://sobamail.com/module/mailboxmanager/v1";

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
        [ UnsetAttrFolder.KEY, false ],

        [ AddMessage.KEY, false ],
        [ RemoveMessage.KEY, false ],
        [ SetAttrMessage.KEY, false ],
        [ UnsetAttrMessage.KEY, false ],

        [ GrantAccess.KEY, false ],
        [ RevokeAccess.KEY, false ],

        [ DeliverMessage.KEY, false ],
        [ DeliveryEvent.KEY, false ],

        [ AddIdentity.KEY, false ],
        [ AddIdentityAttr.KEY, false ],

        [ AddFilter.KEY, false ],
        [ AddFilterAttr.KEY, false ],
        [ AddFilterCond.KEY, false ],
        [ AddFilterActionFileinto.KEY, false ],
        [ AddFilterActionDelete.KEY, false ],
        [ RemoveFilter.KEY, false ],

        [ AddRole.KEY, false ],
        [ RevokeRole.KEY, false ],

        [ UserInfoGet.KEY, false ],
        [ UserInfoPut.KEY, false ],

        [ LimitsGet.KEY, false ],
        [ LimitsPut.KEY, false ],
    ]);

    static handlers = new Map([
        [ SetAttr.KEY, (content) => (new SetAttr(content)).process() ],
        [ UnsetAttr.KEY, (content) => (new UnsetAttr(content)).process() ],

        [ InsertFolder.KEY, (content) => (new InsertFolder(content)).process() ],
        [ CreateFolder.KEY, (content) => (new CreateFolder(content)).process() ],
        [ DeleteFolder.KEY, (content) => (new DeleteFolder(content)).process() ],
        [ SetAttrFolder.KEY, (content) => (new SetAttrFolder(content)).process() ],
        [ UnsetAttrFolder.KEY, (content) => (new UnsetAttrFolder(content)).process() ],

        [ AddMessage.KEY, (content) => (new AddMessage(content)).process() ],
        [ RemoveMessage.KEY, (content) => (new RemoveMessage(content)).process() ],
        [ SetAttrMessage.KEY, (content) => (new SetAttrMessage(content)).process() ],
        [ UnsetAttrMessage.KEY, (content) => (new UnsetAttrMessage(content)).process() ],

        [ GrantAccess.KEY, (content) => (new GrantAccess(content)).process() ],
        [ RevokeAccess.KEY, (content) => (new RevokeAccess(content)).process() ],

        [ DeliverMessage.KEY, (content) => (new DeliverMessage(content)).process() ],
        [ DeliveryEvent.KEY, (content) => (new DeliveryEvent(content)).process() ],

        [
            InitializeFolders.KEY,
            () => soba.task.emit(new InitializeFolders({schema : MailboxManager.schema}))
        ],
        [
            InitializeMessages.KEY,
            () => soba.task.emit(new InitializeMessages({schema : MailboxManager.schema}))
        ],

        [ AddRole.KEY, (content) => (new AddRole(content)).process() ],
        [ RevokeRole.KEY, (content) => (new RevokeRole(content)).process() ],

        [ AddIdentity.KEY, (content) => (new AddIdentity(content)).process() ],
        [ AddIdentityAttr.KEY, (content) => (new AddIdentityAttr(content)).process() ],

        [ AddFilter.KEY, (content) => (new AddFilter(content)).process() ],
        [ AddFilterAttr.KEY, (content) => (new AddFilterAttr(content)).process() ],
        [ AddFilterCond.KEY, (content) => (new AddFilterCond(content)).process() ],
        [
            AddFilterActionFileinto.KEY,
            (content) => (new AddFilterActionFileinto(content)).process()
        ],
        [ AddFilterActionDelete.KEY, (content) => (new AddFilterActionDelete(content)).process() ],
        [ RemoveFilter.KEY, (content) => (new RemoveFilter(content)).process() ],

        [ UserInfoGet.KEY, (content) => (new UserInfoGet(content)).process() ],
        [ UserInfoPut.KEY, (content) => (new UserInfoPut(content)).process() ],

        [ LimitsGet.KEY, (content) => (new LimitsGet(content)).process() ],
        [ LimitsPut.KEY, (content) => (new LimitsPut(content)).process() ],
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
                        {op : "lww", value : true},
                        {op : "regexp", value : "[a-z0-9_]+"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
            ],
        });

        /*
         * Roles
         */
        soba.schema.table({
            name : "roles",
            insertEvent : AddRole,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "name",
                    checks : [
                        {op : "!=", value : ""},
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    name : "domain",
                    checks : [
                        {op : "regexp", value : soba.type.domainName.pattern},
                    ],
                },
                {
                    name : "user",
                    checks : [
                        {op : "regexp", value : soba.type.userName.pattern},
                    ],
                },
            ],
            checks : [
                {
                    columns : [ "name", "domain", "user" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        /*
         * Identities
         */

        soba.schema.table({
            name : "iden",
            insertEvent : AddIdentity,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "address",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "lww", value : true},
                        {op : "regexp", value : soba.type.address.pattern},
                    ],
                },
            ],
        });

        soba.schema.table({
            name : "iden_attr",
            insertEvent : AddIdentityAttr,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "address",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "iden", column : "address"},
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
            ],
            checks : [
                {
                    columns : [ "address", "key" ],
                    op : "lww",
                    value : true,
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

        // Initialize the filtering subsystem
        this.filter = new Filter();
    }

    process(message, meta) {
        // Delivery shortcut
        if (meta.location == "limbo") {
            if (meta.type == "message") {
                // This message has not been delivered yet (it's in limbo). Deliver it first
                this.on_email(message);
                return;
            }

            throw new Error(`Request type '${meta.type}' can not be in limbo`);
        }

        // Local task shortcut
        if (meta.type == "task" || meta.type == "task-replay") {
            // This is a task.
            // A task only has the content, so it's safe to just pass it to the dispatch function
            this.on_structured(message);
            return;
        }

        if (meta.type == "message" && message.bodyObject !== undefined) {
            // This is a structured message.
            // We need to do some digging to get to the content object
            const content = message.bodyObject.content;
            if (content === undefined) {
                soba.log.error(
                        `Discarding SMessage ${message.uuid}: unable to read message content`);
                return; // discards the message
            }

            if (content instanceof ArrayBuffer) { // The data content could not be parsed correctly
                soba.log.error(`Discarding SMessage ${message.uuid}: contents were not recognized`);
                return; // discards the message
            }

            // The message was deserialized successfully, now let's validate the object
            if (! content.namespace) {
                soba.log.error(`Discarding SMessage ${message.uuid}: content ${
                        JSON.stringify(content)} null or empty namespace`);
                return; // discards the message
            }

            if (! content.name) {
                soba.log.error(`Discarding SMessage ${message.uuid}: content ${
                        JSON.stringify(content)} null or empty name`);
                return; // discards the message
            }

            if (content.name == "MessageTask" && content.namespace == NS_MBMGR) {
                soba.log.error(`Discarding SMessage ${message.uuid}:` +
                        ` A MessageTask is not supposed to reach this point`);
                return; // discards the message
            }

            // If it was a signed and/or encrypted message, it will be wrapped
            // in an Envelope object, so let's dig further if that's the case.
            if (content.name == "Envelope" && content.namespace == NS_BASE) {
                let envelope = content.content;
                if (envelope === undefined) {
                    soba.log.error(`Discarding SMessage ${message.uuid}: Envelope is empty`);
                    return; // discards the message
                }

                // Envelope payload is our actual content, so replace it
                content = envelope.content;

                if (! content.namespace) {
                    soba.log.error(`Discarding SMessage ${message.uuid}: content ${
                            JSON.stringify(content)} null or empty object namespace`);
                    return; // discards the message
                }

                if (! content.name) {
                    soba.log.error(`Discarding SMessage ${message.uuid}: content ${
                            JSON.stringify(content)} null or empty object name`);
                    return; // discards the message
                }

                if (content.name == "MessageTask" && content.namespace == NS_MBMGR) {
                    soba.log.error(`Discarding SMessage ${message.uuid}:` +
                            ` A MessageTask is not supposed to be enveloped`);
                    return; // discards the message
                }
            }

            // Finally we have the content, let's process it
            this.on_structured(content);

            return;
        }

        // we have no idea what this is, so deliver it
        this.on_email(message);
    }

    on_email(message) {
        const folders = this.filter.evaluate_filters(message);

        for (const fname of folders) {
            const rows = soba.db.exec(QSTR_GET_FOLDERS, fname, null).data;
            if (rows.length < 1) {
                soba.log.warning(`on_email: target folder '${fname}' not found, skipping`);
                continue;
            }
            for (const row of rows) {
                soba.data.insert("messages", {folder : row[0], message : message.uuid, mirror : 0});
            }
        }
    }

    on_structured(message) {
        if (! message.namespace) {
            throw new Error(`Message has no namespace: ${JSON.stringify(message)}`);
        }

        if (! message.name) {
            throw new Error(`Message has no name: ${JSON.stringify(message)}`);
        }

        const key = `{${message.namespace}}${message.name}`;
        const handler = MailboxManager.handlers.get(key);
        if (! handler) {
            throw new Error(`No handler found for object '${key}'`);
        }

        return handler(message.content);
    }
}
