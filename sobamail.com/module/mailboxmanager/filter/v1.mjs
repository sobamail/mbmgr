
export const namespace = "https://sobamail.com/module/mailboxmanager/filter/v1";

import "soba://computer/R2";

import {
    DeleteRow,
} from "https://sobamail.com/module/base/v1?sha224=7VxiNiRp9EhKFTmiYDW3d_Cu-1_TVdnQdEWBjw";

import {
    AddFilter,
    AddFilterAttr,
    AddFilterCond,
    AddFilterActionFileinto,
    AddFilterActionDelete,
} from "https://sobamail.com/module/mailboxmanager/v1?sha224=8ENSTcPHYyb8YR2AmfV-F69eRDPs-Xrnd4-Jiw";

export class Filter {
    constructor() {
        soba.schema.table({
            name : "filters",
            insertEvent : AddFilter,
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
            ],
        });

        soba.schema.table({
            name : "filter_attr",
            insertEvent : AddFilterAttr,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "filter",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "filters", column : "uuid"},
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
                    columns : [ "filter", "key" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        soba.schema.table({
            name : "filter_cond",
            insertEvent : AddFilterCond,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "filter",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "filters", column : "uuid"},
                    ],
                },
                {
                    name : "field",
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
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
            ],
            checks : [
                {
                    columns : [ "filter", "field" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        soba.schema.table({
            name : "filter_action_fileinto",
            insertEvent : AddFilterActionFileinto,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "filter",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "filters", column : "uuid"},
                    ],
                },
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
            ],
            checks : [
                {
                    columns : [ "filter", "folder" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        soba.schema.table({
            name : "filter_action_delete",
            insertEvent : AddFilterActionDelete,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "filter",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "filters", column : "uuid"},
                        {op : "lww", value : true},
                    ],
                },
            ],
        });
    }

    evaluate_filters(message) {
        const ret = soba.db.exec(`SELECT f.uuid FROM filters f` +
                ` JOIN filter_attr fa ON fa.filter=f.uuid` +
                ` WHERE fa.key='enabled' AND fa.value=1`);

        if (ret.code !== 0 || ret.data.length === 0) {
            return [ "inbox" ];
        }

        let matchedFolders = [];

        for (const filterRow of ret.data) {
            const filterUuid = filterRow[0];

            const condRet = soba.db.exec(
                    `SELECT field, op, value FROM filter_cond WHERE filter=?`, filterUuid);
            if (condRet.code !== 0)
                continue;

            let allMatch = true;
            for (const cond of condRet.data) {
                if (! this.eval_condition(message, cond[0], cond[1], cond[2])) {
                    allMatch = false;
                    break;
                }
            }
            if (! allMatch)
                continue;

            const fileintoRet = soba.db.exec(
                    `SELECT folder FROM filter_action_fileinto WHERE filter=?`, filterUuid);
            if (fileintoRet.code === 0) {
                for (const row of fileintoRet.data) {
                    matchedFolders.push(row[0]);
                }
            }

            const deleteRet = soba.db.exec(
                    `SELECT filter FROM filter_action_delete WHERE filter=?`, filterUuid);
            if (deleteRet.code === 0 && deleteRet.data.length > 0) {
                return []; // silently discard
            }
        }

        return matchedFolders.length > 0 ? matchedFolders : [ "inbox" ];
    }

    eval_condition(message, field, op, value) {
        const f = field.toLowerCase();

        if (f === "from") {
            return this.eval_op(message.fromAddress, op, value);
        }

        if (f === "subject") {
            return this.eval_op(message.subject, op, value);
        }

        if (f === "to") {
            const to = message.to;
            if (! to)
                return false;
            return to.some(ea => this.eval_op(ea.address, op, value));
        }

        if (f === "cc") {
            const cc = message.cc;
            if (! cc)
                return false;
            return cc.some(ea => this.eval_op(ea.address, op, value));
        }

        return message.getHeaderStringValueArray(field).some(v => this.eval_op(v, op, value));
    }

    eval_op(headerValue, op, value) {
        if (headerValue === null || headerValue === undefined)
            return false;

        const h = headerValue.toLowerCase();
        const v = (value ?? "").toLowerCase();

        switch (op) {
        case "is":
            return h === v;
        case "not-is":
            return h !== v;
        case "contains":
            return h.includes(v);
        case "not-contains":
            return ! h.includes(v);
        case "matches":
            return new RegExp(value, "i").test(headerValue);
        default:
            return false;
        }
    }
}
